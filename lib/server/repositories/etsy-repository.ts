import "server-only";
import { randomUUID } from "node:crypto";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { RepositoryNotFoundError, assertTrustedWorkspaceContext } from "./repository-context";

export type EtsySyncRequestType =
  | "INITIAL_FULL"
  | "INCREMENTAL"
  | "LISTINGS_ONLY"
  | "ORDERS_ONLY"
  | "PAYMENTS_ONLY"
  | "LEDGER_ONLY"
  | "WEBHOOK_FOLLOWUP"
  | "TOKEN_REFRESH";

export async function createWorkspaceOAuthState(
  context: WorkspaceContext,
  input: {
    stateHash: string;
    encryptedVerifier: string;
    redirectUri: string;
    redirectPath: string;
    requestedScopes: string;
    intendedShopId?: string | null;
    expiresAt: Date;
  },
) {
  await assertTrustedWorkspaceContext(context);
  if (input.intendedShopId) {
    const shop = await prisma.shop.findFirst({
      where: { id: input.intendedShopId, workspaceId: context.workspaceId, platform: "ETSY" },
      select: { id: true },
    });
    if (!shop) throw new RepositoryNotFoundError();
  }
  return prisma.etsyOAuthState.create({
    data: {
      workspaceId: context.workspaceId,
      userId: context.userId,
      shopId: input.intendedShopId,
      stateHash: input.stateHash,
      verifier: input.encryptedVerifier,
      redirectUri: input.redirectUri,
      redirectPath: input.redirectPath,
      requestedScopes: input.requestedScopes,
      intent: input.intendedShopId ? "RECONNECT" : "CONNECT",
      expiresAt: input.expiresAt,
    },
  });
}

export async function consumeWorkspaceOAuthState(
  stateHash: string,
  now: Date,
  currentUserId?: string | null,
) {
  return prisma.$transaction(async (transaction) => {
    const state = await transaction.etsyOAuthState.findUnique({
      where: { stateHash },
      include: { shop: { select: { externalShopId: true } } },
    });
    if (
      !state ||
      !state.userId ||
      !state.workspaceId ||
      state.consumedAt ||
      state.expiresAt <= now ||
      (currentUserId && currentUserId !== state.userId)
    ) throw new RepositoryNotFoundError();

    const membership = await transaction.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: state.workspaceId, userId: state.userId } },
      include: { workspace: { select: { status: true } } },
    });
    if (!membership || membership.workspace.status !== "ACTIVE") throw new RepositoryNotFoundError();

    if (state.shopId) {
      const intendedShop = await transaction.shop.findFirst({
        where: { id: state.shopId, workspaceId: state.workspaceId, platform: "ETSY" },
        select: { id: true },
      });
      if (!intendedShop) throw new RepositoryNotFoundError();
    }

    const claim = await transaction.etsyOAuthState.updateMany({
      where: { id: state.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (claim.count !== 1) throw new RepositoryNotFoundError();
    return state;
  });
}

export async function persistWorkspaceEtsyConnection(input: {
  workspaceId: string;
  intendedShopId?: string | null;
  externalShopId: string;
  etsyUserId: string;
  shopName: string;
  shopTitle?: string | null;
  shopCurrency?: string | null;
  shopUrl?: string | null;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: Date;
  scopes: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const existingOwner = await transaction.etsyConnection.findUnique({
      where: { shopId: input.externalShopId },
      select: { id: true, workspaceId: true, saasShopId: true },
    });
    if (existingOwner?.workspaceId && existingOwner.workspaceId !== input.workspaceId) {
      throw new RepositoryNotFoundError();
    }
    const externalShopOwner = await transaction.shop.findUnique({
      where: { platform_externalShopId: { platform: "ETSY", externalShopId: input.externalShopId } },
    });
    if (externalShopOwner && externalShopOwner.workspaceId !== input.workspaceId) {
      throw new RepositoryNotFoundError();
    }

    let shop = input.intendedShopId
      ? await transaction.shop.findFirst({
          where: { id: input.intendedShopId, workspaceId: input.workspaceId, platform: "ETSY" },
        })
      : null;
    if (input.intendedShopId && !shop) throw new RepositoryNotFoundError();
    if (shop?.externalShopId && shop.externalShopId !== input.externalShopId) {
      throw new RepositoryNotFoundError();
    }
    if (shop && externalShopOwner && shop.id !== externalShopOwner.id) {
      throw new RepositoryNotFoundError();
    }
    shop ??= externalShopOwner;
    shop ??= await transaction.shop.create({
      data: {
        workspaceId: input.workspaceId,
        platform: "ETSY",
        externalShopId: input.externalShopId,
        name: input.shopName,
        status: "ACTIVE",
        defaultCurrency: input.shopCurrency,
      },
    });

    shop = await transaction.shop.update({
      where: { id: shop.id },
      data: {
        externalShopId: input.externalShopId,
        name: input.shopName,
        status: "ACTIVE",
        defaultCurrency: input.shopCurrency,
      },
    });

    const data = {
      workspaceId: input.workspaceId,
      saasShopId: shop.id,
      etsyUserId: input.etsyUserId,
      shopName: input.shopName,
      shopTitle: input.shopTitle,
      shopCurrency: input.shopCurrency,
      shopUrl: input.shopUrl,
      encryptedAccessToken: input.encryptedAccessToken,
      encryptedRefreshToken: input.encryptedRefreshToken,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      scopes: input.scopes,
      status: "ACTIVE" as const,
      disconnectedAt: null,
      connectedAt: new Date(),
      refreshFailureCode: null,
      refreshLeaseId: null,
      refreshLeaseUntil: null,
    };
    const connection = existingOwner
      ? await transaction.etsyConnection.update({
          where: { id: existingOwner.id },
          data: { ...data, tokenVersion: { increment: 1 } },
        })
      : await transaction.etsyConnection.create({
          data: { ...data, shopId: input.externalShopId },
        });
    return { connection, shop };
  });
}

export async function listWorkspaceEtsyConnections(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.etsyConnection.findMany({
    where: { workspaceId: context.workspaceId, saasShop: { workspaceId: context.workspaceId } },
    include: {
      saasShop: true,
      syncRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { errors: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
    orderBy: { connectedAt: "asc" },
  });
}

export async function findWorkspaceEtsyConnection(context: WorkspaceContext, shopId: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.etsyConnection.findFirst({
    where: { workspaceId: context.workspaceId, saasShopId: shopId, saasShop: { workspaceId: context.workspaceId, platform: "ETSY" } },
    include: { saasShop: true },
  });
}

export async function disconnectWorkspaceEtsyConnection(context: WorkspaceContext, shopId: string) {
  await assertTrustedWorkspaceContext(context);
  if (context.role !== "OWNER") throw new RepositoryNotFoundError();
  const result = await prisma.etsyConnection.updateMany({
    where: { workspaceId: context.workspaceId, saasShopId: shopId },
    data: {
      status: "DISCONNECTED",
      disconnectedAt: new Date(),
      refreshLeaseId: null,
      refreshLeaseUntil: null,
    },
  });
  if (result.count !== 1) throw new RepositoryNotFoundError();
}

export async function createWorkspaceSyncRun(
  context: WorkspaceContext,
  shopId: string,
  syncType: EtsySyncRequestType,
  options: { suppressForMs?: number } = {},
) {
  await assertTrustedWorkspaceContext(context);
  const connection = await findWorkspaceEtsyConnection(context, shopId);
  if (!connection || connection.status !== "ACTIVE") throw new RepositoryNotFoundError();
  const suppressForMs = options.suppressForMs ?? 0;
  if (suppressForMs) {
    const existing = await prisma.etsySyncRun.findFirst({
      where: {
        workspaceId: context.workspaceId,
        shopId,
        status: { in: ["QUEUED", "RUNNING"] },
        createdAt: { gte: new Date(Date.now() - suppressForMs) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { run: existing, duplicate: true };
  }
  const id = randomUUID();
  const run = await prisma.etsySyncRun.create({
    data: {
      id,
      workspaceId: context.workspaceId,
      shopId,
      connectionId: connection.id,
      syncType,
      status: "QUEUED",
      jobKey: `etsy:${syncType.toLowerCase()}:${shopId}:${id}`,
    },
  });
  return { run, duplicate: false };
}

export async function findBackgroundSyncRun(runId: string, shopId: string) {
  return prisma.etsySyncRun.findFirst({
    where: {
      id: runId,
      shopId,
      workspaceId: { not: null },
      connection: { saasShopId: shopId },
      shop: { id: shopId, platform: "ETSY", status: "ACTIVE" },
    },
    include: { connection: true, shop: true },
  });
}

export async function acceptEtsyWebhook(input: {
  webhookId: string;
  eventType: string;
  externalShopId: string;
  resourceUrl: string;
  payloadHash: string;
  webhookTimestamp: Date;
}) {
  return prisma.$transaction(async (transaction) => {
    const shops = await transaction.shop.findMany({
      where: { platform: "ETSY", externalShopId: input.externalShopId, etsyConnection: { status: "ACTIVE" } },
      select: { id: true, workspaceId: true },
      take: 2,
    });
    if (shops.length !== 1) throw new RepositoryNotFoundError();
    const existing = await transaction.etsyWebhookEvent.findUnique({ where: { webhookId: input.webhookId } });
    if (existing) return { event: existing, duplicate: true };
    const event = await transaction.etsyWebhookEvent.create({
      data: {
        workspaceId: shops[0].workspaceId,
        saasShopId: shops[0].id,
        webhookId: input.webhookId,
        eventType: input.eventType,
        shopId: input.externalShopId,
        resourceUrl: input.resourceUrl,
        payloadHash: input.payloadHash,
        webhookTimestamp: input.webhookTimestamp,
        status: "VERIFIED",
      },
    });
    return { event, duplicate: false };
  });
}

export async function markWebhookQueued(id: string) {
  await prisma.etsyWebhookEvent.update({ where: { id }, data: { status: "QUEUED" } });
}

export async function markSyncDispatchUnavailable(runId: string) {
  return prisma.etsySyncRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode: "BACKGROUND_NOT_CONFIGURED",
      sanitizedErrorMessage: "Background synchronization is not configured yet.",
    },
  });
}

export async function markBackgroundSyncFailure(runId: string, shopId: string) {
  await prisma.etsySyncRun.updateMany({
    where: { id: runId, shopId, status: { notIn: ["SUCCEEDED", "CANCELLED"] } },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      lastHeartbeatAt: new Date(),
      errorCode: "BACKGROUND_RETRIES_EXHAUSTED",
      sanitizedErrorMessage: "Etsy synchronization did not complete after bounded retries.",
    },
  });
}

export async function createBackgroundSyncRun(
  shopId: string,
  syncType: EtsySyncRequestType,
  dedupeKey: string,
) {
  const connection = await prisma.etsyConnection.findFirst({
    where: { saasShopId: shopId, status: "ACTIVE", saasShop: { platform: "ETSY", status: "ACTIVE" } },
  });
  if (!connection) throw new RepositoryNotFoundError();
  const existing = await prisma.etsySyncRun.findUnique({ where: { jobKey: dedupeKey } });
  if (existing) return { run: existing, duplicate: true };
  const run = await prisma.etsySyncRun.create({
    data: {
      id: randomUUID(),
      workspaceId: connection.workspaceId,
      shopId,
      connectionId: connection.id,
      syncType,
      status: "QUEUED",
      jobKey: dedupeKey,
    },
  });
  return { run, duplicate: false };
}

export async function listSchedulableEtsyShopIds() {
  const connections = await prisma.etsyConnection.findMany({
    where: { status: "ACTIVE", saasShop: { platform: "ETSY", status: "ACTIVE" } },
    select: { saasShopId: true },
  });
  return connections.map((connection) => connection.saasShopId);
}

export async function findEtsyConnectionForToken(connectionId: string) {
  return prisma.etsyConnection.findFirst({
    where: {
      id: connectionId,
      saasShop: { platform: "ETSY", status: "ACTIVE" },
    },
  });
}

export async function acquireTokenRefreshLease(
  connectionId: string,
  expectedTokenVersion: number,
  now = new Date(),
) {
  const leaseId = randomUUID();
  const acquired = await prisma.etsyConnection.updateMany({
    where: {
      id: connectionId,
      tokenVersion: expectedTokenVersion,
      status: "ACTIVE",
      OR: [{ refreshLeaseUntil: null }, { refreshLeaseUntil: { lte: now } }],
    },
    data: { refreshLeaseId: leaseId, refreshLeaseUntil: new Date(now.getTime() + 60_000) },
  });
  return acquired.count === 1 ? leaseId : null;
}

export async function commitTokenRefresh(input: {
  connectionId: string;
  leaseId: string;
  expectedTokenVersion: number;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: Date;
}) {
  const updated = await prisma.etsyConnection.updateMany({
    where: {
      id: input.connectionId,
      refreshLeaseId: input.leaseId,
      tokenVersion: input.expectedTokenVersion,
      status: "ACTIVE",
    },
    data: {
      encryptedAccessToken: input.encryptedAccessToken,
      encryptedRefreshToken: input.encryptedRefreshToken,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      lastRefreshedAt: new Date(),
      tokenVersion: { increment: 1 },
      refreshLeaseId: null,
      refreshLeaseUntil: null,
      refreshFailureCode: null,
    },
  });
  return updated.count === 1;
}

export async function failTokenRefresh(
  connectionId: string,
  leaseId: string,
  state: "REAUTH_REQUIRED" | "TOKEN_EXPIRED" | "ERROR",
  code: string,
) {
  await prisma.etsyConnection.updateMany({
    where: { id: connectionId, refreshLeaseId: leaseId },
    data: {
      status: state,
      refreshFailureCode: code.slice(0, 80),
      refreshLeaseId: null,
      refreshLeaseUntil: null,
    },
  });
}

export async function setEtsyConnectionState(
  connectionId: string,
  state: "ACTIVE" | "TOKEN_EXPIRED" | "REAUTH_REQUIRED" | "SCOPE_VIOLATION" | "DISCONNECTED" | "ERROR",
) {
  await prisma.etsyConnection.update({ where: { id: connectionId }, data: { status: state } });
}

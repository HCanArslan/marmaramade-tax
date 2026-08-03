import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/server/db/client";
import {
  acceptEtsyWebhook,
  acquireTokenRefreshLease,
  commitTokenRefresh,
  consumeWorkspaceOAuthState,
  createWorkspaceOAuthState,
  createWorkspaceSyncRun,
  disconnectWorkspaceEtsyConnection,
  listWorkspaceEtsyConnections,
  persistWorkspaceEtsyConnection,
} from "@/lib/server/repositories/etsy-repository";
import { RepositoryNotFoundError } from "@/lib/server/repositories/repository-context";

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const future = new Date(Date.now() + 10 * 60_000);
let contextA: { userId: string; workspaceId: string; role: "OWNER" };
let memberA: { userId: string; workspaceId: string; role: "MEMBER" };
let contextB: { userId: string; workspaceId: string; role: "OWNER" };
let shopA: { id: string };
let connectionA: { id: string; tokenVersion: number };

beforeAll(async () => {
  const [ownerA, userA, ownerB] = await Promise.all([
    prisma.user.create({ data: { name: "Prompt 4 A", email: `p4-owner-a-${suffix}@example.test`, emailVerified: true } }),
    prisma.user.create({ data: { name: "Prompt 4 member", email: `p4-member-a-${suffix}@example.test`, emailVerified: true } }),
    prisma.user.create({ data: { name: "Prompt 4 B", email: `p4-owner-b-${suffix}@example.test`, emailVerified: true } }),
  ]);
  const [workspaceA, workspaceB] = await Promise.all([
    prisma.workspace.create({ data: { name: `Prompt4 A ${suffix}`, slug: `prompt4-a-${suffix}` } }),
    prisma.workspace.create({ data: { name: `Prompt4 B ${suffix}`, slug: `prompt4-b-${suffix}` } }),
  ]);
  await prisma.membership.createMany({ data: [
    { userId: ownerA.id, workspaceId: workspaceA.id, role: "OWNER" },
    { userId: userA.id, workspaceId: workspaceA.id, role: "MEMBER" },
    { userId: ownerB.id, workspaceId: workspaceB.id, role: "OWNER" },
  ] });
  contextA = { userId: ownerA.id, workspaceId: workspaceA.id, role: "OWNER" };
  memberA = { userId: userA.id, workspaceId: workspaceA.id, role: "MEMBER" };
  contextB = { userId: ownerB.id, workspaceId: workspaceB.id, role: "OWNER" };
  const persisted = await persistWorkspaceEtsyConnection({
    workspaceId: workspaceA.id,
    externalShopId: `external-${suffix}`,
    etsyUserId: `etsy-user-${suffix}`,
    shopName: "Prompt 4 Etsy",
    encryptedAccessToken: "v1.test.access",
    encryptedRefreshToken: "v1.test.refresh",
    accessTokenExpiresAt: new Date("2030-01-01"),
    scopes: "shops_r listings_r transactions_r",
  });
  shopA = persisted.shop;
  connectionA = persisted.connection;
});

describe("Prompt 4 database-backed OAuth and tenancy", () => {
  it("atomically consumes user/workspace state once", async () => {
    const stateHash = `state-once-${suffix}`;
    await createWorkspaceOAuthState(contextA, { stateHash, encryptedVerifier: "encrypted", redirectUri: "https://example.test/callback", redirectPath: "/app/settings/etsy", requestedScopes: "shops_r listings_r transactions_r", expiresAt: future });
    await expect(consumeWorkspaceOAuthState(stateHash, new Date(), contextA.userId)).resolves.toMatchObject({ userId: contextA.userId, workspaceId: contextA.workspaceId });
    await expect(consumeWorkspaceOAuthState(stateHash, new Date(), contextA.userId)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("rejects expired, mismatched-user, stale-membership, and suspended-workspace state", async () => {
    await createWorkspaceOAuthState(contextA, { stateHash: `expired-${suffix}`, encryptedVerifier: "encrypted", redirectUri: "https://example.test/callback", redirectPath: "/app/settings/etsy", requestedScopes: "shops_r", expiresAt: new Date(0) });
    await expect(consumeWorkspaceOAuthState(`expired-${suffix}`, new Date(), contextA.userId)).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await createWorkspaceOAuthState(contextA, { stateHash: `mismatch-${suffix}`, encryptedVerifier: "encrypted", redirectUri: "https://example.test/callback", redirectPath: "/app/settings/etsy", requestedScopes: "shops_r", expiresAt: future });
    await expect(consumeWorkspaceOAuthState(`mismatch-${suffix}`, new Date(), contextB.userId)).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await createWorkspaceOAuthState(memberA, { stateHash: `stale-${suffix}`, encryptedVerifier: "encrypted", redirectUri: "https://example.test/callback", redirectPath: "/app/settings/etsy", requestedScopes: "shops_r", expiresAt: future });
    await prisma.membership.delete({ where: { workspaceId_userId: { workspaceId: memberA.workspaceId, userId: memberA.userId } } });
    await expect(consumeWorkspaceOAuthState(`stale-${suffix}`, new Date(), memberA.userId)).rejects.toBeInstanceOf(RepositoryNotFoundError);

    await createWorkspaceOAuthState(contextA, { stateHash: `suspended-${suffix}`, encryptedVerifier: "encrypted", redirectUri: "https://example.test/callback", redirectPath: "/app/settings/etsy", requestedScopes: "shops_r", expiresAt: future });
    await prisma.workspace.update({ where: { id: contextA.workspaceId }, data: { status: "SUSPENDED" } });
    await expect(consumeWorkspaceOAuthState(`suspended-${suffix}`, new Date(), contextA.userId)).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await prisma.workspace.update({ where: { id: contextA.workspaceId }, data: { status: "ACTIVE" } });
  });

  it("isolates connection reads and refuses silent cross-workspace shop transfer", async () => {
    expect(await listWorkspaceEtsyConnections(contextA)).toHaveLength(1);
    expect(await listWorkspaceEtsyConnections(contextB)).toHaveLength(0);
    await expect(persistWorkspaceEtsyConnection({ workspaceId: contextB.workspaceId, externalShopId: `external-${suffix}`, etsyUserId: "other", shopName: "Other", encryptedAccessToken: "cipher", encryptedRefreshToken: "cipher", accessTokenExpiresAt: future, scopes: "shops_r" })).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("allows members to queue but only owners to disconnect", async () => {
    await prisma.membership.create({ data: { userId: memberA.userId, workspaceId: memberA.workspaceId, role: "MEMBER" } });
    const first = await createWorkspaceSyncRun(memberA, shopA.id, "INCREMENTAL", { suppressForMs: 300_000 });
    const duplicate = await createWorkspaceSyncRun(memberA, shopA.id, "INCREMENTAL", { suppressForMs: 300_000 });
    expect(first.duplicate).toBe(false);
    expect(duplicate).toMatchObject({ duplicate: true, run: { id: first.run.id } });
    await expect(disconnectWorkspaceEtsyConnection(memberA, shopA.id)).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(disconnectWorkspaceEtsyConnection(contextB, shopA.id)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});

describe("Prompt 4 database-backed refresh and webhook idempotency", () => {
  it("permits only one refresh lease for a token generation", async () => {
    const first = await acquireTokenRefreshLease(connectionA.id, connectionA.tokenVersion);
    const second = await acquireTokenRefreshLease(connectionA.id, connectionA.tokenVersion);
    expect(first).toBeTypeOf("string");
    expect(second).toBeNull();
    expect(await commitTokenRefresh({ connectionId: connectionA.id, leaseId: first!, expectedTokenVersion: connectionA.tokenVersion, encryptedAccessToken: "v1.rotated.access", encryptedRefreshToken: "v1.rotated.refresh", accessTokenExpiresAt: new Date("2031-01-01") })).toBe(true);
    expect(await commitTokenRefresh({ connectionId: connectionA.id, leaseId: first!, expectedTokenVersion: connectionA.tokenVersion, encryptedAccessToken: "v1.stale.access", encryptedRefreshToken: "v1.stale.refresh", accessTokenExpiresAt: new Date("2031-01-01") })).toBe(false);
    await expect(prisma.etsyConnection.findUnique({ where: { id: connectionA.id } })).resolves.toMatchObject({ encryptedAccessToken: "v1.rotated.access", encryptedRefreshToken: "v1.rotated.refresh", tokenVersion: connectionA.tokenVersion + 1 });
  });

  it("routes a webhook to exactly one shop and deduplicates its delivery ID", async () => {
    const input = { webhookId: `webhook-${suffix}`, eventType: "order.paid", externalShopId: `external-${suffix}`, resourceUrl: `https://api.etsy.com/v3/application/shops/external-${suffix}/receipts/1`, payloadHash: "hash", webhookTimestamp: new Date() };
    const first = await acceptEtsyWebhook(input);
    const duplicate = await acceptEtsyWebhook(input);
    expect(first).toMatchObject({ duplicate: false, event: { workspaceId: contextA.workspaceId, saasShopId: shopA.id } });
    expect(duplicate).toMatchObject({ duplicate: true, event: { id: first.event.id } });
    await expect(acceptEtsyWebhook({ ...input, webhookId: `unknown-${suffix}`, externalShopId: "unknown-shop" })).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});

describe("Prompt 4 database-backed import idempotency and progress", () => {
  it("upserts the same shop-scoped listing once across overlapping imports", async () => {
    const externalId = `listing-${suffix}`;
    const base = { workspaceId: contextA.workspaceId, shopId: shopA.id, connectionId: connectionA.id, etsyListingId: externalId, title: "Idempotent listing", state: "active", priceAmount: "10", priceCurrency: "USD", quantity: 1 };
    await prisma.etsyListing.upsert({ where: { shopId_etsyListingId: { shopId: shopA.id, etsyListingId: externalId } }, create: { ...base, sourceHash: "first" }, update: { sourceHash: "first" } });
    await prisma.etsyListing.upsert({ where: { shopId_etsyListingId: { shopId: shopA.id, etsyListingId: externalId } }, create: { ...base, sourceHash: "second" }, update: { sourceHash: "second", lastChangedAt: new Date() } });
    expect(await prisma.etsyListing.count({ where: { shopId: shopA.id, etsyListingId: externalId } })).toBe(1);
    await expect(prisma.etsyListing.findUnique({ where: { shopId_etsyListingId: { shopId: shopA.id, etsyListingId: externalId } } })).resolves.toMatchObject({ sourceHash: "second" });
  });

  it("stores explicit zero separately from an Etsy-omitted unknown", async () => {
    const common = { workspaceId: contextA.workspaceId, shopId: shopA.id, connectionId: connectionA.id, sourceCreatedAt: new Date(), totalAmount: "10", currency: "USD" };
    const [explicit, unknown] = await Promise.all([
      prisma.etsyReceipt.create({ data: { ...common, etsyReceiptId: `zero-${suffix}`, subtotalAmount: "0", shippingAmount: "0", discountAmount: "0", giftWrapAmount: "0", taxAmount: "0", refundAmount: "0", sourceHash: "zero" } }),
      prisma.etsyReceipt.create({ data: { ...common, etsyReceiptId: `unknown-${suffix}`, subtotalAmount: null, shippingAmount: null, discountAmount: null, giftWrapAmount: null, taxAmount: null, refundAmount: null, sourceHash: "unknown" } }),
    ]);
    expect(explicit.subtotalAmount?.toString()).toBe("0");
    expect(unknown.subtotalAmount).toBeNull();
  });

  it("retains resumable partial progress and sanitized status", async () => {
    const created = await createWorkspaceSyncRun(contextA, shopA.id, "LISTINGS_ONLY");
    await prisma.etsySyncRun.update({ where: { id: created.run.id }, data: { status: "PARTIAL", pagesProcessed: 2, recordsRead: 150, cursor: "listings:active:150", checkpoint: { resource: "listings:active", nextOffset: 150 }, errorCode: "ETSY_500", sanitizedErrorMessage: "Etsy synchronization could not complete safely." } });
    await expect(prisma.etsySyncRun.findUnique({ where: { id: created.run.id } })).resolves.toMatchObject({ status: "PARTIAL", pagesProcessed: 2, recordsRead: 150, cursor: "listings:active:150", errorCode: "ETSY_500" });
  });
});

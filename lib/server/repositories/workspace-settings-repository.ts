import "server-only";
import Decimal from "decimal.js";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function findWorkspaceSetting(
  context: WorkspaceContext,
  key: string,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceSetting.findUnique({
    where: { workspaceId_key: { workspaceId: context.workspaceId, key } },
  });
}

export async function setWorkspaceSetting(
  context: WorkspaceContext,
  input: { key: string; value: object | string | number | boolean; valueType: string },
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceSetting.upsert({
    where: { workspaceId_key: { workspaceId: context.workspaceId, key: input.key } },
    update: { value: input.value, valueType: input.valueType },
    create: { ...input, workspaceId: context.workspaceId },
  });
}

export async function findEffectiveBusinessProfileVersion(
  context: WorkspaceContext,
  at: Date,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceBusinessProfileVersion.findFirst({
    where: {
      profile: { workspaceId: context.workspaceId },
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function findEffectiveCostDefaults(
  context: WorkspaceContext,
  at: Date,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceCostDefaultVersion.findFirst({
    where: {
      workspaceId: context.workspaceId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export function resolveProductOrWorkspaceCost(
  productSpecific: Decimal.Value | null | undefined,
  workspaceDefault: Decimal.Value,
) {
  return {
    amount: new Decimal(productSpecific ?? workspaceDefault),
    source: productSpecific == null ? "WORKSPACE_DEFAULT" : "PRODUCT_SPECIFIC",
  } as const;
}

import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function listShops(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.shop.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findShopById(context: WorkspaceContext, id: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.shop.findFirst({
    where: { id, workspaceId: context.workspaceId },
  });
}

export async function findEtsyListingByExternalId(
  context: WorkspaceContext,
  shopId: string,
  etsyListingId: string,
) {
  await assertTrustedWorkspaceContext(context);
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, workspaceId: context.workspaceId, platform: "ETSY" },
    select: { id: true },
  });
  if (!shop) return null;
  return prisma.etsyListing.findFirst({
    where: { shopId, workspaceId: context.workspaceId, etsyListingId },
  });
}

export async function createShop(
  context: WorkspaceContext,
  input: {
    platform: "ETSY" | "AMAZON" | "SHOPIFY" | "EBAY" | "CSV";
    externalShopId?: string | null;
    name: string;
    defaultCurrency?: string | null;
  },
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.shop.create({
    data: { ...input, workspaceId: context.workspaceId },
  });
}

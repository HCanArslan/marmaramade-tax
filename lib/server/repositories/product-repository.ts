import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function listProducts(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.product.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findProductById(context: WorkspaceContext, id: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.product.findFirst({
    where: { id, workspaceId: context.workspaceId },
  });
}

export async function createProduct(
  context: WorkspaceContext,
  input: { sku: string; title: string; description?: string | null },
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.product.create({
    data: { ...input, workspaceId: context.workspaceId },
  });
}

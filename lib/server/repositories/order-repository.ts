import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function listOrders(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.order.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { orderDate: "desc" },
  });
}

export async function findOrderById(context: WorkspaceContext, id: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.order.findFirst({
    where: { id, workspaceId: context.workspaceId },
    include: { items: true, snapshots: { include: { lines: true } } },
  });
}

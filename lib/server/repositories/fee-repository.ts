import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function findFeeProfileById(
  context: WorkspaceContext,
  id: string,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.feeProfile.findFirst({
    where: { id, workspaceId: context.workspaceId },
    include: { rules: true },
  });
}

export async function findEffectiveFeeProfiles(
  context: WorkspaceContext,
  at: Date,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.feeProfile.findMany({
    where: {
      workspaceId: context.workspaceId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    },
    include: { rules: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

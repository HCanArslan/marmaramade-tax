import "server-only";
import { prisma } from "@/lib/server/db/client";

export async function listUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function findWorkspaceMembership(userId: string, workspaceId: string) {
  return prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
}

export async function findUserPreference(userId: string) {
  return prisma.userPreference.findUnique({ where: { userId } });
}

export async function selectActiveWorkspace(userId: string, workspaceId: string) {
  return prisma.$transaction(async (transaction) => {
    const membership = await transaction.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
    if (!membership || membership.workspace.status !== "ACTIVE") return null;
    await transaction.userPreference.upsert({
      where: { userId },
      update: { activeWorkspaceId: workspaceId },
      create: { userId, activeWorkspaceId: workspaceId },
    });
    return membership;
  });
}

export async function createOwnedWorkspace(input: {
  userId: string;
  name: string;
  slug: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const workspace = await transaction.workspace.create({
      data: { name: input.name, slug: input.slug, status: "ACTIVE" },
    });
    const membership = await transaction.membership.create({
      data: {
        userId: input.userId,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });
    await transaction.userPreference.upsert({
      where: { userId: input.userId },
      update: { activeWorkspaceId: workspace.id },
      create: { userId: input.userId, activeWorkspaceId: workspace.id },
    });
    return { workspace, membership };
  });
}

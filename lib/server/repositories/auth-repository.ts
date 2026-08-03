import "server-only";
import { prisma } from "@/lib/server/db/client";

export async function findAuthUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function findAuthUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function recordAuthSecurityEvent(input: {
  eventType: string;
  success: boolean;
  userId?: string;
  emailHash?: string;
  ipHash?: string;
}) {
  return prisma.authSecurityEvent.create({ data: input });
}

export async function ensureFounderTenant(input: {
  userId: string;
  workspaceName: string;
  workspaceSlug: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id: input.userId },
      data: { systemRole: "FOUNDER", emailVerified: true },
    });
    const workspace = await transaction.workspace.upsert({
      where: { slug: input.workspaceSlug },
      update: { name: input.workspaceName },
      create: {
        name: input.workspaceName,
        slug: input.workspaceSlug,
        status: "ACTIVE",
      },
    });
    await transaction.membership.upsert({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
      },
      update: { role: "OWNER" },
      create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });
    await transaction.userPreference.upsert({
      where: { userId: user.id },
      update: { activeWorkspaceId: workspace.id },
      create: { userId: user.id, activeWorkspaceId: workspace.id },
    });
    await transaction.legacyWorkspaceAssignment.upsert({
      where: { sourceKey: "MARMARAMADE_LEDGER" },
      update: { workspaceId: workspace.id },
      create: {
        sourceKey: "MARMARAMADE_LEDGER",
        workspaceId: workspace.id,
      },
    });
    return { user, workspace };
  });
}

import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";

export class RepositoryNotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor() {
    super("Record not found.");
    this.name = "RepositoryNotFoundError";
  }
}

export async function assertTrustedWorkspaceContext(
  context: WorkspaceContext,
  database = prisma,
) {
  const membership = await database.membership.findFirst({
    where: {
      userId: context.userId,
      workspaceId: context.workspaceId,
      role: context.role,
      workspace: { status: "ACTIVE" },
    },
    select: { id: true },
  });
  if (!membership) throw new RepositoryNotFoundError();
}

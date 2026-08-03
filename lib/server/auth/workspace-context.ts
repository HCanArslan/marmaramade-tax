import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/server/auth/config";
import { findAuthUserById } from "@/lib/server/repositories/auth-repository";
import {
  findUserPreference,
  findWorkspaceMembership,
  listUserMemberships,
  selectActiveWorkspace,
} from "@/lib/server/repositories/workspace-repository";

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  role: "OWNER" | "MEMBER";
};

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class WorkspaceAuthorizationError extends Error {
  constructor(
    readonly code:
      | "WORKSPACE_REQUIRED"
      | "WORKSPACE_SELECTION_REQUIRED"
      | "WORKSPACE_UNAVAILABLE",
  ) {
    super("Workspace access is unavailable.");
    this.name = "WorkspaceAuthorizationError";
  }
}

export class FounderAuthorizationError extends Error {
  readonly code = "FOUNDER_ACCESS_REQUIRED";
  constructor() {
    super("Not authorized.");
    this.name = "FounderAuthorizationError";
  }
}

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser(options?: { redirectTo?: string; api?: boolean }) {
  const user = await getAuthenticatedUser();
  if (user) return user;
  if (options?.api) throw new AuthenticationRequiredError();
  const callback = encodeURIComponent(options?.redirectTo ?? "/app");
  redirect(`/login?callbackUrl=${callback}`);
}

export async function resolveWorkspaceContextForUser(
  userId: string,
  requestedWorkspaceId?: string,
): Promise<WorkspaceContext> {
  if (requestedWorkspaceId) {
    const membership = await findWorkspaceMembership(userId, requestedWorkspaceId);
    if (!membership || membership.workspace.status !== "ACTIVE") {
      throw new WorkspaceAuthorizationError("WORKSPACE_UNAVAILABLE");
    }
    return {
      userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };
  }

  const [preference, memberships] = await Promise.all([
    findUserPreference(userId),
    listUserMemberships(userId),
  ]);
  if (preference?.activeWorkspaceId) {
    const active = memberships.find(
      (membership) => membership.workspaceId === preference.activeWorkspaceId,
    );
    if (active?.workspace.status === "ACTIVE") {
      return { userId, workspaceId: active.workspaceId, role: active.role };
    }
    throw new WorkspaceAuthorizationError("WORKSPACE_UNAVAILABLE");
  }

  const activeMemberships = memberships.filter(
    (membership) => membership.workspace.status === "ACTIVE",
  );
  if (activeMemberships.length === 0) {
    throw new WorkspaceAuthorizationError("WORKSPACE_REQUIRED");
  }
  if (activeMemberships.length > 1) {
    throw new WorkspaceAuthorizationError("WORKSPACE_SELECTION_REQUIRED");
  }
  const selected = await selectActiveWorkspace(
    userId,
    activeMemberships[0].workspaceId,
  );
  if (!selected) throw new WorkspaceAuthorizationError("WORKSPACE_UNAVAILABLE");
  return { userId, workspaceId: selected.workspaceId, role: selected.role };
}

export async function requireWorkspaceContext(requestedWorkspaceId?: string) {
  const user = await requireUser({ redirectTo: "/app" });
  try {
    return await resolveWorkspaceContextForUser(user.id, requestedWorkspaceId);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      if (error.code === "WORKSPACE_REQUIRED") redirect("/workspace/setup");
      if (error.code === "WORKSPACE_SELECTION_REQUIRED") {
        redirect("/workspace/select");
      }
      redirect("/workspace/unavailable");
    }
    throw error;
  }
}

export async function requireWorkspaceMembership(workspaceId: string) {
  return requireWorkspaceContext(workspaceId);
}

export async function requireWorkspaceRole(
  workspaceId: string,
  roles: readonly WorkspaceContext["role"][],
) {
  const context = await requireWorkspaceMembership(workspaceId);
  if (!roles.includes(context.role)) {
    throw new WorkspaceAuthorizationError("WORKSPACE_UNAVAILABLE");
  }
  return context;
}

export async function requireFounder(options?: { redirectTo?: string; api?: boolean }) {
  const sessionUser = await requireUser(options);
  try {
    await authorizeFounderUser(sessionUser.id);
  } catch (error) {
    if (error instanceof FounderAuthorizationError && !options?.api) {
      redirect("/app");
    }
    throw error;
  }
  return sessionUser;
}

export async function authorizeFounderUser(userId: string) {
  const user = await findAuthUserById(userId);
  if (user?.systemRole === "FOUNDER") return;
  throw new FounderAuthorizationError();
}

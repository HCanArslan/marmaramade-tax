import "server-only";
import {
  FounderAuthorizationError,
  getAuthenticatedUser,
  requireFounder,
} from "@/lib/server/auth/workspace-context";
import { findAuthUserById } from "@/lib/server/repositories/auth-repository";

export async function getAdminSession() {
  const sessionUser = await getAuthenticatedUser();
  if (!sessionUser) return null;
  const user = await findAuthUserById(sessionUser.id);
  return user?.systemRole === "FOUNDER" ? { user: sessionUser } : null;
}

export async function requireAdmin(options?: { redirectTo?: string; api?: false }) {
  const user = await requireFounder({ redirectTo: options?.redirectTo });
  return { user };
}

export async function requireAdminApi() {
  try {
    const user = await requireFounder({ api: true });
    return { user };
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      throw new AdminAuthorizationError();
    }
    throw error;
  }
}

export class AdminAuthorizationError extends Error {
  readonly status = 401;
  constructor() { super("Unauthorized"); this.name = "AdminAuthorizationError"; }
}

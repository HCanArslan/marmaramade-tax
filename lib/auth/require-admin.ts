import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" ? session : null;
}

export async function requireAdmin(options?: { redirectTo?: string; api?: false }) {
  const session = await getAdminSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(options?.redirectTo || "/")}`);
  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthorizationError();
  return session;
}

export class AdminAuthorizationError extends Error {
  readonly status = 401;
  constructor() { super("Unauthorized"); this.name = "AdminAuthorizationError"; }
}

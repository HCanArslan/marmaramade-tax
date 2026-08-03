import { NextRequest, NextResponse } from "next/server";
import { completeEtsyOAuth } from "@/lib/etsy/auth";
import { getAuthenticatedUser, resolveWorkspaceContextForUser } from "@/lib/server/auth/workspace-context";
import { queueWorkspaceEtsySync } from "@/lib/etsy/service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code"); const state = request.nextUrl.searchParams.get("state");
    if (!code || !state) return NextResponse.redirect(new URL("/app/settings/etsy?error=invalid_callback", request.url));
    const sessionUser = await getAuthenticatedUser();
    const completed = await completeEtsyOAuth(code, state, sessionUser?.id);
    const context = await resolveWorkspaceContextForUser(completed.userId, completed.shop.workspaceId);
    const queued = await queueWorkspaceEtsySync(context, completed.shop.id, "INITIAL_FULL");
    const target = new URL(completed.redirectPath, request.url);
    target.searchParams.set("connected", "1");
    target.searchParams.set("sync", queued.delivered ? "queued" : "background_unavailable");
    return NextResponse.redirect(target);
  } catch { return NextResponse.redirect(new URL("/app/settings/etsy?error=oauth_failed", request.url)); }
}

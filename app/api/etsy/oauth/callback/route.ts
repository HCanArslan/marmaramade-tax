import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { completeEtsyOAuth } from "@/lib/etsy/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi(); const code = request.nextUrl.searchParams.get("code"); const state = request.nextUrl.searchParams.get("state");
    if (!code || !state) return NextResponse.redirect(new URL("/settings/etsy?error=invalid_callback", request.url));
    await completeEtsyOAuth(code, state); return NextResponse.redirect(new URL("/settings/etsy?connected=1", request.url));
  } catch { return NextResponse.redirect(new URL("/settings/etsy?error=oauth_failed", request.url)); }
}

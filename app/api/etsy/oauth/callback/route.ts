import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { completeEtsyOAuth } from "@/lib/etsy/auth";
import { syncEtsy } from "@/lib/etsy/sync";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi(); const code = request.nextUrl.searchParams.get("code"); const state = request.nextUrl.searchParams.get("state");
    if (!code || !state) return NextResponse.redirect(new URL("/settings/etsy?error=invalid_callback", request.url));
    await completeEtsyOAuth(code, state);
    try {
      await syncEtsy("LISTINGS_ONLY");
      return NextResponse.redirect(new URL("/products?connected=1", request.url));
    } catch {
      return NextResponse.redirect(new URL("/etsy-import?connected=1&sync=failed", request.url));
    }
  } catch { return NextResponse.redirect(new URL("/settings/etsy?error=oauth_failed", request.url)); }
}

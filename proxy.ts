import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "marmaraledge",
  });
  if (!sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!$|pricing(?:/|$)|etsy-kar-hesaplama(?:/|$)|blog(?:/|$)|login(?:/|$)|signup(?:/|$)|forgot-password(?:/|$)|reset-password(?:/|$)|api/auth|api/cron|api/etsy/oauth/callback|api/etsy/webhook|api/health|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};

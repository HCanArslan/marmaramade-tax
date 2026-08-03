import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function isInngestInfrastructurePath(pathname: string) {
  return pathname === "/api/inngest" || pathname.startsWith("/api/inngest/");
}

export function proxy(request: NextRequest) {
  if (isInngestInfrastructurePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

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
    "/((?!$|pricing(?:/|$)|etsy-kar-hesaplama(?:/|$)|blog(?:/|$)|terms(?:/|$)|privacy(?:/|$)|login(?:/|$)|signup(?:/|$)|forgot-password(?:/|$)|reset-password(?:/|$)|api/auth|api/cron|api/etsy/oauth/callback|api/etsy/webhook|api/inngest(?:/|$)|api/health|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};

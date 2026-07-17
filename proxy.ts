import { withAuth } from "next-auth/middleware";

const sessionTokenCookie =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

export default withAuth({
  secret: process.env.AUTH_SECRET,
  cookies: { sessionToken: { name: sessionTokenCookie } },
  pages: { signIn: "/login" },
  callbacks: { authorized: ({ token }) => token?.role === "ADMIN" },
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/cron|api/etsy/oauth/callback|api/etsy/webhook|api/health|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};

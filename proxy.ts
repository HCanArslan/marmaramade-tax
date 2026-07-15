import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: { authorized: ({ token }) => token?.role === "ADMIN" },
});

export const config = {
  matcher: ["/((?!login|api/auth|api/etsy/oauth/callback|api/etsy/webhook|api/health|_next/static|_next/image|favicon.ico).*)"],
};

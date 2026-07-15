import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyAdminLogin } from "@/lib/auth/security";

const maxAgeHours = Number(process.env.AUTH_SESSION_MAX_AGE_HOURS || 8);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: maxAgeHours * 60 * 60, updateAge: 30 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [CredentialsProvider({
    name: "MarmaraMade admin",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials.password) return null;
      const headers = request.headers;
      const decision = await verifyAdminLogin({
        email: credentials.email,
        password: credentials.password,
        ip: headers?.["x-forwarded-for"] || headers?.["x-real-ip"],
        userAgent: headers?.["user-agent"],
      });
      if (!decision.allowed) return null;
      return { id: "marmaramade-admin", email: credentials.email.trim().toLowerCase(), role: "ADMIN" };
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = "ADMIN"; return token; },
    async session({ session, token }) { if (session.user) { session.user.id = token.sub || "marmaramade-admin"; session.user.role = token.role === "ADMIN" ? "ADMIN" : "UNAUTHORIZED"; } return session; },
  },
};

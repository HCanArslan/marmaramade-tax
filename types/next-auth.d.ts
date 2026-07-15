import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User { role: "ADMIN"; }
  interface Session { user: { id: string; email?: string | null; role: "ADMIN" | "UNAUTHORIZED" } }
}
declare module "next-auth/jwt" { interface JWT { role?: "ADMIN" } }

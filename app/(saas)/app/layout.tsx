import { SaasShell } from "@/components/saas/saas-shell";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function ProtectedSaasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin({ redirectTo: "/app" });
  return <SaasShell>{children}</SaasShell>;
}

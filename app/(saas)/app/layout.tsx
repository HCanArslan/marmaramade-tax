import { SaasShell } from "@/components/saas/saas-shell";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";

export default async function ProtectedSaasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWorkspaceContext();
  return <SaasShell>{children}</SaasShell>;
}

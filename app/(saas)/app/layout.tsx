import { SaasShell } from "@/components/saas/saas-shell";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/server/services/onboarding-service";

export default async function ProtectedSaasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireWorkspaceContext();
  if (!(await isOnboardingComplete(context))) redirect("/onboarding");
  return <SaasShell>{children}</SaasShell>;
}

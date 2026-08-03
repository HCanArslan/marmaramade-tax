"use server";

import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { restartOnboarding } from "@/lib/server/services/onboarding-service";

export async function restartOnboardingAction() {
  await restartOnboarding(await requireWorkspaceContext());
  redirect("/onboarding");
}

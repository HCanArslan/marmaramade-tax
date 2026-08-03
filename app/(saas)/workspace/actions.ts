"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth/workspace-context";
import { createOwnedWorkspace, selectActiveWorkspace } from "@/lib/server/repositories/workspace-repository";

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(50),
});

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser({ api: true });
  const input = workspaceSchema.safeParse({ name: formData.get("name"), slug: formData.get("slug") });
  if (!input.success) redirect("/workspace/setup?error=invalid");
  try {
    await createOwnedWorkspace({ userId: user.id, ...input.data });
  } catch {
    redirect("/workspace/setup?error=unavailable");
  }
  redirect("/app");
}

export async function selectWorkspaceAction(formData: FormData) {
  const user = await requireUser({ api: true });
  const workspaceId = z.string().min(1).max(100).safeParse(formData.get("workspaceId"));
  if (!workspaceId.success) redirect("/workspace/unavailable");
  const membership = await selectActiveWorkspace(user.id, workspaceId.data);
  if (!membership) redirect("/workspace/unavailable");
  redirect("/app");
}

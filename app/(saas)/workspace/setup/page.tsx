import { redirect } from "next/navigation";
import { createWorkspaceAction } from "@/app/(saas)/workspace/actions";
import { requireUser } from "@/lib/server/auth/workspace-context";
import { listUserMemberships } from "@/lib/server/repositories/workspace-repository";

export default async function WorkspaceSetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser({ redirectTo: "/workspace/setup" });
  if ((await listUserMemberships(user.id)).length) redirect("/workspace/select");
  const { error } = await searchParams;
  return <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9"><p className="eyebrow">Workspace foundation</p><h1 className="mt-2 text-3xl font-semibold">Create your workspace</h1><p className="mt-2 text-sm text-stone-500">This is the minimal tenant boundary. Full onboarding is intentionally deferred.</p><form action={createWorkspaceAction} className="mt-7 space-y-4"><label className="block"><span className="mb-1 block text-xs font-medium">Workspace name</span><input className="field" name="name" required minLength={2} maxLength={80}/></label><label className="block"><span className="mb-1 block text-xs font-medium">Workspace slug</span><input className="field" name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9]+(?:-[a-z0-9]+)*"/></label>{error && <p role="alert" className="text-sm text-red-700">The workspace could not be created with those details.</p>}<button className="rounded-xl bg-jade px-5 py-3 text-sm font-medium text-white">Create workspace</button></form></section>;
}

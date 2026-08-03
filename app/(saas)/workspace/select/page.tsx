import { redirect } from "next/navigation";
import { selectWorkspaceAction } from "@/app/(saas)/workspace/actions";
import { requireUser } from "@/lib/server/auth/workspace-context";
import { listUserMemberships } from "@/lib/server/repositories/workspace-repository";

export default async function WorkspaceSelectPage() {
  const user = await requireUser({ redirectTo: "/workspace/select" });
  const memberships = (await listUserMemberships(user.id)).filter((item) => item.workspace.status === "ACTIVE");
  if (!memberships.length) redirect("/workspace/setup");
  return <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9"><p className="eyebrow">Active workspace</p><h1 className="mt-2 text-3xl font-semibold">Choose a workspace</h1><div className="mt-7 space-y-3">{memberships.map((membership) => <form action={selectWorkspaceAction} key={membership.id}><input type="hidden" name="workspaceId" value={membership.workspaceId}/><button className="flex w-full items-center justify-between rounded-2xl border border-stone-200 p-4 text-left hover:border-[#447769]"><span><span className="block font-medium">{membership.workspace.name}</span><span className="text-xs text-stone-500">{membership.role}</span></span><span aria-hidden>→</span></button></form>)}</div></section>;
}

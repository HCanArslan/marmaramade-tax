import Link from "next/link";
import { requireUser } from "@/lib/server/auth/workspace-context";
import { LogoutButton } from "@/components/logout-button";

export default async function WorkspaceBoundaryLayout({ children }: { children: React.ReactNode }) {
  await requireUser({ redirectTo: "/workspace/setup" });
  return <main className="min-h-screen bg-[#f7f4ed] px-4 py-8 sm:py-14"><div className="mx-auto max-w-2xl"><header className="mb-7 flex items-center justify-between"><Link href="/" className="text-lg font-semibold text-[#18342e]">MarmaraLedge</Link><LogoutButton/></header>{children}</div></main>;
}

import Link from "next/link";

export default function WorkspaceUnavailablePage() {
  return <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-9"><p className="eyebrow">Workspace unavailable</p><h1 className="mt-2 text-3xl font-semibold">Access could not be confirmed</h1><p className="mt-3 text-sm leading-6 text-stone-600">The workspace may be inactive or your membership may no longer exist. No information about another workspace is disclosed.</p><Link className="mt-6 inline-flex rounded-xl bg-jade px-5 py-3 text-sm font-medium text-white" href="/workspace/select">Choose another workspace</Link></section>;
}

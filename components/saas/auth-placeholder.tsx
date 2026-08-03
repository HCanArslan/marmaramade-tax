import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AuthPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#18342e] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-cream p-7 shadow-2xl sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dbe8b6] text-[#18342e]">
          <ShieldCheck />
        </span>
        <p className="eyebrow mt-7">Authentication route foundation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">{description}</p>
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          This route is intentionally non-functional in Prompt 1. No account,
          token, or email workflow is created.
        </div>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-jade underline">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}

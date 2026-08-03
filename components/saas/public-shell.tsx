import Link from "next/link";
import { BarChart3 } from "lucide-react";

const publicNavigation = [
  ["/pricing", "Pricing"],
  ["/etsy-kar-hesaplama", "Profit calculator"],
  ["/blog", "Blog"],
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4ed] text-stone-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#18342e] text-[#dbe8b6]">
              <BarChart3 size={18} />
            </span>
            MarmaraLedge
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex" aria-label="Public navigation">
            {publicNavigation.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-stone-950">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-stone-600">
              Sign in
            </Link>
            <Link href="/app" className="rounded-xl bg-jade px-3.5 py-2 text-sm font-medium text-white">
              Open app
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-stone-200 px-4 py-8 text-center text-xs text-stone-500">
        MarmaraLedge SaaS shell · Financial outputs remain planning estimates.
      </footer>
    </div>
  );
}

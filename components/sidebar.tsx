"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, Calculator, CircleDollarSign, FileBarChart, Gauge, Import, Landmark, PackageCheck, Scale, Settings, Ship, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  ["/", "Dashboard", Gauge], ["/products", "Products", Boxes], ["/calculator", "Calculator", Calculator], ["/orders", "Orders", PackageCheck],
  ["/shipping", "Shipping", Ship], ["/customs", "Customs", Landmark], ["/fees", "Etsy fees", CircleDollarSign],
  ["/etsy-import", "Etsy import", Import],
  ["/reconciliation", "Reconciliation", Scale],
  ["/business", "Business profiles", WalletCards], ["/reports", "Reports", FileBarChart], ["/settings", "Settings", Settings],
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-b border-stone-200 bg-[#18342e] text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:pb-7 lg:pt-7">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe8b6] text-[#18342e]"><BarChart3 size={20} /></span>
          <span><span className="block text-[17px] font-semibold tracking-tight">MarmaraMade</span><span className="block text-[10px] uppercase tracking-[.21em] text-white/55">Profitability ledger</span></span>
        </Link>
        <span className="pill border-white/15 bg-white/5 text-white/70 lg:mt-5">● Local database</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3" aria-label="Main navigation">
        {links.map(([href, label, Icon]) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white text-[#18342e] shadow-sm" : "text-white/65 hover:bg-white/8 hover:text-white")}><Icon size={17} /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="mx-6 mt-auto hidden border-t border-white/10 pt-5 text-xs leading-5 text-white/45 lg:block lg:absolute lg:bottom-6 lg:left-0 lg:right-0">Türkiye → worldwide<br />USD revenue · TRY costs</div>
    </aside>
  );
}

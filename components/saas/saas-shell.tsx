"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Gauge,
  LineChart,
  PackageSearch,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  defaultSaasLocale,
  saasMessages,
  type SaasLocale,
} from "@/lib/i18n/saas";
import { saasNavigation } from "@/lib/saas/navigation";
import { LogoutButton } from "@/components/logout-button";

const icons: Record<
  (typeof saasNavigation)[number]["key"],
  ComponentType<{ size?: number; className?: string }>
> = {
  dashboard: Gauge,
  products: Boxes,
  orders: ClipboardList,
  profit: BarChart3,
  pricing: BadgeDollarSign,
  scenarios: LineChart,
  reports: PackageSearch,
  settings: Settings,
  billing: CreditCard,
  help: CircleHelp,
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
}

export function SaasShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<SaasLocale>(defaultSaasLocale);
  const messages = saasMessages[locale];

  return (
    <div className="min-h-screen bg-[#f7f4ed] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-stone-200 bg-[#18342e] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/app" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe8b6] text-[#18342e]">
              <BarChart3 size={20} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold tracking-tight">
                {messages.productName}
              </span>
              <span className="block text-[10px] uppercase tracking-[.16em] text-white/55">
                {messages.productTagline}
              </span>
            </span>
          </Link>
          <div className="text-stone-900 lg:hidden">
            <LogoutButton />
          </div>
          <p className="mt-4 hidden text-[11px] text-white/45 lg:block">
            {messages.shell.protectedWorkspace}
          </p>
        </div>

        <nav
          aria-label={messages.navigationLabel}
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto"
        >
          {saasNavigation.map((item) => {
            const Icon = icons[item.key];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-white text-[#18342e] shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white lg:bg-transparent",
                )}
              >
                <Icon size={17} />
                <span>{messages.navigation[item.key]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mb-4 hidden rounded-xl border border-white/10 bg-black/10 p-3 lg:block">
          <p className="text-[11px] text-white/45">
            {messages.shell.phaseNotice}
          </p>
          <div className="mt-3 flex gap-2" aria-label="Language">
            {(["tr", "en"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={locale === value}
                onClick={() => setLocale(value)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium",
                  locale === value
                    ? "bg-[#dbe8b6] text-[#18342e]"
                    : "bg-white/5 text-white/60",
                )}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="mt-3 text-stone-900"><LogoutButton /></div>
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-20 pt-6 sm:px-7 lg:px-10 lg:py-9">
        {children}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  Gauge,
  Import,
  PackageCheck,
  Settings,
  ShieldCheck,
  Ship,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationTr, tr } from "@/lib/i18n/tr";

type NavChild = { href: string; label: string };
type NavGroup = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: NavChild[];
};

const groupIcons = [
  Boxes,
  PackageCheck,
  Import,
  Ship,
  WalletCards,
  ShieldCheck,
  Settings,
] as const;

const groups: NavGroup[] = navigationTr.map((group, index) => ({
  href: group.href,
  label: group.label,
  icon: groupIcons[index],
  children: group.children.map(([href, label]) => ({ href, label })),
}));

function routeIsActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function groupIsActive(pathname: string, group: NavGroup) {
  return (
    routeIsActive(pathname, group.href) ||
    group.children.some((child) => routeIsActive(pathname, child.href))
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <aside className="border-b border-stone-200 bg-[#18342e] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="flex shrink-0 items-center justify-between px-4 py-4 lg:block lg:px-5 lg:pb-3 lg:pt-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe8b6] text-[#18342e]">
            <BarChart3 size={20} />
          </span>
          <span>
            <span className="block text-[17px] font-semibold tracking-tight">
              MarmaraMade
            </span>
            <span className="block text-[10px] uppercase tracking-[.21em] text-white/55">
              {tr.shell.profitabilityLedger}
            </span>
          </span>
        </Link>
        <span className="pill border-white/15 bg-white/5 text-white/70 lg:mt-4">
          ● {tr.shell.localDatabase}
        </span>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden"
        aria-label={tr.shell.mainNavigation}
      >
        <MobileLink href="/" label={tr.shell.dashboard} pathname={pathname} />
        {groups.map((group) => (
          <MobileLink
            href={group.href}
            label={group.label}
            pathname={pathname}
            key={group.label}
          />
        ))}
      </nav>

      <nav
        className="hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 lg:block"
        aria-label={tr.shell.mainNavigation}
      >
        <Link
          href="/"
          className={cn(
            "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            pathname === "/"
              ? "bg-white text-[#18342e] shadow-sm"
              : "text-white/70 hover:bg-white/8 hover:text-white",
          )}
        >
          <Gauge size={17} />
          <span>{tr.shell.dashboard}</span>
        </Link>
        <div className="space-y-1">
          {groups.map((group) => {
            const active = groupIsActive(pathname, group);
            const open = expanded[group.label] ?? active;
            const Icon = group.icon;
            return (
              <section key={group.label}>
                <div
                  className={cn(
                    "flex items-center rounded-xl transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Link
                    href={group.href}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium"
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="truncate">{group.label}</span>
                  </Link>
                  <button
                    type="button"
                    className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
                    aria-label={`${open ? tr.shell.collapse : tr.shell.expand} ${group.label}`}
                    aria-expanded={open}
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [group.label]: !open,
                      }))
                    }
                  >
                    <ChevronDown
                      size={15}
                      className={cn(
                        "transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                </div>
                {open && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {group.children.map((child) => {
                      const childActive = routeIsActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition",
                            childActive
                              ? "bg-white text-[#18342e]"
                              : "text-white/55 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              childActive ? "bg-[#176b5b]" : "bg-white/25",
                            )}
                          />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </nav>

      <div className="mx-4 mb-4 hidden shrink-0 rounded-xl border border-white/10 bg-black/10 p-3 text-[11px] leading-4 text-white/45 lg:block">
        <p className="text-white/70">Hamit Can Arslan · Şahıs işletmesi</p>
        <p>Türkiye → dünya · USD gelir / TRY gider</p>
      </div>
    </aside>
  );
}

function MobileLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = routeIsActive(pathname, href);
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-white text-[#18342e]"
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usesDedicatedShell =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname.startsWith("/etsy-kar-hesaplama") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/app");
  if (usesDedicatedShell) return children;
  return <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]"><Sidebar/><main className="min-w-0 px-4 pb-20 pt-5 sm:px-7 lg:px-10 lg:py-8">{children}</main></div>;
}

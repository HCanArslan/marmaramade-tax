"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const publicPage = usePathname() === "/login";
  if (publicPage) return <main className="min-h-screen">{children}</main>;
  return <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]"><Sidebar/><main className="min-w-0 px-4 pb-20 pt-5 sm:px-7 lg:px-10 lg:py-8">{children}</main></div>;
}

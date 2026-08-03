"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function LogoutButton() {
  const router = useRouter();
  return <button onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><LogOut size={15}/> Sign out</button>;
}

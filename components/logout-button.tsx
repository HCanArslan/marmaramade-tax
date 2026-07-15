"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
export function LogoutButton() { return <button onClick={() => signOut({ callbackUrl: "/login" })} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><LogOut size={15}/> Sign out</button>; }

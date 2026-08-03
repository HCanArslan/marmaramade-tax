"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { safeAuthCallbackPath } from "@/lib/auth/callback-url";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const input = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!input.success) {
      setPending(false);
      setError("The email or password is invalid.");
      return;
    }
    const result = await authClient.signIn.email(input.data);
    setPending(false);
    if (result.error) { setError("The email or password is invalid, or the account requires verification."); return; }
    router.replace(safeAuthCallbackPath(callbackUrl)); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-600">Email</span><input name="email" type="email" autoComplete="username" required maxLength={254} className="field"/></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-600">Password</span><input name="password" type="password" autoComplete="current-password" required maxLength={128} className="field"/></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}<button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? <Loader2 className="animate-spin" size={16}/> : <LockKeyhole size={16}/>}Sign in securely</button></form>;
}

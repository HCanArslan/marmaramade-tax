"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    setPending(false);
    if (!result?.ok) { setError("The email or password is invalid. Please wait and try again if repeated attempts were made."); return; }
    const callback = params.get("callbackUrl");
    router.replace(callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-600">Admin email</span><input name="email" type="email" autoComplete="username" required className="field"/></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-stone-600">Password</span><input name="password" type="password" autoComplete="current-password" required className="field"/></label>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}<button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? <Loader2 className="animate-spin" size={16}/> : <LockKeyhole size={16}/>}Sign in securely</button></form>;
}

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(12).max(128);

function AuthMessage({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-xl border border-stone-200 bg-white p-3 text-xs leading-5 text-stone-700">{children}</p>;
}

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const input = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema }).safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
    if (!input.success) { setPending(false); setMessage("Enter a valid name, email, and password of at least 12 characters."); return; }
    const result = await authClient.signUp.email({ ...input.data, callbackURL: "/login?verified=1" });
    setPending(false);
    setMessage(result.error ? "We could not complete that request. Please check the details and try again." : "If the address can be registered, verification instructions have been prepared.");
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium">Name</span><input className="field" name="name" autoComplete="name" required maxLength={100}/></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Email</span><input className="field" name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="block"><span className="mb-1.5 block text-xs font-medium">Password</span><input className="field" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>{message && <AuthMessage>{message}</AuthMessage>}<button disabled={pending} className="w-full rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? "Creating…" : "Create account"}</button>{googleEnabled && <button type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/app" })} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium">Continue with Google</button>}<p className="text-center text-xs text-stone-500">Already registered? <Link className="underline" href="/login">Sign in</Link></p></form>;
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const email = emailSchema.safeParse(new FormData(event.currentTarget).get("email"));
    if (email.success) await authClient.requestPasswordReset({ email: email.data, redirectTo: "/reset-password" });
    setPending(false); setMessage("If an eligible account exists, password-reset instructions have been prepared.");
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium">Email</span><input className="field" name="email" type="email" autoComplete="email" required maxLength={254}/></label>{message && <AuthMessage>{message}</AuthMessage>}<button disabled={pending} className="w-full rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? "Submitting…" : "Request password reset"}</button><p className="text-center text-xs"><Link className="underline" href="/login">Return to sign in</Link></p></form>;
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const password = passwordSchema.safeParse(new FormData(event.currentTarget).get("password"));
    if (!token || !password.success) { setPending(false); setMessage("This reset link is invalid or the password is too short."); return; }
    const result = await authClient.resetPassword({ token, newPassword: password.data });
    setPending(false);
    if (result.error) { setMessage("This reset link is invalid or expired."); return; }
    router.replace("/login?reset=1"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-medium">New password</span><input className="field" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>{message && <AuthMessage>{message}</AuthMessage>}<button disabled={pending || !token} className="w-full rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? "Updating…" : "Set new password"}</button></form>;
}

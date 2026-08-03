import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/account-forms";
import Link from "next/link";
import { isPublicSignupEnabled } from "@/lib/env";

export default function SignupFoundationPage() {
  if (!isPublicSignupEnabled()) return <AuthCard eyebrow="Limited early access" title="Early access is currently limited." description="Public account creation will open after production email verification and release safeguards are complete."><p className="mt-7 text-sm leading-6 text-stone-600">Existing invited users and the founder can continue to sign in.</p><Link className="mt-5 inline-flex rounded-xl bg-jade px-4 py-3 text-sm font-medium text-white" href="/login">Sign in</Link><p className="mt-5 text-xs text-stone-500">Draft <Link className="underline" href="/terms">Terms</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link></p></AuthCard>;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return <AuthCard eyebrow="Secure account" title="Create your MarmaraLedge account" description="Verify your email before signing in. Workspace setup follows authentication."><SignupForm googleEnabled={googleEnabled}/></AuthCard>;
}

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/account-forms";

export default function SignupFoundationPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return <AuthCard eyebrow="Secure account" title="Create your MarmaraLedge account" description="Verify your email before signing in. Workspace setup follows authentication."><SignupForm googleEnabled={googleEnabled}/></AuthCard>;
}

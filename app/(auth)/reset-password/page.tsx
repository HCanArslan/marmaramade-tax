import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/account-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthCard eyebrow="Account recovery" title="Choose a new password" description="Reset links expire after one hour and cannot be reused."><ResetPasswordForm token={token}/></AuthCard>;
}

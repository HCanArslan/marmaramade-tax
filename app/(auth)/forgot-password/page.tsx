import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/account-forms";

export default function ForgotPasswordFoundationPage() {
  return <AuthCard eyebrow="Account recovery" title="Reset your password" description="The response does not reveal whether an account exists."><ForgotPasswordForm/></AuthCard>;
}

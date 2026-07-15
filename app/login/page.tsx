import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getAdminSession } from "@/lib/auth/require-admin";

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/");
  return <div className="grid min-h-screen place-items-center bg-[#18342e] px-4 py-12"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-cream p-7 shadow-2xl sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dbe8b6] text-[#18342e]"><ShieldCheck/></span><p className="eyebrow mt-7">Private financial workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">MarmaraMade admin</h1><p className="mt-2 text-sm leading-6 text-stone-500">One administrator. No registration, password reset, or public financial access.</p><LoginForm/><p className="mt-6 text-center text-[11px] leading-5 text-stone-400">Failed attempts are rate-limited and security events are retained without passwords.</p></div></div>;
}

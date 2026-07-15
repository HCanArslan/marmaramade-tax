import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function CalculatorPage() {
  await requireAdmin({ redirectTo: "/calculator" });
  return <CalculatorWorkspace />;
}

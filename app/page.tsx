import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleDollarSign,
  Package,
  Ship,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { DashboardChart } from "@/components/dashboard-charts";
import { calculate } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { formatMoney } from "@/lib/domain/money";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function Dashboard() {
  await requireAdmin({ redirectTo: "/" });
  const result = calculate(defaultCalculatorInput);
  const profit = result.totals.estimatedAfterReserveProfit;
  return (
    <div className="mx-auto max-w-[1440px] space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Tuesday · 14 July 2026</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">
            Good evening, MarmaraMade.
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Your handmade business, measured in both currencies.
          </p>
        </div>
        <Link
          href="/calculator"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#115648]"
        >
          Price a bag <ArrowRight size={16} />
        </Link>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Example sale"
          value={formatMoney(150, "USD")}
          note="Native revenue"
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Estimated profit"
          value={formatMoney(profit, "USD")}
          note={`${result.totals.afterReserveMargin.toFixed(1)}% after-reserve margin`}
          icon={<TrendingUp />}
          accent
        />
        <Metric
          label="Shipping + DDP"
          value={formatMoney(
            result.totals.internationalShippingUsd.plus(
              result.totals.customsAndTariffUsd,
            ),
            "USD",
          )}
          note="34.21 shipping · 28.95 import"
          icon={<Ship />}
        />
        <Metric
          label="Product cost"
          value="Not entered"
          note="Add native TRY costs"
          icon={<Package />}
          warning
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Performance</p>
              <h2 className="mt-1 text-xl font-semibold">
                Revenue & estimated profit
              </h2>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-jade">● Revenue</span>
              <span className="text-coral">● Profit</span>
            </div>
          </div>
          <DashboardChart />
          <p className="text-xs text-stone-400">
            Illustrative trend until completed order snapshots are recorded.
          </p>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-stone-100 p-5">
            <p className="eyebrow">Price intelligence</p>
            <h2 className="mt-1 text-xl font-semibold">$150 US · DDP</h2>
          </div>
          <div className="space-y-0 px-5 py-2">
            <Breakdown
              label="Etsy fees + fee VAT"
              value={result.totals.totalEtsyFees.toFixed(2)}
              color="bg-coral"
            />
            <Breakdown
              label="ShipEntegra quote"
              value="34.21"
              color="bg-[#e4a853]"
            />
            <Breakdown
              label="Customs & tariffs"
              value="28.95"
              color="bg-[#9c7bba]"
            />
            <Breakdown
              label="Est. after reserves"
              value={profit.toFixed(2)}
              color="bg-jade"
            />
          </div>
          <Link
            href="/calculator"
            className="m-5 flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm font-medium text-jade"
          >
            Inspect every formula <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-coral" size={18} />
            <h2 className="font-semibold">Assumptions needing attention</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Alert
              title="Product cost is empty"
              body="Enter material, labor and packaging in TRY before relying on the profit result."
            />
            <Alert
              title="Manual exchange rate"
              body="The example uses a 40.00 USD/TRY immutable rate snapshot."
            />
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Quote status</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">US · ShipEntegra Express</p>
              <p className="mt-1 text-xs text-stone-500">
                DDP · 1.68 kg billable
              </p>
            </div>
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">
              DDP
            </span>
          </div>
          <div className="mt-4 border-t pt-4 text-sm">
            <span className="text-stone-500">Customs example</span>
            <strong className="float-right">$28.95</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
  accent,
  warning,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <article className={`card p-5 ${accent ? "bg-[#18342e] text-white" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-xs font-medium ${accent ? "text-white/55" : "text-stone-500"}`}
          >
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p
            className={`mt-1 text-xs ${warning ? "text-amber-700" : accent ? "text-[#dbe8b6]" : "text-stone-400"}`}
          >
            {note}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4 ${accent ? "bg-white/10 text-[#dbe8b6]" : "bg-cream text-jade"}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}
function Breakdown({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-stone-100 py-3.5 last:border-0">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-stone-600">{label}</span>
      <strong className="text-sm">${value}</strong>
    </div>
  );
}
function Alert({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex gap-2">
        <CircleAlert className="mt-0.5 shrink-0 text-amber-700" size={16} />
        <div>
          <p className="text-sm font-medium text-amber-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-amber-800/75">{body}</p>
        </div>
      </div>
    </div>
  );
}

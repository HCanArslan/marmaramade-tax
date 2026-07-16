import Decimal from "decimal.js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function SalesPlanPage() {
  await requireAdmin({ redirectTo: "/sales-plan" });
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const [orders, goal] = await Promise.all([
    prisma.order.count({
      where: { orderDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.profitGoal.findFirst({
      where: { startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const elapsedDays = Math.max(1, now.getUTCDate());
  const pace = new Decimal(orders).div(elapsedDays).mul(daysInMonth);
  const settings = (goal?.scenarioSettings ?? {}) as {
    unitProfitUsd?: string | number;
    exchangeRate?: string | number;
  };
  const targetUsd = goal
    ? goal.targetProfitCurrency === "USD"
      ? new Decimal(goal.targetProfitAmount.toString())
      : new Decimal(goal.targetProfitAmount.toString()).div(
          String(settings.exchangeRate || 1),
        )
    : null;
  const unitProfit = new Decimal(String(settings.unitProfitUsd || 0));
  const requiredUnits =
    targetUsd?.gt(0) && unitProfit.gt(0)
      ? targetUsd.div(unitProfit).ceil()
      : null;
  const remainingUnits = requiredUnits
    ? Decimal.max(requiredUnits.minus(orders), 0)
    : null;
  const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">
          Observed sales pace and saved goal assumptions
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Sales Plan</h1>
        <p className="mt-2 text-sm text-stone-500">
          This view never substitutes gross sales for profit; required units use
          the immutable realistic unit-profit assumption saved with the active
          goal.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Orders this month" value={String(orders)} />
        <Metric
          label="Projected monthly pace"
          value={pace.toDecimalPlaces(1).toString()}
        />
        <Metric
          label="Required goal units"
          value={requiredUnits?.toFixed() ?? "Set unit profit"}
        />
        <Metric
          label="Daily pace required"
          value={
            remainingUnits
              ? remainingUnits.div(remainingDays).toDecimalPlaces(2).toString()
              : "—"
          }
        />
      </section>
      {goal ? (
        <section className="card p-5">
          <h2 className="font-semibold">{goal.name}</h2>
          <p className="mt-2 text-sm text-stone-500">
            Target {goal.targetProfitAmount.toFixed(2)}{" "}
            {goal.targetProfitCurrency} ·{" "}
            {goal.profitMetric.replaceAll("_", " ")} · assumptions remain fixed
            until you create a new goal version.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active goal covers today. Create one under Monthly Goals to
          calculate required sales pace.
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

import Link from "next/link";
import Decimal from "decimal.js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function SalesPlanPage() {
  await requireAdmin({ redirectTo: "/sales-plan" });
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [orders, goal, listings, physicalAvailable] = await Promise.all([
    prisma.order.count({
      where: { orderDate: { gte: monthStart, lt: nextMonth } },
    }),
    prisma.profitGoal.findFirst({
      where: { startDate: { lt: nextMonth }, endDate: { gte: monthStart } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.etsyListing.findMany({
      where: { state: "active" },
      select: {
        quantity: true,
        priceAmount: true,
        buyerDiscountedPrice: true,
        priceCurrency: true,
      },
    }),
    prisma.productionUnit.count({ where: { inventoryStatus: "AVAILABLE" } }),
  ]);

  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const elapsedDays = Math.max(1, now.getUTCDate());
  const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1);
  const pace = new Decimal(orders).div(elapsedDays).mul(daysInMonth);
  const settings = (goal?.scenarioSettings ?? {}) as {
    unitProfitUsd?: string | number | null;
    exchangeRate?: string | number;
  };
  const exchangeRate = new Decimal(String(settings.exchangeRate || 1));
  const targetUsd = goal
    ? goal.targetProfitCurrency === "USD"
      ? new Decimal(goal.targetProfitAmount.toString())
      : new Decimal(goal.targetProfitAmount.toString()).div(exchangeRate)
    : null;
  const unitProfit = new Decimal(String(settings.unitProfitUsd || 0));
  const requiredUnits =
    targetUsd?.gt(0) && unitProfit.gt(0)
      ? targetUsd.div(unitProfit).ceil()
      : null;
  const remainingUnits = requiredUnits
    ? Decimal.max(requiredUnits.minus(orders), 0)
    : null;
  const etsyAvailable = listings.reduce(
    (sum, listing) => sum + listing.quantity,
    0,
  );
  const averageUsdPrice = listings.filter(
    (listing) => listing.priceCurrency === "USD",
  ).length
    ? listings
        .filter((listing) => listing.priceCurrency === "USD")
        .reduce(
          (sum, listing) =>
            sum.plus(
              (listing.buyerDiscountedPrice ?? listing.priceAmount).toString(),
            ),
          new Decimal(0),
        )
        .div(
          listings.filter((listing) => listing.priceCurrency === "USD").length,
        )
    : new Decimal(0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Current month goal and observed sales</p>
        <h1 className="mt-2 text-3xl font-semibold">Sales Plan</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
          This page automatically uses the most recently updated goal that
          overlaps the current calendar month. It compares that goal with local
          orders and synchronized Etsy availability.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Orders this month"
          value={String(orders)}
          note="Imported or confirmed local orders"
        />
        <Metric
          label="Projected monthly pace"
          value={pace.toDecimalPlaces(1).toString()}
          note="Current pace extended to month end"
        />
        <Metric
          label="Sales needed for goal"
          value={requiredUnits?.toFixed() ?? "Needs unit profit"}
          note="Target ÷ saved realistic net profit per sale"
        />
        <Metric
          label="Daily pace still needed"
          value={
            remainingUnits
              ? remainingUnits.div(remainingDays).toDecimalPlaces(2).toString()
              : "—"
          }
          note={`${remainingDays} calendar days remaining`}
        />
      </section>

      {goal ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Goal used by this plan</p>
              <h2 className="mt-2 text-xl font-semibold">{goal.name}</h2>
              <p className="mt-2 text-sm text-stone-500">
                {goal.startDate.toLocaleDateString("en-GB")} –{" "}
                {goal.endDate.toLocaleDateString("en-GB")} · target{" "}
                {goal.targetProfitAmount.toFixed(2)} {goal.targetProfitCurrency}
              </p>
            </div>
            <Link className="rounded-xl border px-3 py-2 text-sm" href="/goals">
              Edit monthly goals
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail
              label="Saved net profit / sale"
              value={
                unitProfit.gt(0) ? `$${unitProfit.toFixed(2)}` : "Not entered"
              }
            />
            <Detail
              label="Saved USD/TRY snapshot"
              value={exchangeRate.toFixed(4)}
            />
            <Detail
              label="Etsy sellable quantity"
              value={String(etsyAvailable)}
            />
            <Detail
              label="Recorded physical units"
              value={String(physicalAvailable)}
            />
          </div>
          {unitProfit.lte(0) && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The goal exists, but its realistic net profit per sale is zero or
              blank, so required sales cannot be calculated. Delete and recreate
              the goal with a unit-profit value from the Calculator.
            </p>
          )}
          {averageUsdPrice.gt(0) && (
            <p className="mt-4 text-sm text-stone-500">
              Current active Etsy average buyer price:{" "}
              <strong>${averageUsdPrice.toFixed(2)}</strong>. This is revenue,
              not net profit.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No saved goal overlaps this month.{" "}
          <Link className="font-semibold underline" href="/goals">
            Create a monthly goal
          </Link>{" "}
          and it will appear here automatically.
        </section>
      )}

      <section className="rounded-xl border bg-stone-50 p-4 text-sm leading-6 text-stone-600">
        Capacity check: Etsy currently exposes {etsyAvailable} sellable units,
        while Production records {physicalAvailable} finished physical units.
        Review differences on{" "}
        <Link className="font-medium underline" href="/inventory">
          Inventory
        </Link>
        ; the plan does not silently treat listing quantity as physical stock.
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{note}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

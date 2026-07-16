import Link from "next/link";
import Decimal from "decimal.js";
import {
  ArrowRight,
  CircleAlert,
  CircleDollarSign,
  Package,
  Ship,
  TrendingUp,
} from "lucide-react";
import {
  DashboardChart,
  type DashboardChartPoint,
} from "@/components/dashboard-charts";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getWeeklyUsdTryRate } from "@/lib/exchange-rate";
import { formatMoney } from "@/lib/domain/money";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  await requireAdmin({ redirectTo: "/" });
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const chartStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );

  const [
    business,
    products,
    listings,
    savedRate,
    snapshots,
    ordersThisMonth,
    pendingOrders,
    activeGoal,
    availableUnits,
    materials,
    shipping,
    customs,
  ] = await Promise.all([
    prisma.businessProfile.findFirst({
      where: { active: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: {
        costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
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
    prisma.exchangeRateSnapshot.findFirst({
      where: { baseCurrency: "USD", quoteCurrency: "TRY" },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.orderCostSnapshot.findMany({
      where: { calculatedAt: { gte: chartStart } },
      select: {
        calculatedAt: true,
        grossRevenueUsd: true,
        estimatedProfitUsd: true,
      },
    }),
    prisma.order.count({
      where: { orderDate: { gte: monthStart, lt: nextMonth } },
    }),
    prisma.order.count({
      where: {
        orderStatus: {
          notIn: ["SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"],
        },
      },
    }),
    prisma.profitGoal.findFirst({
      where: { startDate: { lt: nextMonth }, endDate: { gte: monthStart } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.productionUnit.count({ where: { inventoryStatus: "AVAILABLE" } }),
    prisma.material.count({ where: { active: true } }),
    prisma.shippingQuote.findFirst({
      where: {
        planningDefault: true,
        shippingCurrency: "USD",
        OR: [{ expirationDate: null }, { expirationDate: { gte: now } }],
      },
      orderBy: { quoteDate: "desc" },
    }),
    prisma.customsQuote.findFirst({
      where: {
        declaredValueCurrency: "USD",
        OR: [{ expirationDate: null }, { expirationDate: { gte: now } }],
      },
      orderBy: { quoteDate: "desc" },
    }),
  ]);

  const rate = await getWeeklyUsdTryRate(savedRate);
  const missingCosts = products.filter(
    (product) => !product.costVersions.length,
  ).length;
  const etsyQuantity = listings.reduce(
    (sum, listing) => sum + listing.quantity,
    0,
  );
  const usdListings = listings.filter(
    (listing) => listing.priceCurrency === "USD",
  );
  const averagePrice = usdListings.length
    ? usdListings
        .reduce(
          (sum, listing) =>
            sum.plus(
              (listing.buyerDiscountedPrice ?? listing.priceAmount).toString(),
            ),
          new Decimal(0),
        )
        .div(usdListings.length)
    : new Decimal(0);
  const currentMonthSnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.calculatedAt >= monthStart && snapshot.calculatedAt < nextMonth,
  );
  const monthProfit = sum(
    currentMonthSnapshots.map((snapshot) => snapshot.estimatedProfitUsd),
  );
  const monthRevenue = sum(
    currentMonthSnapshots.map((snapshot) => snapshot.grossRevenueUsd),
  );
  const customsTotal = customs
    ? (
        customs.customsDutyAmount ??
        customs.declaredValue.mul(customs.customsDutyRate).div(100)
      )
        .plus(
          customs.additionalTariffAmount ??
            customs.declaredValue.mul(customs.additionalTariffRate).div(100),
        )
        .plus(customs.carrierProcessingFee)
        .plus(customs.brokerageFee)
        .plus(customs.customsClearanceFee)
        .plus(customs.destinationTax)
        .plus(customs.otherDestinationFee)
    : null;
  const chartData = chartPoints(now, snapshots);

  return (
    <div className="mx-auto max-w-[1440px] space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">
            MarmaraMade overview
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Only synchronized or saved records are shown—no illustrative
            business figures.
          </p>
        </div>
        <Link
          href="/calculator"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white"
        >
          Open calculator <ArrowRight size={16} />
        </Link>
      </header>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
        Active legal structure: {business?.legalName ?? "Profile missing"} ·
        USD/TRY {rate.rate} from {rate.source} ({rate.asOf})
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Revenue this month"
          value={formatMoney(monthRevenue, "USD")}
          note={`${currentMonthSnapshots.length} completed calculation snapshots`}
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Estimated net profit"
          value={formatMoney(monthProfit, "USD")}
          note="After saved costs and reserves in order snapshots"
          icon={<TrendingUp />}
          accent
        />
        <Metric
          label="Active Etsy catalog"
          value={`${listings.length} listings · ${etsyQuantity} units`}
          note={
            averagePrice.gt(0)
              ? `${formatMoney(averagePrice, "USD")} average buyer price`
              : "No active USD prices"
          }
          icon={<Package />}
        />
        <Metric
          label="Recorded physical stock"
          value={`${availableUnits} finished units`}
          note={`${materials} raw materials · ${products.length} product records`}
          icon={<Ship />}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <div className="card p-5 sm:p-6">
          <p className="eyebrow">Actual saved snapshots</p>
          <h2 className="mt-1 text-xl font-semibold">
            Revenue & estimated profit
          </h2>
          <DashboardChart data={chartData} />
          <p className="text-xs text-stone-400">
            Months without completed order snapshots remain zero.
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Current planning evidence</p>
          <DataRow label="USD/TRY" value={`${rate.rate} · ${rate.asOf}`} />
          <DataRow
            label="Shipping default"
            value={
              shipping
                ? `${shipping.shippingCost.toFixed(2)} ${shipping.shippingCurrency}`
                : "Not saved"
            }
          />
          <DataRow
            label="Customs estimate"
            value={
              customsTotal ? `${customsTotal.toFixed(2)} USD` : "Not saved"
            }
          />
          <DataRow
            label="Monthly goal"
            value={
              activeGoal
                ? `${activeGoal.targetProfitAmount.toFixed(2)} ${activeGoal.targetProfitCurrency}`
                : "Not saved"
            }
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Status
          title="Product costing"
          value={
            missingCosts
              ? `${missingCosts} products need a cost version`
              : "All products have a cost version"
          }
          warning={missingCosts > 0}
          href="/products"
        />
        <Status
          title="Sales plan"
          value={
            activeGoal
              ? `${ordersThisMonth} orders this month · goal linked`
              : "No goal overlaps this month"
          }
          warning={!activeGoal}
          href="/sales-plan"
        />
        <Status
          title="Inventory reconciliation"
          value={`${etsyQuantity} Etsy quantity · ${availableUnits} recorded physical`}
          warning={etsyQuantity !== availableUnits}
          href="/inventory"
        />
        <Status
          title="Open orders"
          value={`${pendingOrders} pending local orders`}
          href="/orders"
        />
        <Status
          title="Shipping"
          value={
            shipping
              ? "Dated planning quote available"
              : "No planning-default quote"
          }
          warning={!shipping}
          href="/shipping"
        />
        <Status
          title="Customs"
          value={
            customs ? "Dated estimate available" : "No dated customs estimate"
          }
          warning={!customs}
          href="/customs"
        />
      </section>
    </div>
  );
}

function sum(values: Array<{ toString(): string }>): Decimal {
  return values.reduce<Decimal>(
    (total, value) => total.plus(value.toString()),
    new Decimal(0),
  );
}

function chartPoints(
  now: Date,
  snapshots: Array<{
    calculatedAt: Date;
    grossRevenueUsd: { toString(): string };
    estimatedProfitUsd: { toString(): string };
  }>,
): DashboardChartPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
    );
    const next = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
    const rows = snapshots.filter(
      (snapshot) =>
        snapshot.calculatedAt >= date && snapshot.calculatedAt < next,
    );
    return {
      month: date.toLocaleDateString("en-GB", { month: "short" }),
      revenue: sum(rows.map((row) => row.grossRevenueUsd)).toNumber(),
      profit: sum(rows.map((row) => row.estimatedProfitUsd)).toNumber(),
    };
  });
}

function Metric({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <article className={`card p-5 ${accent ? "bg-[#18342e] text-white" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs ${accent ? "text-white/55" : "text-stone-500"}`}
          >
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold">{value}</p>
          <p
            className={`mt-1 text-xs ${accent ? "text-[#dbe8b6]" : "text-stone-400"}`}
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

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-0">
      <span className="text-stone-500">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function Status({
  title,
  value,
  warning = false,
  href,
}: {
  title: string;
  value: string;
  warning?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`card block p-5 ${warning ? "border-amber-200 bg-amber-50/50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <CircleAlert
          size={16}
          className={warning ? "text-amber-700" : "text-emerald-700"}
        />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-stone-500">{value}</p>
    </Link>
  );
}

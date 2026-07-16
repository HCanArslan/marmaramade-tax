import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

const exports = [
  "products",
  "product-costs",
  "orders",
  "shipping-quotes",
  "customs-quotes",
  "legal-profiles",
  "documents",
  "compliance-cases",
  "goals",
  "bank-accounts", "owner-transactions", "expenses", "recurring-expenses", "fixed-assets",
  "materials", "material-inventory", "production-batches", "finished-inventory",
  "etsy-listings", "etsy-receipts", "etsy-payments", "etsy-ledger", "etsy-payouts",
  "shipentegra-quotes", "shipments", "tracking", "customs-profiles", "tariffs", "etgb-cases",
  "tax-obligations", "sgk", "accountant-periods", "audit-events",
];
export default async function ReportsPage() {
  await requireAdmin({ redirectTo: "/reports" });
  const snapshots = await prisma.orderCostSnapshot.findMany({
    include: { order: true },
    orderBy: { calculatedAt: "desc" },
  });
  const revenue = snapshots.reduce((n, x) => n.plus(x.grossRevenueUsd.toString()), new Decimal(0));
  const profit = snapshots.reduce((n, x) => n.plus(x.estimatedProfitUsd.toString()), new Decimal(0));
  const costs = snapshots.reduce((n, x) => n.plus(x.totalCostUsd.toString()), new Decimal(0));
  const months = new Map<
    string,
    { revenue: Decimal; profit: Decimal; cost: Decimal; orders: number }
  >();
  for (const s of snapshots) {
    const key = s.order.orderDate.toISOString().slice(0, 7);
    const m = months.get(key) || { revenue: new Decimal(0), profit: new Decimal(0), cost: new Decimal(0), orders: 0 };
    m.revenue = m.revenue.plus(s.grossRevenueUsd.toString());
    m.profit = m.profit.plus(s.estimatedProfitUsd.toString());
    m.cost = m.cost.plus(s.totalCostUsd.toString());
    m.orders += 1;
    months.set(key, m);
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Snapshot-based reporting</p>
        <h1 className="mt-2 text-3xl font-semibold">Reports & exports</h1>
        <p className="mt-2 text-sm text-stone-500">
          Estimated realistic profit is a planning metric, not official
          accounting net profit.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Confirmed revenue" value={`$${revenue.toFixed(2)}`} />
        <Metric label="Snapshot costs" value={`$${costs.toFixed(2)}`} />
        <Metric
          label="Realistic estimated profit"
          value={`$${profit.toFixed(2)}`}
        />
      </section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Month</th>
              <th>Orders</th>
              <th>Revenue USD</th>
              <th>Costs USD</th>
              <th>Realistic estimate USD</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(months.entries())
              .sort()
              .reverse()
              .map(([month, m]) => (
                <tr className="border-b" key={month}>
                  <td className="p-4 font-medium">{month}</td>
                  <td>{m.orders}</td>
                  <td>{m.revenue.toFixed(2)}</td>
                  <td>{m.cost.toFixed(2)}</td>
                  <td>{m.profit.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!months.size && (
          <p className="p-8 text-center text-sm text-stone-500">
            Confirmed snapshots will appear here.
          </p>
        )}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Private CSV exports</h2>
        <p className="mt-1 text-xs text-stone-500">
          Exports require authentication and omit Blob tokens and direct private
          URLs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-xl border bg-white px-3 py-2 text-xs font-medium" href="/reports/print">Printable / PDF summary</Link>
          {exports.map((x) => (
            <Link
              className="rounded-xl border bg-white px-3 py-2 text-xs font-medium"
              href={`/api/exports/${x}`}
              key={x}
            >
              {x.replaceAll("-", " ")}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

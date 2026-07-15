import Decimal from "decimal.js";
import Link from "next/link";
import { AlertTriangle, Scale } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { reconcileFee } from "@/lib/etsy/reconciliation";

const rows: ReadonlyArray<{
  label: string;
  expected?: readonly string[];
  expectedPrefix?: string;
  actual: string;
}> = [
  {
    label: "Transaction fee",
    expected: ["Transaction fee"],
    actual: "TRANSACTION",
  },
  {
    label: "Payment processing",
    expected: ["Payment processing percentage", "Payment processing fixed"],
    actual: "PAYMENT_PROCESSING",
  },
  {
    label: "Regulatory fee",
    expected: ["Regulatory operating fee"],
    actual: "REGULATORY",
  },
  {
    label: "Currency conversion",
    expected: ["Currency conversion fee"],
    actual: "OTHER",
  },
  {
    label: "Seller-fee VAT",
    expectedPrefix: "VAT on",
    actual: "SELLER_FEE_VAT",
  },
  {
    label: "Offsite Ads / advertising",
    expected: ["Offsite Ads", "Etsy Ads"],
    actual: "ADVERTISING",
  },
] as const;

export default async function ReconciliationPage() {
  await requireAdmin({ redirectTo: "/reconciliation" });
  const [expectedLines, actualLines] = await Promise.all([
    prisma.orderCostLine.findMany({
      select: { formulaName: true, convertedAmountUsd: true },
    }),
    prisma.etsyLedgerEntry.findMany({
      where: { reviewStatus: { not: "UNRELATED" } },
      select: {
        mappedCategory: true,
        amount: true,
        currency: true,
        mappingConfidence: true,
        manualReview: true,
      },
    }),
  ]);
  const actualUsdLines = actualLines.filter((line) => line.currency === "USD");
  if (expectedLines.length === 0 || actualUsdLines.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="eyebrow">Expected vs imported actuals</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Fee reconciliation
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            This page checks whether Etsy&apos;s real fees match the fees
            calculated when an order was confirmed.
          </p>
        </header>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Nothing to reconcile yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            A useful comparison needs both an expected order snapshot and actual
            Etsy ledger charges. Zeroes without those records are not a
            calculation result.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div
              className={`rounded-xl border p-4 ${expectedLines.length ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <p className="text-xs text-stone-500">
                Expected calculation lines
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {expectedLines.length}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Created after an imported Etsy receipt is reviewed and
                explicitly confirmed as a local accounting order.
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 ${actualUsdLines.length ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <p className="text-xs text-stone-500">
                Imported USD ledger lines
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {actualUsdLines.length}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Created by a successful Etsy Ledger or Payments synchronization
                and then mapped to fee categories.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/etsy-import"
              className="rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white"
            >
              Open Etsy Import
            </Link>
            <Link
              href="/orders"
              className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium"
            >
              View confirmed orders
            </Link>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Expected vs imported actuals</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Fee reconciliation
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Differences are review evidence. They never rewrite fee formulas or
          historical snapshots automatically.
        </p>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mr-2 inline" size={16} />
        Currency-specific ledger lines require review before consolidated
        comparison. Non-USD entries are retained but excluded from this USD
        summary.
      </div>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-400">
              <tr>
                <th className="px-5 py-3">Fee</th>
                <th>Expected USD</th>
                <th>Actual USD</th>
                <th>Difference</th>
                <th>Difference %</th>
                <th>Confidence / review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expected = expectedLines
                  .filter(
                    (line) =>
                      row.expected?.includes(line.formulaName as never) ||
                      (row.expectedPrefix &&
                        line.formulaName.startsWith(row.expectedPrefix)),
                  )
                  .reduce(
                    (sum, line) => sum.plus(line.convertedAmountUsd.toString()),
                    new Decimal(0),
                  );
                const matching = actualLines.filter(
                  (line) =>
                    line.mappedCategory === row.actual &&
                    line.currency === "USD",
                );
                const actual = matching.reduce(
                  (sum, line) => sum.plus(line.amount.toString()),
                  new Decimal(0),
                );
                const result = reconcileFee(expected, actual);
                const confidence = matching.length
                  ? Math.min(
                      ...matching.map((line) => Number(line.mappingConfidence)),
                    )
                  : 0;
                return (
                  <tr className="border-t" key={row.label}>
                    <td className="px-5 py-4 font-medium">
                      <Scale className="mr-2 inline text-jade" size={14} />
                      {row.label}
                    </td>
                    <td>${result.expected.toFixed(2)}</td>
                    <td>${result.actual.toFixed(2)}</td>
                    <td
                      className={
                        result.difference.eq(0)
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }
                    >
                      {result.difference.gte(0) ? "+" : ""}$
                      {result.difference.toFixed(2)}
                    </td>
                    <td>
                      {result.differencePercentage
                        ? `${result.differencePercentage.toFixed(2)}%`
                        : "—"}
                    </td>
                    <td>
                      {matching.some((line) => line.manualReview) ? (
                        <span className="pill border-amber-200 bg-amber-50 text-amber-700">
                          Manual review
                        </span>
                      ) : (
                        `${(confidence * 100).toFixed(0)}%`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs leading-5 text-stone-500">
        Approve mappings or mark unrelated entries in the Etsy Import workspace.
        If a durable rate assumption changes, create a new effective-dated
        FeeProfile; never edit a completed snapshot.
      </p>
    </div>
  );
}

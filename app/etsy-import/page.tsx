import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Link2Off,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { getActiveConnection } from "@/lib/etsy/auth";
import { syncEtsyAction } from "@/app/actions/etsy";
import { linkEtsyListingAction } from "@/app/actions/listings";

export default async function EtsyImportPage() {
  await requireAdmin({ redirectTo: "/etsy-import" });
  const connection = await getActiveConnection();
  const [listings, receipts, payments, ledger, products, lastRun] =
    connection
      ? await Promise.all([
          prisma.etsyListing.findMany({
            where: { connectionId: connection.id },
            include: { productLink: true },
            orderBy: { lastImportedAt: "desc" },
            take: 30,
          }),
          prisma.etsyReceipt.findMany({
            where: { connectionId: connection.id },
            orderBy: { sourceCreatedAt: "desc" },
            take: 20,
          }),
          prisma.etsyPayment.count({ where: { connectionId: connection.id } }),
          prisma.etsyLedgerEntry.findMany({
            where: { connectionId: connection.id },
            orderBy: { sourceCreatedAt: "desc" },
            take: 20,
          }),
          prisma.product.findMany({
            where: { active: true },
            orderBy: { sku: "asc" },
          }),
          prisma.etsySyncRun.findFirst({
            where: { connectionId: connection.id },
            orderBy: { startedAt: "desc" },
            include: { errors: { orderBy: { createdAt: "desc" }, take: 10 } },
          }),
        ])
      : [[], [], 0, [], [], null];
  const errors = lastRun?.errors || [];
  const unmapped = listings.filter((listing) => !listing.productLink);
  const reviewLedger = ledger.filter((entry) => entry.manualReview);
  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Read-only external records</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Etsy Import
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Import first, link local costs, preview profitability, then
            explicitly confirm an immutable accounting order.
          </p>
        </div>
        <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">
          <ShieldCheck size={13} />
          GET-only marketplace client
        </span>
      </header>
      {!connection ? (
        <div className="card p-10 text-center">
          <Link2Off className="mx-auto text-stone-300" size={36} />
          <h2 className="mt-4 font-semibold">Etsy is not connected</h2>
          <p className="mt-2 text-sm text-stone-500">
            Configure the developer application and connect it from Settings →
            Etsy Integration.
          </p>
          <a
            href="/settings/etsy"
            className="mt-5 inline-flex rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white"
          >
            Open Etsy settings
          </a>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Listings" value={String(listings.length)} />
            <Metric label="Receipts" value={String(receipts.length)} />
            <Metric label="Payments" value={String(payments)} />
            <Metric label="Ledger entries" value={String(ledger.length)} />
            <Metric
              label="Manual review"
              value={String(unmapped.length + reviewLedger.length)}
            />
          </section>
          <section className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold">Synchronization</h2>
                <p className="mt-1 text-xs text-stone-400">
                  Last run:{" "}
                  {lastRun
                    ? `${lastRun.syncType} · ${lastRun.status} · ${lastRun.startedAt.toLocaleString("en-GB")}`
                    : "Never"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["INCREMENTAL", "Sync now"],
                  ["LISTINGS_ONLY", "Listings"],
                  ["ORDERS_ONLY", "Orders"],
                  ["PAYMENTS_ONLY", "Payments"],
                  ["LEDGER_ONLY", "Ledger"],
                ].map(([value, label]) => (
                  <form action={syncEtsyAction} key={value}>
                    <input type="hidden" name="syncType" value={value} />
                    <button className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium">
                      <RefreshCw size={13} />
                      {label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section className="card overflow-hidden">
              <div className="border-b p-5">
                <p className="eyebrow">Listing → Product links</p>
                <h2 className="mt-1 font-semibold">
                  {unmapped.length} unmapped listings
                </h2>
              </div>
              <div className="divide-y">
                {unmapped.length ? (
                  unmapped.map((listing) => (
                    <form
                      action={linkEtsyListingAction}
                      key={listing.id}
                      className="grid gap-3 p-5 sm:grid-cols-[1fr_210px_auto]"
                    >
                      <input
                        type="hidden"
                        name="etsyListingId"
                        value={listing.etsyListingId}
                      />
                      <input
                        type="hidden"
                        name="confirmSkuMismatch"
                        value="false"
                      />
                      <div>
                        <p className="text-sm font-medium">{listing.title}</p>
                        <p className="mt-1 text-xs text-stone-400">
                          Etsy #{listing.etsyListingId} · SKU{" "}
                          {listing.sku || "missing"}
                        </p>
                      </div>
                      <select name="productId" required className="field">
                        <option value="">Select local product…</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} · {product.title}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-xl bg-jade px-3 py-2 text-xs font-medium text-white">
                        Link
                      </button>
                    </form>
                  ))
                ) : (
                  <Empty text="All imported listings are linked." />
                )}
              </div>
            </section>
            <section className="card overflow-hidden">
              <div className="border-b p-5">
                <p className="eyebrow">Fee mapping review</p>
                <h2 className="mt-1 font-semibold">
                  Unknown and low-confidence entries
                </h2>
              </div>
              <div className="divide-y">
                {reviewLedger.length ? (
                  reviewLedger.map((entry) => (
                    <div className="p-4" key={entry.id}>
                      <div className="flex justify-between text-sm">
                        <span>
                          {entry.originalDescription || entry.entryType}
                        </span>
                        <strong>
                          {entry.amount.toFixed(2)} {entry.currency}
                        </strong>
                      </div>
                      <p className="mt-1 text-xs text-amber-700">
                        Mapped {entry.mappedCategory} ·{" "}
                        {(Number(entry.mappingConfidence) * 100).toFixed(0)}%
                        confidence
                      </p>
                    </div>
                  ))
                ) : (
                  <Empty text="No ledger entries require review." />
                )}
              </div>
            </section>
          </div>
          <section className="card overflow-hidden">
            <div className="border-b p-5">
              <p className="eyebrow">Imported receipts</p>
              <h2 className="mt-1 font-semibold">Confirmation queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-400">
                  <tr>
                    <th className="px-5 py-3">Receipt</th>
                    <th>Destination</th>
                    <th>Imported total</th>
                    <th>Local accounting</th>
                    <th>Reconciliation</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr className="border-t" key={receipt.id}>
                      <td className="px-5 py-4">
                        <Link href={`/etsy-import/receipts/${receipt.id}`} className="font-medium text-jade">#{receipt.etsyReceiptId}</Link>
                        <p className="text-xs text-stone-400">
                          {receipt.sourceCreatedAt.toLocaleDateString("en-GB")}
                        </p>
                      </td>
                      <td>{receipt.destinationCountry || "—"}</td>
                      <td>
                        {receipt.totalAmount.toFixed(2)} {receipt.currency}
                      </td>
                      <td>
                        {receipt.localOrderId ? (
                          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} />
                            Confirmed snapshot
                          </span>
                        ) : (
                          <span className="pill border-amber-200 bg-amber-50 text-amber-700">
                            Needs local costs
                          </span>
                        )}
                      </td>
                      <td>
                        {receipt.needsReconciliation ? (
                          <span className="text-amber-700">
                            Etsy changed after confirmation
                          </span>
                        ) : (
                          "Current"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!receipts.length && <Empty text="No receipts imported yet." />}
          </section>
          {errors.length > 0 && (
            <section className="card p-5">
              <div className="flex gap-2">
                <AlertCircle className="text-red-600" size={18} />
                <h2 className="font-semibold">Recent sync errors</h2>
              </div>
              {errors.map((error) => (
                <p className="mt-3 text-sm text-stone-500" key={error.id}>
                  {error.resource}: {error.message}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <Database className="text-jade" size={16} />
      <p className="mt-3 text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="p-6 text-center text-sm text-stone-400">{text}</p>;
}

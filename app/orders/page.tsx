import {
  createManualOrderAction,
  createOrderAdjustmentAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
export default async function OrdersPage() {
  await requireAdmin({ redirectTo: "/orders" });
  const [orders, products, businesses, legal, fees, rates, shipping, customs] =
    await Promise.all([
      prisma.order.findMany({
        include: {
          snapshots: { orderBy: { calculatedAt: "desc" }, take: 1 },
          adjustments: true,
          legalOperatingProfile: true,
        },
        orderBy: { orderDate: "desc" },
      }),
      prisma.product.findMany({
        where: { active: true },
        include: { costVersions: { orderBy: { effectiveFrom: "desc" } } },
      }),
      prisma.businessProfileVersion.findMany({
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.legalOperatingProfile.findMany({
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.feeProfile.findMany({ orderBy: { effectiveFrom: "desc" } }),
      prisma.exchangeRateSnapshot.findMany({ orderBy: { capturedAt: "desc" } }),
      prisma.shippingQuote.findMany({ orderBy: { quoteDate: "desc" } }),
      prisma.customsQuote.findMany({ orderBy: { quoteDate: "desc" } }),
    ]);
  const ready =
    products.some((p) => p.costVersions.length) &&
    businesses.length &&
    legal.length &&
    fees.length &&
    rates.length;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Immutable confirmation + auditable actuals</p>
        <h1 className="mt-2 text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-stone-500">
          Manual and Etsy orders freeze profile, quote, rate, cost, and
          calculation lines. Later actuals are adjustments.
        </p>
      </header>
      <section className="card p-5">
        <h2 className="font-semibold">Create and confirm manual order</h2>
        {ready ? (
          <form
            action={createManualOrderAction}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <Field name="orderNumber" label="Order number" />
            <Field name="orderDate" label="Order date" type="date" />
            <Field name="destinationCountry" label="Destination" value="US" />
            <Field name="currency" label="Currency" value="USD" />
            <label className="text-xs text-stone-500">
              Product / cost
              <select
                className="field mt-1"
                name="productCostVersionId"
                required
              >
                {products.flatMap((p) =>
                  p.costVersions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {p.sku} · {c.effectiveFrom.toLocaleDateString("en-GB")}
                    </option>
                  )),
                )}
              </select>
            </label>
            <Field name="quantity" label="Quantity" type="number" value="1" />
            <Field
              name="unitPrice"
              label="Unit buyer price USD"
              type="number"
            />
            <Select
              name="businessProfileVersionId"
              label="Legacy business profile"
              items={businesses.map((x) => [x.id, x.name])}
            />
            <Select
              name="legalOperatingProfileId"
              label="Legal operating profile"
              items={legal.map((x) => [x.id, `${x.name} · ${x.operatingMode}`])}
            />
            <Select
              name="feeProfileId"
              label="Fee profile"
              items={fees.map((x) => [x.id, x.name])}
            />
            <Select
              name="exchangeRateSnapshotId"
              label="Exchange rate"
              items={rates.map((x) => [
                x.id,
                `${x.rate.toString()} · ${x.capturedAt.toLocaleDateString("en-GB")}`,
              ])}
            />
            <Select
              name="shippingQuoteId"
              label="Shipping quote"
              optional
              items={shipping.map((x) => [
                x.id,
                `${x.carrier} · ${x.destinationCountry} · ${x.shippingCost}`,
              ])}
            />
            <Select
              name="customsQuoteId"
              label="Customs quote"
              optional
              items={customs.map((x) => [
                x.id,
                `${x.destinationCountry} · ${x.hsCode}`,
              ])}
            />
            <Field
              name="packagingActualTry"
              label="Actual extra packaging TRY"
              type="number"
              value="0"
            />
            <Field
              name="withholdingTry"
              label="Actual withholding TRY"
              type="number"
              value="0"
            />
            <Field
              name="overheadTry"
              label="Allocated overhead TRY"
              type="number"
              value="0"
            />
            <Field name="notes" label="Notes" required={false} />
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Confirm immutable snapshot
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Add a product cost, legacy business profile, legal profile, fee
            profile, and exchange-rate snapshot before confirming a manual
            order.
          </p>
        )}
      </section>
      <section className="grid gap-4">
        {orders.map((o) => {
          const s = o.snapshots[0];
          return (
            <article className="card p-5" key={o.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    <Link className="hover:text-jade" href={`/orders/${o.id}`}>
                      {o.orderNumber}
                    </Link>
                  </h2>
                  <p className="text-xs text-stone-500">
                    {o.orderDate.toLocaleDateString("en-GB")} ·{" "}
                    {o.destinationCountry} ·{" "}
                    {o.legalOperatingProfile?.name || "Legacy profile only"}
                  </p>
                </div>
                <span className="pill">{o.orderStatus}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Datum
                  label="Gross USD"
                  value={s?.grossRevenueUsd.toFixed(2) || "—"}
                />
                <Datum
                  label="Planned realistic USD"
                  value={s?.estimatedProfitUsd.toFixed(2) || "—"}
                />
                <Datum
                  label="Adjustments"
                  value={String(o.adjustments.length)}
                />
                <Datum
                  label="Documents"
                  value={o.complianceComplete ? "Complete" : "Incomplete"}
                />
              </div>
              {s && (
                <form
                  action={createOrderAdjustmentAction}
                  className="mt-4 grid gap-2 rounded-xl border bg-stone-50 p-3 sm:grid-cols-7"
                >
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="snapshotId" value={s.id} />
                  <input
                    className="field"
                    name="category"
                    placeholder="Actual shipping"
                    required
                  />
                  <input
                    className="field"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    required
                  />
                  <select className="field" name="currency">
                    <option>USD</option>
                    <option>TRY</option>
                  </select>
                  <input
                    className="field"
                    name="exchangeRate"
                    type="number"
                    step="0.0001"
                    defaultValue={
                      s.exchangeRateSnapshotId
                        ? rates
                            .find((r) => r.id === s.exchangeRateSnapshotId)
                            ?.rate.toString()
                        : "1"
                    }
                  />
                  <input
                    className="field"
                    name="reason"
                    placeholder="Reason"
                    required
                  />
                  <input
                    className="field"
                    name="evidenceNote"
                    placeholder="Evidence note"
                  />
                  <button className="rounded-xl border bg-white px-3 text-xs">
                    Add actual adjustment
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  value,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        className="field mt-1"
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}
function Select({
  name,
  label,
  items,
  optional = false,
}: {
  name: string;
  label: string;
  items: [string, string][];
  optional?: boolean;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <select className="field mt-1" name={name} required={!optional}>
        {optional && <option value="">None / actual later</option>}
        {items.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function Datum({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-xs text-stone-400">{label}</span>
      <br />
      <strong>{value}</strong>
    </p>
  );
}

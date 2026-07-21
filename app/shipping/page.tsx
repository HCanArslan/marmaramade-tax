import {
  archiveShippingQuoteAction,
  copyShippingQuoteToProductsAction,
  createShippingQuoteAction,
  deleteShippingQuoteAction,
  duplicateShippingQuoteAction,
  reconcileShippingQuoteAction,
  setPlanningDefaultShippingQuoteAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin({ redirectTo: "/shipping" });
  const [params, products, quotes] = await Promise.all([
    searchParams,
    prisma.product.findMany({
      where: { active: true },
      orderBy: { sku: "asc" },
    }),
    prisma.shippingQuote.findMany({
      include: {
        product: true,
        _count: { select: { orders: true, documents: true } },
      },
      orderBy: { quoteDate: "desc" },
      take: 100,
    }),
  ]);
  const now = new Date();
  const automaticFallback = quotes.find(
    (quote) =>
      quote.shippingCurrency === "USD" &&
      (!quote.expirationDate || quote.expirationDate >= now) &&
      !`${quote.source || ""} ${quote.notes || ""}`
        .toLowerCase()
        .includes("example"),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Header />
      {(params.duplicated ||
        params.copied ||
        params.archived ||
        params.deleted) && (
        <p className="rounded-xl border border-jade/20 bg-jade/5 px-4 py-3 text-sm text-jade">
          {params.duplicated
            ? "Shipping quote duplicated. The new copy is ready to edit or use."
            : params.copied
              ? `Shipping quote copied to ${params.copied} product${params.copied === "1" ? "" : "s"}.`
              : params.archived
                ? "Shipping quote archived and removed from planning defaults."
                : "Unused shipping quote permanently deleted."}
        </p>
      )}
      <section className="card p-5">
        <h2 className="font-semibold">New effective-dated quote</h2>
        <p className="mt-1 text-sm text-stone-500">
          The Calculator prefers the unexpired USD quote marked as Planning
          default. If none is marked, it automatically uses the latest current
          non-example USD quote. Include any ShipEntegra or ETGB service charge
          separately on Customs & ETGB. This quote is international transport
          only unless its evidence explicitly says otherwise. Saved quotes can
          be copied to several products at once from the table below.
        </p>
        <form
          action={createShippingQuoteAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="text-xs text-stone-500">
            Product
            <select
              className="field mt-1"
              defaultValue=""
              name="productId"
              required
            >
              <option disabled value="">
                Choose product
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} · {product.title}
                </option>
              ))}
            </select>
          </label>
          <Input name="originCountry" label="Origin country" value="TR" />
          <Input name="originCity" label="Origin city" value="Istanbul" />
          <Input name="destinationCountry" label="Destination" value="US" />
          <Input name="carrier" label="Carrier" value="ShipEntegra" />
          <Input
            name="serviceName"
            label="Service"
            value="ShipEntegra Express"
          />
          <Input name="incoterm" label="Incoterm" value="UNKNOWN" />
          <Input
            name="actualWeightKg"
            label="Actual kg"
            type="number"
            value="1"
          />
          <Input
            name="divisor"
            label="Volumetric divisor"
            type="number"
            value="5000"
          />
          <Input name="length" label="Length cm" type="number" value="35" />
          <Input name="width" label="Width cm" type="number" value="45" />
          <Input name="height" label="Height cm" type="number" value="8" />
          <Input
            name="base"
            label="International transport USD"
            type="number"
            value="50.83"
          />
          <Input name="fuel" label="Fuel surcharge" type="number" value="0" />
          <Input name="insurance" label="Insurance" type="number" value="0" />
          <Input name="pickup" label="Pickup" type="number" value="0" />
          <Input name="remote" label="Remote area" type="number" value="0" />
          <Input name="other" label="Other fees" type="number" value="0" />
          <Input name="currency" label="Currency" value="USD" />
          <Input name="quoteDate" label="Quote date" type="date" />
          <Input
            name="expirationDate"
            label="Expiry"
            type="date"
            required={false}
          />
          <Input
            name="source"
            label="Source"
            value="ShipEntegra account calculator"
          />
          <Input name="notes" label="Notes" required={false} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="planningDefault" />
            Planning default
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm font-medium text-white">
            Save quote
          </button>
        </form>
      </section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-500">
              <th className="p-4">Product / carrier</th>
              <th>Route</th>
              <th>Parcel / billable</th>
              <th>Total</th>
              <th>Quote / expiry</th>
              <th>Status</th>
              <th>Actual / variance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const archived = q.estimateStatus === "ARCHIVED";
              const deleteBlocked = q._count.orders + q._count.documents > 0;
              const copyTargets = products.filter(
                (product) => product.id !== q.productId,
              );
              return (
                <tr className="border-b" key={q.id}>
                  <td className="p-4 font-medium">
                    {q.product?.sku ?? "Legacy unassigned"}
                    <br />
                    <span className="text-xs font-normal text-stone-500">
                      {q.carrier} · {q.serviceName}
                    </span>
                  </td>
                  <td>
                    {q.originCountry} → {q.destinationCountry}
                  </td>
                  <td>
                    {q.packageLengthCm.toFixed(1)} ×{" "}
                    {q.packageWidthCm.toFixed(1)} ×{" "}
                    {q.packageHeightCm.toFixed(1)} cm
                    <br />
                    <span className="text-xs text-stone-500">
                      actual {q.actualWeightKg.toFixed(2)} kg · billable{" "}
                      {q.billableWeightKg.toFixed(2)} kg
                    </span>
                  </td>
                  <td>
                    {q.shippingCost.toFixed(2)} {q.shippingCurrency}
                  </td>
                  <td>
                    {q.quoteDate.toLocaleDateString("en-GB")} /{" "}
                    {q.expirationDate?.toLocaleDateString("en-GB") || "—"}
                  </td>
                  <td>
                    <span className="pill">
                      {archived
                        ? "Archived"
                        : q.expirationDate && q.expirationDate < now
                          ? "Expired"
                          : q.planningDefault
                            ? "Planning default"
                            : q.id === automaticFallback?.id
                              ? "Automatic Calculator fallback"
                              : "Saved quote"}
                    </span>
                  </td>
                  <td>
                    {q.actualShippingCost === null ? (
                      <form
                        action={reconcileShippingQuoteAction}
                        className="flex min-w-56 gap-1"
                      >
                        <input type="hidden" name="id" value={q.id} />
                        <input
                          className="field w-24"
                          name="actualShippingCost"
                          type="number"
                          step="0.01"
                          placeholder="Actual"
                          aria-label="Actual shipping cost"
                          required
                        />
                        <input
                          className="field w-16"
                          name="actualCostCurrency"
                          defaultValue={q.shippingCurrency}
                          aria-label="Actual shipping currency"
                          required
                        />
                        <button className="rounded border px-2 text-xs">
                          Reconcile
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs">
                        {q.actualShippingCost.toFixed(2)} {q.actualCostCurrency}
                        {q.actualCostCurrency === q.shippingCurrency && (
                          <>
                            {" "}
                            · variance{" "}
                            {q.actualShippingCost
                              .sub(q.shippingCost)
                              .toFixed(2)}
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {!q.planningDefault &&
                        (!q.expirationDate || q.expirationDate >= now) && (
                          <form action={setPlanningDefaultShippingQuoteAction}>
                            <input type="hidden" name="id" value={q.id} />
                            <button className="rounded border border-jade px-2 py-1 text-xs text-jade">
                              Use for planning
                            </button>
                          </form>
                        )}
                      <form action={duplicateShippingQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button className="rounded border px-2 py-1 text-xs">
                          Duplicate
                        </button>
                      </form>
                      {copyTargets.length > 0 && (
                        <details className="min-w-44 rounded border bg-white px-2 py-1 text-xs">
                          <summary className="cursor-pointer select-none font-medium">
                            Copy to products
                          </summary>
                          <form
                            action={copyShippingQuoteToProductsAction}
                            className="mt-2 space-y-2 border-t pt-2"
                          >
                            <input type="hidden" name="id" value={q.id} />
                            <p className="max-w-56 text-stone-500">
                              Apply this same quote to one or more products.
                            </p>
                            <label className="flex cursor-pointer items-start gap-2 rounded bg-jade/5 px-2 py-2 text-jade">
                              <input
                                className="mt-0.5"
                                type="checkbox"
                                name="copyToAllOtherProducts"
                              />
                              <span>
                                <strong>All other active products</strong>
                                <br />
                                Fastest for a shared shipping setup
                              </span>
                            </label>
                            <p className="text-center text-stone-400">
                              or choose specific products
                            </p>
                            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                              {copyTargets.map((product) => (
                                <label
                                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-stone-50"
                                  key={product.id}
                                >
                                  <input
                                    className="mt-0.5"
                                    type="checkbox"
                                    name="targetProductIds"
                                    value={product.id}
                                  />
                                  <span>
                                    <strong>{product.sku}</strong>
                                    <br />
                                    <span className="text-stone-500">
                                      {product.title}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                            <button className="w-full rounded bg-jade px-2 py-1.5 font-medium text-white">
                              Copy to selected
                            </button>
                          </form>
                        </details>
                      )}
                      <form action={archiveShippingQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button
                          className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={archived}
                        >
                          {archived ? "Archived" : "Archive"}
                        </button>
                      </form>
                      <form action={deleteShippingQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={deleteBlocked}
                          title={
                            deleteBlocked
                              ? "Linked records protect this quote; archive it instead."
                              : "Permanently delete this unused quote"
                          }
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!quotes.length && (
          <p className="p-8 text-center text-sm text-stone-500">
            No shipping quotes yet.
          </p>
        )}
      </section>
    </div>
  );
}
function Header() {
  return (
    <header>
      <p className="eyebrow">Carrier evidence and version history</p>
      <h1 className="mt-2 text-3xl font-semibold">Shipping quotes</h1>
      <p className="mt-2 text-sm text-stone-500">
        Compare dated quotes without changing order-specific actual shipping.
      </p>
    </header>
  );
}
function Input({
  label,
  name,
  type = "text",
  value,
  required = true,
}: {
  label: string;
  name: string;
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

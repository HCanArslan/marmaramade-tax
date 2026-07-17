import {
  archiveCustomsQuoteAction,
  createCustomsActualChargeAction,
  createCustomsQuoteAction,
  deleteCustomsQuoteAction,
  duplicateCustomsQuoteAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function CustomsPage() {
  await requireAdmin({ redirectTo: "/customs" });
  const [products, quotes] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { sku: "asc" },
    }),
    prisma.customsQuote.findMany({
      include: {
        product: true,
        actualCharges: { orderBy: { sourceDate: "desc" }, take: 1 },
        _count: {
          select: { orders: true, documents: true, actualCharges: true },
        },
      },
      orderBy: { quoteDate: "desc" },
      take: 100,
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Dated tariff evidence</p>
        <h1 className="mt-2 text-3xl font-semibold">Customs & tariffs</h1>
        <p className="mt-2 text-sm text-stone-500">
          HS classifications and destination costs remain quote-specific, never
          universal.
        </p>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Start with the product&apos;s material and intended use, then find the
        classification in the official GTIP tool. Enter rates only from a dated
        carrier, customs broker, or destination-authority quote. Existing sample
        guesses are intentionally not used.
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            className="font-medium underline"
            href="https://dys.ticaret.gov.tr/destek-mekanizmalari-ve-bilgi-kaynaklari/gtip-arama-motoru"
            rel="noreferrer"
            target="_blank"
          >
            Open official GTIP search
          </a>
          <a
            className="font-medium underline"
            href="https://ticaret.gov.tr/gumruk-islemleri/sikca-sorulan-sorular/ticari/tarife"
            rel="noreferrer"
            target="_blank"
          >
            Read tariff guidance
          </a>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="font-semibold">New customs quote</h2>
        <form
          action={createCustomsQuoteAction}
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
          {[
            ["originCountry", "Origin", "TR"],
            ["destinationCountry", "Destination", "US"],
            ["hsCode", "HS / HTS code used by estimate", "4202224500"],
            [
              "productDescription",
              "Exact product description",
              "Handbag with outer surface of cotton textile",
            ],
            ["countryOfOrigin", "Country of origin", "TR"],
            ["material", "Materials and composition", "Cotton textile"],
            ["declaredValue", "Declared customs value", "149"],
            ["currency", "Currency", "USD"],
            ["dutyRate", "Estimated duty %", "6.3"],
            ["tariffRate", "Estimated additional tariff %", "10"],
            ["processing", "Estimated processing fee", "4.5"],
            ["brokerage", "Brokerage", "0"],
            ["clearance", "Clearance", "0"],
            ["destinationTax", "Destination tax", "0"],
            ["other", "Other fees", "0"],
          ].map(([name, label, value]) => (
            <label className="text-xs text-stone-500" key={name}>
              {label}
              <input
                className="field mt-1"
                name={name}
                defaultValue={value}
                required
                step="0.01"
                type={
                  [
                    "declaredValue",
                    "dutyRate",
                    "tariffRate",
                    "processing",
                    "brokerage",
                    "clearance",
                    "destinationTax",
                    "other",
                  ].includes(name)
                    ? "number"
                    : "text"
                }
              />
            </label>
          ))}
          <label className="text-xs text-stone-500">
            Assumed customs payer
            <select
              className="field mt-1"
              name="customsPayer"
              defaultValue="UNKNOWN"
            >
              <option>UNKNOWN</option>
              <option>SELLER</option>
              <option>BUYER</option>
              <option>SHARED</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Incoterm
            <select
              className="field mt-1"
              name="customsIncoterm"
              defaultValue="UNKNOWN"
            >
              <option>UNKNOWN</option>
              <option>DAP</option>
              <option>DDU</option>
              <option>DDP</option>
              <option>OTHER</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeInSellerProfit" /> Deduct
            estimate from seller profit
          </label>
          <label className="text-xs text-stone-500">
            Quote date
            <input
              className="field mt-1"
              name="quoteDate"
              type="date"
              required
            />
          </label>
          <label className="text-xs text-stone-500">
            Expiry
            <input className="field mt-1" name="expirationDate" type="date" />
          </label>
          <label className="text-xs text-stone-500">
            Dated source URL or quote reference
            <input
              className="field mt-1"
              name="source"
              defaultValue="ShipEntegra US customs calculator"
              required
            />
          </label>
          <label className="text-xs text-stone-500">
            Notes
            <input className="field mt-1" name="notes" />
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm font-medium text-white">
            Save quote
          </button>
        </form>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Record actual customs charge</h2>
        <p className="mt-1 text-xs text-stone-500">
          Actual charges are stored separately and never overwrite the estimate.
        </p>
        <form
          action={createCustomsActualChargeAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="text-xs text-stone-500">
            Estimate snapshot
            <select className="field mt-1" name="customsQuoteId" required>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.destinationCountry} · {q.hsCode} ·{" "}
                  {q.declaredValue.toFixed(2)} USD
                </option>
              ))}
            </select>
          </label>
          {[
            ["dutyUsd", "Actual duty USD"],
            ["tariffUsd", "Actual tariff USD"],
            ["processingUsd", "Actual processing USD"],
            ["brokerageUsd", "Actual brokerage USD"],
            ["otherUsd", "Actual other USD"],
          ].map(([name, label]) => (
            <label className="text-xs text-stone-500" key={name}>
              {label}
              <input
                className="field mt-1"
                name={name}
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </label>
          ))}
          <label className="text-xs text-stone-500">
            Actual payer
            <select className="field mt-1" name="payer">
              <option>UNKNOWN</option>
              <option>SELLER</option>
              <option>BUYER</option>
              <option>SHARED</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Charge date
            <input
              className="field mt-1"
              name="sourceDate"
              type="date"
              required
            />
          </label>
          <label className="text-xs text-stone-500">
            Source / document reference
            <input className="field mt-1" name="source" required />
          </label>
          <label className="text-xs text-stone-500">
            Notes
            <input className="field mt-1" name="notes" />
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
            Save actual charge
          </button>
        </form>
      </section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Product / destination / HS</th>
              <th>Material</th>
              <th>Declared</th>
              <th>Duty</th>
              <th>Tariff</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payer / incoterm</th>
              <th>Actual / variance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const duty =
                q.customsDutyAmount ??
                q.declaredValue.mul(q.customsDutyRate).div(100);
              const tariff =
                q.additionalTariffAmount ??
                q.declaredValue.mul(q.additionalTariffRate).div(100);
              const total = duty
                .plus(tariff)
                .plus(q.carrierProcessingFee)
                .plus(q.brokerageFee)
                .plus(q.customsClearanceFee)
                .plus(q.destinationTax)
                .plus(q.otherDestinationFee);
              const actual = q.actualCharges[0];
              const archived = q.estimateStatus === "ARCHIVED";
              const deleteBlocked =
                q._count.orders + q._count.documents + q._count.actualCharges >
                0;
              return (
                <tr className="border-b" key={q.id}>
                  <td className="p-4 font-medium">
                    {q.product?.sku ?? "Legacy unassigned"}
                    <br />
                    <span className="text-xs font-normal text-stone-500">
                      {q.destinationCountry} · {q.hsCode}
                    </span>
                  </td>
                  <td>{q.productMaterial || "—"}</td>
                  <td>
                    {q.declaredValue.toFixed(2)} {q.declaredValueCurrency}
                  </td>
                  <td>{duty.toFixed(2)}</td>
                  <td>{tariff.toFixed(2)}</td>
                  <td>{total.toFixed(2)}</td>
                  <td>
                    {archived
                      ? "Archived"
                      : q.expirationDate && q.expirationDate < new Date()
                        ? "Expired"
                        : "Current"}
                  </td>
                  <td>
                    {q.customsPayer} / {q.customsIncoterm}
                    <br />
                    <span className="text-xs text-stone-500">
                      {q.includeInSellerProfit ? "Deducted" : "Exposure only"}
                    </span>
                  </td>
                  <td>
                    {actual
                      ? `${actual.totalUsd.toFixed(2)} / ${actual.totalUsd.minus(total).toFixed(2)}`
                      : "Not recorded"}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <form action={duplicateCustomsQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button className="rounded border px-2 py-1 text-xs">
                          Duplicate
                        </button>
                      </form>
                      <form action={archiveCustomsQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button
                          className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={archived}
                        >
                          {archived ? "Archived" : "Archive"}
                        </button>
                      </form>
                      <form action={deleteCustomsQuoteAction}>
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
            No customs quotes yet.
          </p>
        )}
      </section>
    </div>
  );
}

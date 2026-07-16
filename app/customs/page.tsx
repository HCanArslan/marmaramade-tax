import {
  archiveCustomsQuoteAction,
  createCustomsQuoteAction,
  duplicateCustomsQuoteAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function CustomsPage() {
  await requireAdmin({ redirectTo: "/customs" });
  const quotes = await prisma.customsQuote.findMany({
    orderBy: { quoteDate: "desc" },
    take: 100,
  });
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
          {[
            ["originCountry", "Origin", "TR"],
            ["destinationCountry", "Destination", "US"],
            ["hsCode", "Confirmed HS / HTS code", ""],
            ["productDescription", "Exact product description", ""],
            ["countryOfOrigin", "Country of origin", "TR"],
            ["material", "Materials and composition", ""],
            ["declaredValue", "Declared customs value", ""],
            ["currency", "Currency", "USD"],
            ["dutyRate", "Confirmed duty %", "0"],
            ["tariffRate", "Confirmed additional tariff %", "0"],
            ["processing", "Quoted carrier processing", "0"],
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
            <input className="field mt-1" name="source" required />
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
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Destination / HS</th>
              <th>Material</th>
              <th>Declared</th>
              <th>Duty</th>
              <th>Tariff</th>
              <th>Total</th>
              <th>Status</th>
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
              return (
                <tr className="border-b" key={q.id}>
                  <td className="p-4 font-medium">
                    {q.destinationCountry} · {q.hsCode}
                  </td>
                  <td>{q.productMaterial || "—"}</td>
                  <td>
                    {q.declaredValue.toFixed(2)} {q.declaredValueCurrency}
                  </td>
                  <td>{duty.toFixed(2)}</td>
                  <td>{tariff.toFixed(2)}</td>
                  <td>{total.toFixed(2)}</td>
                  <td>
                    {q.expirationDate && q.expirationDate < new Date()
                      ? "Expired"
                      : "Current"}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <form action={duplicateCustomsQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button className="rounded border px-2 py-1 text-xs">
                          Duplicate
                        </button>
                      </form>
                      <form action={archiveCustomsQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <button className="rounded border px-2 py-1 text-xs">
                          Archive
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

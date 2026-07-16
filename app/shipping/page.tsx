import {
  archiveShippingQuoteAction,
  createShippingQuoteAction,
  duplicateShippingQuoteAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function ShippingPage() {
  await requireAdmin({ redirectTo: "/shipping" });
  const quotes = await prisma.shippingQuote.findMany({
    orderBy: { quoteDate: "desc" },
    take: 100,
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Header />
      <section className="card p-5">
        <h2 className="font-semibold">New effective-dated quote</h2>
        <form
          action={createShippingQuoteAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <Input name="originCountry" label="Origin country" value="TR" />
          <Input name="originCity" label="Origin city" value="Istanbul" />
          <Input name="destinationCountry" label="Destination" value="US" />
          <Input name="carrier" label="Carrier" />
          <Input name="serviceName" label="Service" />
          <Input name="incoterm" label="Incoterm" value="DDP" />
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
          <Input name="length" label="Length cm" type="number" value="40" />
          <Input name="width" label="Width cm" type="number" value="30" />
          <Input name="height" label="Height cm" type="number" value="10" />
          <Input name="base" label="Base price" type="number" value="0" />
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
          <Input name="source" label="Source" required={false} />
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
              <th className="p-4">Carrier/service</th>
              <th>Route</th>
              <th>Billable</th>
              <th>Total</th>
              <th>Quote / expiry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr className="border-b" key={q.id}>
                <td className="p-4 font-medium">
                  {q.carrier} · {q.serviceName}
                </td>
                <td>
                  {q.originCountry} → {q.destinationCountry}
                </td>
                <td>
                  <div className="flex gap-1">
                    <form action={duplicateShippingQuoteAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <button className="rounded border px-2 py-1 text-xs">
                        Duplicate
                      </button>
                    </form>
                    <form action={archiveShippingQuoteAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <button className="rounded border px-2 py-1 text-xs">
                        Archive
                      </button>
                    </form>
                  </div>
                </td>
                <td>{q.billableWeightKg.toFixed(2)} kg</td>
                <td>
                  {q.shippingCost.toFixed(2)} {q.shippingCurrency}
                </td>
                <td>
                  {q.quoteDate.toLocaleDateString("en-GB")} /{" "}
                  {q.expirationDate?.toLocaleDateString("en-GB") || "—"}
                </td>
                <td>
                  <span className="pill">
                    {q.expirationDate && q.expirationDate < new Date()
                      ? "Expired"
                      : q.planningDefault
                        ? "Default"
                        : "Current"}
                  </span>
                </td>
              </tr>
            ))}
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

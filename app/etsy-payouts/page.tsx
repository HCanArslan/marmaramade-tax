import { createEtsyPayoutReconciliationAction } from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
export default async function EtsyPayoutsPage() {
  await requireAdmin({ redirectTo: "/etsy-payouts" });
  const [payouts, reconciliations, bankTransactions] = await Promise.all([
    prisma.etsyPayout.findMany({ orderBy: { payoutDate: "desc" } }),
    prisma.etsyPayoutReconciliation.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.bankTransaction.findMany({
      where: { direction: "CREDIT" },
      orderBy: { transactionDate: "desc" },
      take: 200,
    }),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Read-only Etsy source · local matching</p>
        <h1 className="mt-2 text-3xl font-semibold">Etsy payouts</h1>
      </header>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Payouts must originate from Etsy import. Local records only match them
        to orders, ledger entries, bank credits, fees, and FX differences.
      </p>
      <section className="card p-5">
        <h2 className="font-semibold">Confirm allocation</h2>
        <p className="mt-1 text-sm text-stone-500">
          Use this only to match an Etsy-imported payout to the local record
          that received or explains it. It does not create a new Etsy payout.
        </p>
        <form
          action={createEtsyPayoutReconciliationAction}
          className="mt-4 grid gap-3 md:grid-cols-6"
        >
          <label className="text-xs text-stone-500">
            Imported Etsy payout
            <select className="field mt-1" name="payoutId" required>
              <option value="">Choose payout</option>
              {payouts.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.etsyPayoutId} · {p.amount.toFixed(2)} {p.currency}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Match to record type
            <select className="field mt-1" name="targetType">
              <option>BANK_TRANSACTION</option>
              <option>ORDER</option>
              <option>LEDGER_ENTRY</option>
              <option>FX_DIFFERENCE</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Target record ID
            <input
              className="field mt-1"
              name="targetId"
              list="payout-targets"
              required
            />
          </label>
          <datalist id="payout-targets">
            {bankTransactions.map((t) => (
              <option value={t.id} key={t.id}>
                Bank · {t.amount.toFixed(2)} {t.currency}
              </option>
            ))}
          </datalist>
          <PayoutField name="amount" label="Allocated amount" required />
          <PayoutField
            name="currency"
            label="Currency"
            defaultValue="TRY"
            required
          />
          <PayoutField
            name="fxDifferenceTry"
            label="FX difference in TRY (optional)"
          />
          <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white md:col-span-6">
            Confirm local match
          </button>
        </form>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Imported payouts">
          {payouts.map((p) => (
            <p className="border-b py-3 text-sm" key={p.id}>
              {p.payoutDate.toLocaleDateString("en-GB")} · {p.amount.toFixed(2)}{" "}
              {p.currency}
              <strong className="float-right">{p.status}</strong>
            </p>
          ))}
        </Box>
        <Box title="Confirmed allocations">
          {reconciliations.map((r) => (
            <p className="border-b py-3 text-sm" key={r.id}>
              {r.targetType} · {r.amount.toFixed(2)} {r.currency}
              <strong className="float-right">
                {r.confirmed ? "Confirmed" : "Pending"}
              </strong>
            </p>
          ))}
        </Box>
      </section>
    </div>
  );
}
const Box = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="font-semibold">{title}</h2>
    <div className="mt-3">{children}</div>
  </section>
);

const PayoutField = ({
  name,
  label,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) => (
  <label className="text-xs text-stone-500">
    {label}
    <input
      className="field mt-1"
      name={name}
      defaultValue={defaultValue}
      required={required}
    />
  </label>
);

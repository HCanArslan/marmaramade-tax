import {
  createTaxObligationAction,
  createTaxRuleAction,
  upsertIncomeTaxEstimateAction,
  upsertVatPeriodAction,
} from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
export default async function TaxesPage() {
  await requireAdmin({ redirectTo: "/taxes" });
  const [rules, obligations, vat, estimates] = await Promise.all([
    prisma.taxRuleVersion.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.taxObligation.findMany({ orderBy: { dueDate: "asc" } }),
    prisma.vatPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.incomeTaxEstimate.findMany({
      orderBy: [{ year: "desc" }, { period: "desc" }],
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Estimated, filed, and paid remain separate</p>
        <h1 className="mt-2 text-3xl font-semibold">Taxes</h1>
      </header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Rules and deadlines are editable, effective-dated assumptions. Official
        liability requires current accountant or authority confirmation.
      </div>
      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Tax rule version">
          <form
            action={createTaxRuleAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="name" p="Name" />
            <I n="taxType" p="Tax type" />
            <I n="rate" p="Rate %" r={false} />
            <I n="threshold" p="Threshold" r={false} />
            <I n="currency" p="Currency" r={false} />
            <I n="effectiveFrom" p="Effective" t="date" />
            <I n="source" p="Official/professional source" r={false} />
            <B />
          </form>
        </Box>
        <Box title="Tax obligation">
          <form
            action={createTaxObligationAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="taxType" p="Tax type" />
            <I n="periodStart" p="Period start" t="date" />
            <I n="periodEnd" p="Period end" t="date" />
            <I n="dueDate" p="Due date" t="date" />
            <I n="estimatedAmount" p="Estimated amount" r={false} />
            <I n="currency" p="Currency" v="TRY" />
            <B />
          </form>
        </Box>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="VAT period estimate">
          <form action={upsertVatPeriodAction} className="grid gap-3 sm:grid-cols-2">
            <I n="year" p="Year" t="number" />
            <I n="month" p="Month 1–12" t="number" />
            <I n="outputVat" p="Output VAT TRY" v="0" t="number" />
            <I n="inputVat" p="Input VAT TRY" v="0" t="number" />
            <I n="estimatedPayable" p="Estimated payable TRY" v="0" t="number" />
            <I n="filedPayable" p="Filed amount (optional)" r={false} t="number" />
            <B />
          </form>
        </Box>
        <Box title="Income-tax estimate">
          <form action={upsertIncomeTaxEstimateAction} className="grid gap-3 sm:grid-cols-2">
            <I n="year" p="Year" t="number" />
            <I n="period" p="Period, e.g. 2026-Q3" />
            <I n="taxableBusinessBase" p="Taxable business base" t="number" />
            <I n="estimatedTax" p="Estimated tax" t="number" />
            <I n="currency" p="Currency" v="TRY" />
            <I n="assumptions" p="Accountant-confirmed assumptions" />
            <label className="flex items-center gap-2 text-sm"><input name="salaryIncomeIncluded" type="checkbox" /> Salary income included</label>
            <B />
          </form>
        </Box>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Rows
          title="Rules"
          rows={rules.map(
            (r) =>
              `${r.taxType} · ${r.rate?.toFixed(4) || "no rate"} · ${r.confirmationStatus}`,
          )}
        />
        <Rows
          title="Obligations"
          rows={obligations.map(
            (o) =>
              `${o.taxType} · due ${o.dueDate.toLocaleDateString("en-GB")} · ${o.status} · estimated ${o.estimatedAmount?.toFixed(2) || "—"}`,
          )}
        />
        <Rows
          title="VAT periods"
          rows={vat.map(
            (v) =>
              `${v.year}-${String(v.month).padStart(2, "0")} · estimated ${v.estimatedPayable.toFixed(2)} · filed ${v.filedPayable?.toFixed(2) || "—"}`,
          )}
        />
        <Rows
          title="Income-tax estimates"
          rows={estimates.map(
            (e) =>
              `${e.year} ${e.period} · ${e.estimatedTax.toFixed(2)} ${e.currency} · salary merged: ${e.salaryIncomeIncluded ? "yes" : "no"}`,
          )}
        />
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
    <div className="mt-4">{children}</div>
  </section>
);
const Rows = ({ title, rows }: { title: string; rows: string[] }) => (
  <Box title={title}>
    {rows.map((r, i) => (
      <p className="border-b py-3 text-sm" key={i}>
        {r}
      </p>
    ))}
  </Box>
);
const I = ({
  n,
  p,
  v,
  r = true,
  t = "text",
}: {
  n: string;
  p: string;
  v?: string;
  r?: boolean;
  t?: string;
}) => (
  <input
    className="field"
    name={n}
    placeholder={p}
    defaultValue={v}
    required={r}
    type={t}
  />
);
const B = () => (
  <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
    Save
  </button>
);

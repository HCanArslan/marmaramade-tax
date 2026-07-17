import {
  createTaxObligationAction,
  createTaxRuleAction,
  upsertIncomeTaxEstimateAction,
  upsertVatPeriodAction,
} from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const incomeTariffSource =
  "https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf";
const provisionalTaxSource =
  "https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgecici-vergi-oranlari.pdf";
const exportVatSource = "https://www.gib.gov.tr/mevzuat/kanun/436/teblig/9083";

export default async function TaxesPage() {
  await requireAdmin({ redirectTo: "/taxes" });
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1);
  const [rules, obligations, vat, estimates] = await Promise.all([
    prisma.taxRuleVersion.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { lowerBound: "asc" }],
    }),
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
        <p className="eyebrow">Planning, filing, and payment stay separate</p>
        <h1 className="mt-2 text-3xl font-semibold">Taxes</h1>
        <p className="mt-2 max-w-4xl text-sm text-stone-600">
          The official 2026 rate starters below support planning. They do not
          create a return, debt, or payment. Confirm your registration, filing
          scope, deductible VAT, and deadlines with your accountant.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Guide title="Annual income tax">
          Progressive taxable-income brackets: 15% through TRY 190,000, then 20%
          only on the portion through TRY 400,000. Turnover is not the base.
          <Source href={incomeTariffSource}>GİB 2026 tariff</Source>
        </Guide>
        <Guide title="Provisional income tax">
          The saved 15% rule estimates quarterly taxable business profit. It is
          credited against annual income tax; the Calculator separately holds a
          conservative 20% cash reserve.
          <Source href={provisionalTaxSource}>GİB provisional rates</Source>
        </Guide>
        <Guide title="ETGB export VAT">
          Export treatment is stored as a full exemption with 0 output VAT,
          conditional on ETGB/customs evidence and the declaration closing date.
          <Source href={exportVatSource}>GİB VAT communiqué</Source>
        </Guide>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Salary income is excluded from these business-only planning estimates.
        Do not add a tax obligation until the business opening and deadline are
        confirmed. A 0 output-VAT estimate does not mean the export or filing
        can be omitted.
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Add or version a tax rule">
          <form
            action={createTaxRuleAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="name" p="Rule name" />
            <Select
              n="taxType"
              p="Tax type"
              options={[
                ["ANNUAL_INCOME_TAX", "Annual income tax"],
                ["PROVISIONAL_INCOME_TAX", "Provisional income tax"],
                ["EXPORT_VAT", "ETGB export VAT"],
                ["INCOME_TAX_SAFETY_RESERVE", "Income-tax safety reserve"],
              ]}
            />
            <Select
              n="purpose"
              p="Purpose"
              options={[
                ["LEGAL_RATE", "Legal rate"],
                ["PLANNING_RESERVE", "Calculator planning reserve"],
                ["VAT_TREATMENT", "VAT treatment"],
              ]}
            />
            <Select
              n="calculationMethod"
              p="Calculation"
              options={[
                ["FLAT_RATE", "Flat rate"],
                ["PROGRESSIVE_BRACKET", "Progressive bracket"],
                ["FULL_EXEMPTION_EXPORT", "Full export exemption"],
              ]}
            />
            <I
              n="taxBase"
              p="Tax base, e.g. quarterly taxable profit"
              r={false}
            />
            <I n="rate" p="Rate %" r={false} t="number" />
            <I
              n="lowerBound"
              p="Lower bound TRY (inclusive)"
              r={false}
              t="number"
            />
            <I n="upperBound" p="Upper bound TRY" r={false} t="number" />
            <I n="currency" p="Currency" r={false} v="TRY" />
            <I n="effectiveFrom" p="Effective from" t="date" />
            <I n="evidenceRequirement" p="Required evidence" r={false} />
            <I n="source" p="Official/professional source URL" r={false} />
            <I n="notes" p="Notes" r={false} />
            <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
              <input name="isPlanningDefault" type="checkbox" /> Use this
              planning-reserve rate in Calculator
            </label>
            <B />
          </form>
        </Box>

        <Box title="Confirmed tax obligation">
          <p className="mb-4 text-sm text-stone-600">
            This is a due-date tracker, not an estimate generator. Add a row
            only after your accountant confirms the obligation and deadline.
          </p>
          <form
            action={createTaxObligationAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="taxType" p="Tax type" />
            <I n="periodStart" p="Period start" t="date" />
            <I n="periodEnd" p="Period end" t="date" />
            <I n="dueDate" p="Confirmed due date" t="date" />
            <I n="estimatedAmount" p="Estimated amount" r={false} t="number" />
            <I n="currency" p="Currency" v="TRY" />
            <B />
          </form>
        </Box>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Monthly VAT estimate">
          <p className="mb-4 text-sm text-stone-600">
            Estimated payable is calculated as max(output VAT − deductible input
            VAT, 0) when left blank. Enter only supported input VAT; keep the
            filed amount blank until it is actually filed.
          </p>
          <form
            action={upsertVatPeriodAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="year" p="Calendar year" v={currentYear} t="number" />
            <I n="month" p="Month (1–12)" v={currentMonth} t="number" />
            <I n="outputVat" p="Output VAT TRY" v="0" t="number" />
            <I n="inputVat" p="Deductible input VAT TRY" v="0" t="number" />
            <I
              n="estimatedPayable"
              p="Estimated payable (blank = calculate)"
              r={false}
              t="number"
            />
            <I
              n="filedPayable"
              p="Filed amount (optional)"
              r={false}
              t="number"
            />
            <B />
          </form>
        </Box>

        <Box title="Quarterly provisional income-tax estimate">
          <p className="mb-4 text-sm text-stone-600">
            Leave estimated tax blank to apply the saved 15% provisional-tax
            rule to the taxable business base. This is credited against annual
            income tax and must not be deducted twice.
          </p>
          <form
            action={upsertIncomeTaxEstimateAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="year" p="Calendar year" v={currentYear} t="number" />
            <I n="period" p="Period, e.g. 2026-Q3" />
            <I
              n="taxableBusinessBase"
              p="Quarterly taxable business profit TRY"
              t="number"
            />
            <I
              n="estimatedTax"
              p="Estimated tax (blank = saved rate)"
              r={false}
              t="number"
            />
            <I n="currency" p="Currency" v="TRY" />
            <I n="assumptions" p="Assumptions / accountant notes" />
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input name="salaryIncomeIncluded" type="checkbox" /> Salary
              income included (normally off for this business-only plan)
            </label>
            <B />
          </form>
        </Box>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Saved rules">
          {rules.length === 0 ? (
            <Empty />
          ) : (
            rules.map((rule) => (
              <div className="border-b py-3 text-sm" key={rule.id}>
                <p className="font-medium">{rule.name}</p>
                <p className="mt-1 text-stone-600">
                  {rule.taxType} · {rule.calculationMethod} ·{" "}
                  {rule.rate?.toFixed(2) ?? "no rate"}%
                  {rule.lowerBound !== null || rule.upperBound !== null
                    ? ` · TRY ${rule.lowerBound?.toFixed(0) ?? "0"}–${rule.upperBound?.toFixed(0) ?? "open"}`
                    : ""}
                  {rule.isPlanningDefault ? " · Calculator default" : ""}
                </p>
                {rule.notes ? (
                  <p className="mt-1 text-xs text-stone-500">{rule.notes}</p>
                ) : null}
                {rule.source?.startsWith("http") ? (
                  <Source href={rule.source}>Open source</Source>
                ) : null}
              </div>
            ))
          )}
        </Box>
        <Rows
          title="Confirmed obligations"
          rows={obligations.map(
            (o) =>
              `${o.taxType} · due ${o.dueDate.toLocaleDateString("en-GB")} · ${o.status} · estimated ${o.estimatedAmount?.toFixed(2) ?? "—"}`,
          )}
        />
        <Rows
          title="VAT periods"
          rows={vat.map(
            (v) =>
              `${v.year}-${String(v.month).padStart(2, "0")} · estimated ${v.estimatedPayable.toFixed(2)} TRY · filed ${v.filedPayable?.toFixed(2) ?? "—"}`,
          )}
        />
        <Rows
          title="Income-tax estimates"
          rows={estimates.map(
            (e) =>
              `${e.year} ${e.period} · ${e.estimatedTax.toFixed(2)} ${e.currency} · salary included: ${e.salaryIncomeIncluded ? "yes" : "no"}`,
          )}
        />
      </section>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Box title={title}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((row, index) => (
          <p className="border-b py-3 text-sm" key={index}>
            {row}
          </p>
        ))
      )}
    </Box>
  );
}

function Empty() {
  return <p className="text-sm text-stone-500">No saved records yet.</p>;
}

function Guide({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 text-sm text-stone-600">{children}</div>
    </div>
  );
}

function Source({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="mt-2 block text-xs font-medium text-jade underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children} ↗
    </a>
  );
}

function I({
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
}) {
  return (
    <label className="text-xs text-stone-600">
      {p}
      <input
        aria-label={p}
        className="field mt-1"
        name={n}
        placeholder={p}
        defaultValue={v}
        required={r}
        type={t}
        step={t === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function Select({
  n,
  p,
  options,
}: {
  n: string;
  p: string;
  options: [string, string][];
}) {
  return (
    <label className="text-xs text-stone-600">
      {p}
      <select aria-label={p} className="field mt-1" name={n}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function B() {
  return (
    <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
      Save
    </button>
  );
}

import Link from "next/link";
import {
  createCostAssumptionProfileAction,
  createDocumentRequirementAction,
  saveGeneralSettingAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
const sections = [
  "COMPANY_IDENTITY",
  "LEGAL_OPERATING_PROFILE",
  "PEOPLE_AND_ROLES",
  "ACCOUNTANT",
  "BUSINESS_ADDRESS",
  "BANK_ACCOUNTS",
  "PAYMENT_CARDS",
  "INVOICING",
  "E_DOCUMENT_PROVIDER",
  "CUSTOMS",
  "ETGB",
  "PRODUCT_COSTS",
  "LABOR_PLANNING",
  "EXPENSE_CATEGORIES",
  "OVERHEAD_ALLOCATION",
  "FEE_PROFILES",
  "VAT_PROFILES",
  "INCOME_TAX_PROFILES",
  "SGK_ASSUMPTIONS",
  "EXCHANGE_RATES",
  "SHOP_IDENTITY",
  "SHIPPING_DEFAULT",
  "CUSTOMS_DEFAULT",
  "PACKAGE_DEFAULT",
  "GOAL_DEFAULTS",
  "RESERVES",
  "DOCUMENT_RETENTION",
  "DOCUMENT_REQUIREMENTS",
  "DATA_RETENTION",
  "AUDIT",
  "NOTIFICATIONS",
] as const;
export default async function SettingsPage() {
  await requireAdmin({ redirectTo: "/settings" });
  const [settings, rules, assumption, comparison] = await Promise.all([
    prisma.appSetting.findMany(),
    prisma.documentRequirementRule.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.costAssumptionProfile.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.externalCalculatorComparison.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Forward-looking defaults</p>
        <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-stone-500">
          Historical settings belong in effective-dated profiles or immutable
          snapshots; these values only seed future work.
        </p>
      </header>
      <section className="grid gap-3 md:grid-cols-3">
        <Flow
          title="1. Etsy & Products"
          body="Etsy sync creates or links catalog products and marketplace quantities."
        />
        <Flow
          title="2. Costs & Production"
          body="Product cost versions feed the Calculator; completed units feed physical Inventory."
        />
        <Flow
          title="3. Calculator"
          body="Combines Etsy price, product cost, overhead, exchange rate, quotes, fees, and planning reserves."
        />
        <Flow
          title="4. Goals & Sales Plan"
          body="A saved goal and realistic unit profit determine the sales pace for the current month."
        />
        <Flow
          title="5. Orders"
          body="Confirmed orders freeze the selected versions into immutable cost snapshots."
        />
        <Flow
          title="6. Reports"
          body="Dashboard, cash flow, reconciliation, and reports summarize saved records without inventing values."
        />
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Editable profitability starter</h2>
        <p className="mt-1 text-sm text-stone-500">
          Saving creates a new effective-dated version. It never rewrites old
          orders or calculation snapshots. Dedicated pages remain the source for
          individual product, shipping, customs, Etsy-fee, and overhead
          versions.
        </p>
        <form
          action={createCostAssumptionProfileAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <Field
            name="name"
            label="Profile name"
            value={assumption?.name ?? "TR to US — $149 starter"}
          />
          <Field
            name="saleValueUsd"
            label="Sale / customs value USD"
            type="number"
            value={assumption?.saleValueUsd.toString() ?? "149"}
          />
          <Field
            name="productCostUsd"
            label="Product cost USD"
            type="number"
            value={assumption?.productCostUsd.toString() ?? "20"}
          />
          <Field
            name="packagingTry"
            label="Packaging TRY"
            type="number"
            value={assumption?.packagingTry.toString() ?? "300"}
          />
          <Field
            name="domesticTransferTry"
            label="Domestic transfer TRY"
            type="number"
            value={assumption?.domesticTransferTry.toString() ?? "0"}
          />
          <Field
            name="internationalShippingUsd"
            label="International transport USD"
            type="number"
            value={assumption?.internationalShippingUsd.toString() ?? "50.83"}
          />
          <Field
            name="insuranceUsd"
            label="Insurance USD"
            type="number"
            value={assumption?.insuranceUsd.toString() ?? "0"}
          />
          <Field
            name="otherCarrierSurchargeUsd"
            label="Other carrier surcharge USD"
            type="number"
            value={assumption?.otherCarrierSurchargeUsd.toString() ?? "0"}
          />
          <Field
            name="customsEstimateUsd"
            label="Customs estimate USD"
            type="number"
            value={assumption?.customsEstimateUsd.toString() ?? "28.79"}
          />
          <Field
            name="estimatedEtgbFeeUsd"
            label="ETGB estimate USD (0 = unknown)"
            type="number"
            value={assumption?.estimatedEtgbFeeUsd?.toString() ?? "0"}
          />
          <Field
            name="etsyPlusMonthlyTry"
            label="Etsy Plus monthly TRY"
            type="number"
            value={assumption?.etsyPlusMonthlyTry.toString() ?? "500"}
          />
          <Field
            name="companyPackageMonthlyTry"
            label="Company/accounting monthly TRY"
            type="number"
            value={assumption?.companyPackageMonthlyTry.toString() ?? "4500"}
          />
          <Field
            name="source"
            label="Source"
            value={assumption?.source ?? "User-provided starter assumptions"}
          />
          <Field
            name="sourceDate"
            label="Source date"
            type="date"
            value={today}
          />
          <Field
            name="effectiveFrom"
            label="Effective from"
            type="date"
            value={today}
          />
          <Field
            name="notes"
            label="Notes (optional)"
            required={false}
            value={
              assumption?.notes ??
              "Editable planning starter; not an actual order."
            }
          />
          <div className="md:col-span-4 mt-2 border-t pt-4">
            <h3 className="font-semibold">Profitability intelligence</h3>
            <p className="mt-1 text-xs text-stone-500">
              Global economic-labour fallback, minimum targets, grade
              boundaries, and risk thresholds. A product cost version-specific
              rate overrides the global rate.
            </p>
          </div>
          {[
            [
              "globalEconomicHourlyRateTry",
              "Global economic hourly TRY",
              assumption?.globalEconomicHourlyRateTry?.toString() ?? "",
            ],
            [
              "minimumCashProfitUsd",
              "Minimum cash profit USD",
              assumption?.minimumCashProfitUsd.toString() ?? "15",
            ],
            [
              "minimumEconomicProfitUsd",
              "Minimum economic profit USD",
              assumption?.minimumEconomicProfitUsd.toString() ?? "15",
            ],
            [
              "minimumCashMarginPercent",
              "Minimum cash margin %",
              assumption?.minimumCashMarginPercent.toString() ?? "10",
            ],
            [
              "minimumEconomicMarginPercent",
              "Minimum economic margin %",
              assumption?.minimumEconomicMarginPercent.toString() ?? "10",
            ],
            [
              "minimumCashProfitPerHourUsd",
              "Minimum cash profit/hour USD",
              assumption?.minimumCashProfitPerHourUsd.toString() ?? "10",
            ],
            [
              "minimumEconomicProfitPerHourUsd",
              "Minimum economic profit/hour USD",
              assumption?.minimumEconomicProfitPerHourUsd.toString() ?? "10",
            ],
            [
              "gradeAProfitUsd",
              "Grade A profit USD",
              assumption?.gradeAProfitUsd.toString() ?? "50",
            ],
            [
              "gradeAMarginPercent",
              "Grade A margin %",
              assumption?.gradeAMarginPercent.toString() ?? "25",
            ],
            [
              "gradeBProfitUsd",
              "Grade B profit USD",
              assumption?.gradeBProfitUsd.toString() ?? "30",
            ],
            [
              "gradeBMarginPercent",
              "Grade B margin %",
              assumption?.gradeBMarginPercent.toString() ?? "15",
            ],
            [
              "gradeCProfitUsd",
              "Grade C profit USD",
              assumption?.gradeCProfitUsd.toString() ?? "20",
            ],
            [
              "gradeCMarginPercent",
              "Grade C margin %",
              assumption?.gradeCMarginPercent.toString() ?? "10",
            ],
            [
              "criticalMarginPercent",
              "Critical margin below %",
              assumption?.criticalMarginPercent.toString() ?? "5",
            ],
            [
              "lowProfitUsd",
              "Low profit below USD",
              assumption?.lowProfitUsd.toString() ?? "15",
            ],
            [
              "shippingHeavyPercent",
              "Shipping-heavy above %",
              assumption?.shippingHeavyPercent.toString() ?? "25",
            ],
            [
              "overheadHeavyPercent",
              "Overhead-heavy above %",
              assumption?.overheadHeavyPercent.toString() ?? "20",
            ],
          ].map(([name, label, value]) => (
            <Field
              key={name}
              name={name}
              label={label}
              type="number"
              value={value}
              required={name !== "globalEconomicHourlyRateTry"}
            />
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeCustomsInSellerProfit"
              defaultChecked={assumption?.includeCustomsInSellerProfit ?? false}
            />
            Seller pays customs in planning
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeEtgbInSellerProfit"
              defaultChecked={assumption?.includeEtgbInSellerProfit ?? false}
            />
            Deduct confirmed ETGB cost
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
            Save new assumption version
          </button>
        </form>
        {comparison && (
          <div className="mt-5 rounded-xl border bg-stone-50 p-4 text-sm">
            <p className="font-medium">External calculator comparison only</p>
            <p className="mt-1 text-stone-500">
              {comparison.provider}: marketplace{" "}
              {comparison.marketplaceCommissionUsd.toFixed(3)} USD, payment{" "}
              {comparison.paymentCommissionUsd.toFixed(3)} USD, other{" "}
              {comparison.otherCommissionUsd.toFixed(3)} USD. This snapshot is
              never added to the Etsy profile or deducted again.
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["Products & packaging", "/products"],
            ["International shipping", "/shipping"],
            ["Customs estimates & actuals", "/customs"],
            ["ETGB status", "/customs-etgb"],
            ["Etsy fees", "/fees"],
            ["Monthly overhead", "/business"],
            ["Calculator", "/calculator"],
          ].map(([label, href]) => (
            <Link
              className="rounded-xl border px-3 py-2 text-sm"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">
          Advanced: free-form future-work notes
        </summary>
        <p className="mt-2 text-sm text-stone-500">
          These generic notes do not currently change Calculator or reporting
          formulas. Use the dedicated pages for operational values.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sections.map((key) => (
            <form
              action={saveGeneralSettingAction}
              className="card p-5"
              key={key}
            >
              <input type="hidden" name="key" value={key} />
              <h2 className="font-semibold">{key.replaceAll("_", " ")}</h2>
              <textarea
                className="field mt-3 min-h-24"
                name="value"
                defaultValue={map.get(key) || ""}
                required
                placeholder="Enter an explicit default, source, and review date."
              />
              <button className="mt-3 rounded-xl bg-jade px-4 py-2 text-sm text-white">
                Save default
              </button>
            </form>
          ))}
        </div>
      </details>
      <section className="card p-5">
        <h2 className="font-semibold">Security and integrations</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="rounded-xl border px-3 py-2 text-sm"
            href="/settings/security"
          >
            Security
          </Link>
          <Link
            className="rounded-xl border px-3 py-2 text-sm"
            href="/settings/etsy"
          >
            Read-only Etsy
          </Link>
          <Link
            className="rounded-xl border px-3 py-2 text-sm"
            href="/settings/shipentegra"
          >
            ShipEntegra
          </Link>
          <Link
            className="rounded-xl border px-3 py-2 text-sm"
            href="/business"
          >
            Legal profiles
          </Link>
          <Link className="rounded-xl border px-3 py-2 text-sm" href="/fees">
            Fee profiles
          </Link>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Conditional document requirements</h2>
        <form
          action={createDocumentRequirementAction}
          className="mt-4 grid gap-3 sm:grid-cols-6"
        >
          <Field name="name" label="Rule name" placeholder="US DDP ETGB" />
          <label className="text-xs text-stone-500">
            Document category
            <select className="field mt-1" name="category">
              <option>ETGB</option>
              <option>CUSTOMS_CALCULATION</option>
              <option>SHIPENTEGRA_INVOICE</option>
              <option>BANK_WITHHOLDING</option>
              <option>RETURN_DOCUMENT</option>
            </select>
          </label>
          <Field
            name="destinationCountry"
            label="Destination country (optional)"
            required={false}
          />
          <Field name="incoterm" label="Incoterm (optional)" required={false} />
          <Field name="carrier" label="Carrier (optional)" required={false} />
          <Field name="effectiveFrom" label="Effective from" type="date" />
          <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
            Add rule
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {rules.map((r) => (
            <span className="pill" key={r.id}>
              {r.name} · {r.category} · {r.destinationCountry || "all"}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Flow({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">{body}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = true,
  value,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        className="field mt-1"
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={value}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

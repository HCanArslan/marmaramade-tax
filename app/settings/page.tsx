import Link from "next/link";
import {
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
  const [settings, rules] = await Promise.all([
    prisma.appSetting.findMany(),
    prisma.documentRequirementRule.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  const map = new Map(settings.map((s) => [s.key, s.value]));
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
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
      />
    </label>
  );
}

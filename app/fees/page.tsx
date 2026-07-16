import {
  createFeeProfileAction,
  createFeeRuleAction,
  createOfficialEtsyTurkeyFeeProfileAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
export default async function FeesPage() {
  await requireAdmin({ redirectTo: "/fees" });
  const profiles = await prisma.feeProfile.findMany({
    include: { rules: true },
    orderBy: { effectiveFrom: "desc" },
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Admin-approved effective dates</p>
        <h1 className="mt-2 text-3xl font-semibold">Etsy fee profiles</h1>
        <p className="mt-2 text-sm text-stone-500">
          Actual ledger entries can suggest a change but never rewrite these
          planning versions.
        </p>
      </header>
      <section className="card border-emerald-200 bg-emerald-50 p-5">
        <p className="eyebrow text-emerald-700">Recommended main version</p>
        <h2 className="mt-2 text-lg font-semibold">
          Etsy Türkiye official planning profile
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-emerald-900/75">
          Creates the current core rules: $0.20 listing, 6.5% transaction, 6.5%
          + 14 TRY payment processing, 1.67% regulatory operating fee, and
          conditional currency-conversion, Offsite Ads, and low-deposit fees.
          VAT eligibility is recorded at 20%, but whether Etsy charges it still
          follows your submitted VAT ID and accountant-confirmed treatment.
        </p>
        <form
          action={createOfficialEtsyTurkeyFeeProfileAction}
          className="mt-4"
        >
          <button className="rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white">
            Create main Etsy Türkiye version
          </button>
        </form>
      </section>
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">
          Advanced: create a custom fee profile
        </summary>
        <section className="card p-5">
          <h2 className="font-semibold">New profile and first rule</h2>
          <form
            action={createFeeProfileAction}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            {[
              ["name", "Profile name", "Etsy Türkiye"],
              ["country", "Country", "TR"],
              ["listingCurrency", "Listing currency", "USD"],
              ["payoutCurrency", "Payout currency", "TRY"],
              ["ruleName", "Rule name", "Transaction fee"],
              ["category", "Category", "TRANSACTION"],
              ["percentageRate", "Percentage %", "6.5"],
              ["fixedAmount", "Fixed amount", "0"],
              ["fixedCurrency", "Fixed currency", "USD"],
              ["calculationBase", "Calculation base", "GROSS_SELLER_REVENUE"],
              ["vatRate", "VAT %", "20"],
              ["sourceUrl", "Source URL", ""],
              ["notes", "Notes", ""],
            ].map(([name, label, value]) => (
              <label className="text-xs text-stone-500" key={name}>
                {label}
                <input
                  className="field mt-1"
                  name={name}
                  defaultValue={value}
                  required={!["sourceUrl", "notes"].includes(name)}
                  type={
                    ["percentageRate", "fixedAmount", "vatRate"].includes(name)
                      ? "number"
                      : "text"
                  }
                  step="0.01"
                />
              </label>
            ))}
            <label className="text-xs text-stone-500">
              Effective from
              <input
                className="field mt-1"
                name="effectiveFrom"
                type="date"
                required
              />
            </label>
            <label className="text-xs text-stone-500">
              Calculation type
              <select className="field mt-1" name="calculationType">
                <option>PERCENTAGE</option>
                <option>FIXED</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="vatApplicable" />
              VAT applicable
            </label>
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Create version
            </button>
          </form>
        </section>
      </details>
      {profiles.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold">Add rule to existing profile</h2>
          <form
            action={createFeeRuleAction}
            className="mt-4 grid gap-3 md:grid-cols-5"
          >
            <select className="field" name="feeProfileId">
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {[
              ["name", "Rule name"],
              ["category", "Category"],
              ["percentageRate", "Percentage"],
              ["fixedAmount", "Fixed amount"],
              ["fixedCurrency", "Currency"],
              ["calculationBase", "Base"],
              ["vatRate", "VAT rate"],
              ["sourceUrl", "Source URL"],
              ["notes", "Notes"],
            ].map(([n, l]) => (
              <input
                aria-label={l}
                className="field"
                name={n}
                defaultValue={
                  ["percentageRate", "fixedAmount", "vatRate"].includes(n)
                    ? "0"
                    : ""
                }
                required={!["sourceUrl", "notes"].includes(n)}
                type={
                  ["percentageRate", "fixedAmount", "vatRate"].includes(n)
                    ? "number"
                    : "text"
                }
                step="0.01"
                key={n}
              />
            ))}
            <select className="field" name="calculationType">
              <option>PERCENTAGE</option>
              <option>FIXED</option>
            </select>
            <input
              className="field"
              name="effectiveFrom"
              type="date"
              required
            />
            <label className="flex items-center gap-2 text-xs">
              <input name="vatApplicable" type="checkbox" />
              VAT applicable
            </label>
            <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
              Add rule
            </button>
          </form>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-2">
        {profiles.map((p) => (
          <article className="card p-5" key={p.id}>
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-xs text-stone-500">
                  {p.country} · effective{" "}
                  {p.effectiveFrom.toLocaleDateString("en-GB")}
                </p>
              </div>
              <span className="pill">{p.rules.length} rules</span>
            </div>
            <div className="mt-4 divide-y">
              {p.rules.map((r) => (
                <div className="flex justify-between py-3 text-sm" key={r.id}>
                  <span>
                    {r.name}
                    <small className="block text-stone-400">
                      {r.calculationBase}
                    </small>
                  </span>
                  <strong>
                    {r.percentageRate
                      ? `${r.percentageRate.toString()}%`
                      : `${r.fixedAmount?.toString() || 0} ${r.fixedCurrency || ""}`}
                  </strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

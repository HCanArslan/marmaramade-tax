import {
  createLegalProfileAction,
  saveMonthlyOverheadAction,
} from "@/app/actions/ledger";
import { legalProfileWarnings } from "@/lib/compliance";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function BusinessPage() {
  await requireAdmin({ redirectTo: "/business" });
  const profiles = await prisma.legalOperatingProfile.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">
          Prospective legal structure · immutable history
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Legal operating profiles
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Create a new effective-dated version when the operating structure
          changes. Historical orders retain their selected profile.
        </p>
      </header>
      <section className="card p-5">
        <h2 className="font-semibold">New profile version</h2>
        <form
          action={createLegalProfileAction}
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          {[
            ["name", "Version name", "MarmaraMade"],
            ["legalSellerName", "Legal seller", "Selda"],
            ["makerName", "Maker", "Selda"],
            ["etsyAccountHolderName", "Etsy account holder", "Selda"],
            ["etsyTaxpayerName", "Etsy taxpayer", "Selda"],
            ["bankAccountHolderName", "Bank holder", "Selda"],
            ["exporterName", "Exporter", "Selda"],
            ["shipEntegraAccountHolderName", "ShipEntegra holder", "Selda"],
            ["businessStatus", "Business status", "PLANNING"],
            [
              "sellerFeeVatTreatment",
              "Seller-fee VAT treatment",
              "UNKNOWN_PENDING_CONFIRMATION",
            ],
            ["certificateNumber", "Certificate number", ""],
            ["expectedMonthlyOrders", "Expected monthly orders", "10"],
            ["incomeTaxReserveRate", "Income tax reserve %", "0"],
            ["withholdingTaxRate", "Withholding %", "0"],
            ["notes", "Notes", ""],
          ].map(([name, label, value]) => (
            <label className="text-xs text-stone-500" key={name}>
              {label}
              <input
                className="field mt-1"
                name={name}
                defaultValue={value}
                required={!["certificateNumber", "notes"].includes(name)}
                type={
                  [
                    "expectedMonthlyOrders",
                    "incomeTaxReserveRate",
                    "withholdingTaxRate",
                  ].includes(name)
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
          <Select
            name="operatingMode"
            label="Operating mode"
            options={[
              "ARTISAN_TAX_EXEMPTION",
              "SOLE_PROPRIETORSHIP",
              "LIMITED_COMPANY",
              "PLANNING_ONLY",
            ]}
          />
          <Select
            name="legalSellerType"
            label="Seller type"
            options={[
              "TAX_EXEMPT_ARTISAN",
              "INDIVIDUAL",
              "SOLE_PROPRIETORSHIP",
              "COMPANY",
            ]}
          />
          <Select
            name="orphanPensionRiskStatus"
            label="Pension risk"
            options={[
              "UNKNOWN",
              "UNDER_REVIEW",
              "CONFIRMED_NO_IMPACT",
              "CONFIRMED_IMPACT",
              "MANUAL_REVIEW_REQUIRED",
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input name="artisanTaxExemptionEnabled" type="checkbox" />
            Artisan exemption enabled
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm font-medium text-white">
            Create version
          </button>
        </form>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Sole-proprietorship monthly overhead</h2>
        <p className="mt-1 text-xs text-stone-500">
          Manual professional-confirmed planning inputs; no SGK consequence is
          inferred.
        </p>
        <form
          action={saveMonthlyOverheadAction}
          className="mt-4 grid gap-3 sm:grid-cols-4"
        >
          <input className="field" name="month" type="date" required />
          {[
            "accountantTry",
            "socialSecurityTry",
            "softwareTry",
            "bankingTry",
            "officeTry",
            "otherTry",
          ].map((n) => (
            <input
              aria-label={n}
              className="field"
              name={n}
              type="number"
              step="0.01"
              defaultValue="0"
              key={n}
            />
          ))}
          <input
            className="field"
            name="notes"
            placeholder="Professional determination notes"
          />
          <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
            Save month
          </button>
        </form>
      </section>
      <div className="grid gap-4">
        {profiles.map((p) => {
          const warnings = legalProfileWarnings(p);
          return (
            <section className="card p-5" key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-xs text-stone-500">
                    Effective {p.effectiveFrom.toLocaleDateString("en-GB")} ·{" "}
                    {p.operatingMode.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="pill">
                  {p.legalSellerType.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <p>
                  <span className="text-stone-400">Seller</span>
                  <br />
                  {p.legalSellerName}
                </p>
                <p>
                  <span className="text-stone-400">Maker</span>
                  <br />
                  {p.makerName}
                </p>
                <p>
                  <span className="text-stone-400">Bank holder</span>
                  <br />
                  {p.bankAccountHolderName}
                </p>
                <p>
                  <span className="text-stone-400">Exporter</span>
                  <br />
                  {p.exporterName}
                </p>
              </div>
              {warnings.map((w) => (
                <p
                  className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
                  key={w}
                >
                  {w}
                </p>
              ))}
            </section>
          );
        })}
        {!profiles.length && (
          <div className="card p-8 text-center text-sm text-stone-500">
            Create the first planning profile. No legal consequence is inferred.
          </div>
        )}
      </div>
    </div>
  );
}
function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <select className="field mt-1" name={name}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

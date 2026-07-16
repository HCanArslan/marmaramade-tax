import {
  createLegalProfileAction,
  saveMonthlyOverheadAction,
} from "@/app/actions/ledger";
import { legalProfileWarnings } from "@/lib/compliance";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  MAKER_STATUS_WARNING,
  businessConsistencyWarnings,
} from "@/lib/business/consistency";
import { createBusinessPersonAction } from "@/app/actions/operations";

export default async function BusinessPage() {
  await requireAdmin({ redirectTo: "/business" });
  const [profiles, businessProfile, people] = await Promise.all([
    prisma.legalOperatingProfile.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.businessProfile.findFirst({
      where: { active: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.businessPerson.findMany({
      where: { active: true },
      include: {
        roles: { where: { effectiveTo: null }, orderBy: { role: "asc" } },
      },
      orderBy: { fullName: "asc" },
    }),
  ]);
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
      {businessProfile && (
        <section className="card p-5">
          <p className="eyebrow">Active legal structure</p>
          <h2 className="mt-2 text-xl font-semibold">
            {businessProfile.legalName}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {businessProfile.brandName} ·{" "}
            {businessProfile.status.replaceAll("_", " ")}
          </p>
          {businessConsistencyWarnings(businessProfile).map((warning) => (
            <p
              className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </section>
      )}
      <section className="card p-5">
        <h2 className="font-semibold">Add person and role</h2>
        <p className="mt-1 text-xs text-stone-500">
          Roles record operational responsibility; they do not infer employment,
          tax, SGK, or ownership status.
        </p>
        <form
          action={createBusinessPersonAction}
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input
            className="field"
            name="fullName"
            placeholder="Full name"
            required
          />
          <input
            className="field"
            name="displayName"
            placeholder="Display name (optional)"
          />
          <input
            className="field"
            name="relationshipToOwner"
            placeholder="Relationship to owner (optional)"
          />
          <select className="field" name="role" required>
            {[
              "LEGAL_OWNER",
              "BUSINESS_OPERATOR",
              "ETSY_ACCOUNT_HOLDER",
              "EXPORTER",
              "INVOICE_ISSUER",
              "BANK_ACCOUNT_HOLDER",
              "MAKER",
              "DESIGNER",
              "PHOTOGRAPHER",
              "SHOP_MANAGER",
              "PACKAGING_OPERATOR",
              "CUSTOMER_SERVICE",
              "EMPLOYEE",
              "SUPPLIER",
              "FAMILY_CONTRIBUTOR",
              "ACCOUNTANT",
              "OTHER",
            ].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <input
            className="field"
            name="notes"
            placeholder="Notes (optional)"
          />
          <button className="rounded-xl bg-jade px-4 py-2 text-sm font-medium text-white">
            Add person
          </button>
        </form>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {people.map((person) => (
          <div className="card p-5" key={person.id}>
            <h2 className="font-semibold">{person.fullName}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {person.roles.map((role) => (
                <span className="pill" key={role.id}>
                  {role.role.replaceAll("_", " ")}
                </span>
              ))}
            </div>
            {person.fullName === "Selda" && (
              <p className="mt-3 text-xs leading-5 text-amber-800">
                {MAKER_STATUS_WARNING}
              </p>
            )}
          </div>
        ))}
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">New profile version</h2>
        <form
          action={createLegalProfileAction}
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          {[
            ["name", "Version name", "MarmaraMade"],
            [
              "legalSellerName",
              "Legal seller",
              "Hamit Can Arslan Sole Proprietorship",
            ],
            ["makerName", "Maker", "Selda"],
            [
              "etsyAccountHolderName",
              "Etsy account holder",
              "Hamit Can Arslan",
            ],
            ["etsyTaxpayerName", "Etsy taxpayer", "Hamit Can Arslan"],
            ["bankAccountHolderName", "Bank holder", "Hamit Can Arslan"],
            ["exporterName", "Exporter", "Hamit Can Arslan"],
            [
              "shipEntegraAccountHolderName",
              "ShipEntegra holder",
              "Hamit Can Arslan",
            ],
            ["businessStatus", "Business status", "FORMATION_IN_PROGRESS"],
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
              "ARCHIVED",
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
        <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">
          Enter recurring business costs for one month. The Calculator divides
          their total by expected monthly orders. Leave an amount at zero only
          when that category genuinely has no cost; this is planning data and
          does not determine deductibility or SGK treatment.
        </p>
        <form
          action={saveMonthlyOverheadAction}
          className="mt-4 grid gap-3 sm:grid-cols-4"
        >
          <label className="text-xs text-stone-500">
            Month
            <input className="field mt-1" name="month" type="month" required />
          </label>
          {[
            ["accountantTry", "Accountant / bookkeeping (TRY)"],
            ["socialSecurityTry", "SGK / Bağ-Kur planning amount (TRY)"],
            ["softwareTry", "Software subscriptions (TRY)"],
            ["bankingTry", "Banking and payment costs (TRY)"],
            ["officeTry", "Office / workspace costs (TRY)"],
            ["otherTry", "Other recurring overhead (TRY)"],
            ["etsyPlusTry", "Etsy Plus (TRY)", "500"],
          ].map(([name, label]) => (
            <label className="text-xs text-stone-500" key={name}>
              {label}
              <input
                className="field mt-1"
                name={name}
                type="number"
                min="0"
                step="0.01"
                defaultValue={name === "etsyPlusTry" ? "500" : "0"}
              />
            </label>
          ))}
          <label className="text-xs text-stone-500">
            Allocation method
            <select
              className="field mt-1"
              name="allocationMethod"
              defaultValue="EXPECTED_SALES"
            >
              <option>EXPECTED_SALES</option>
              <option>ACTUAL_SALES</option>
              <option>NONE</option>
              <option>MANUAL_PER_ORDER</option>
              <option>REVENUE_WEIGHTED</option>
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Expected monthly sales
            <input
              className="field mt-1"
              name="expectedSales"
              type="number"
              min="1"
              defaultValue="10"
            />
          </label>
          <label className="text-xs text-stone-500">
            Actual completed sales (optional)
            <input
              className="field mt-1"
              name="actualSales"
              type="number"
              min="0"
              defaultValue="0"
            />
          </label>
          <label className="text-xs text-stone-500">
            Manual overhead per order (TRY)
            <input
              className="field mt-1"
              name="manualPerOrderTry"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
            />
          </label>
          <label className="text-xs text-stone-500">
            Source or professional notes (optional)
            <input className="field mt-1" name="notes" />
          </label>
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

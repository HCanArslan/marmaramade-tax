import {
  createTaxLimitAction,
  createWithholdingAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { exemptionLimitStatus } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";

export default async function TaxExemptionPage() {
  await requireAdmin({ redirectTo: "/tax-exemption" });
  const year = new Date().getFullYear();
  const [limit, profiles, records, receipts] = await Promise.all([
    prisma.taxExemptionLimitVersion.findFirst({
      where: { year },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.legalOperatingProfile.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.withholdingRecord.findMany({
      where: {
        recordDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      orderBy: { recordDate: "desc" },
    }),
    prisma.etsyReceipt.aggregate({
      where: {
        sourceCreatedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      _sum: { totalAmount: true },
    }),
  ]);
  const gross = Number(receipts._sum.totalAmount || 0);
  const status = exemptionLimitStatus(
    gross,
    Number(limit?.annualLimitTry || 0),
  );
  const activeProfile = profiles[0];
  const exemptionEnabled = activeProfile?.artisanTaxExemptionEnabled ?? false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Evidence-based monitoring</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Artisan exemption & withholding
        </h1>
      </header>

      <section
        className={`rounded-xl border p-5 text-sm ${
          exemptionEnabled
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <h2 className="font-semibold">
          {exemptionEnabled
            ? "Artisan exemption is enabled in the active legal profile"
            : "Do not fill an artisan-exemption limit yet"}
        </h2>
        <p className="mt-2 max-w-3xl leading-6">
          Your active profile is {activeProfile?.name ?? "not configured"}. This
          page stores evidence; it does not decide eligibility. Leave these
          fields empty until your accountant or a written authority response
          confirms that the exemption applies and supplies the year-specific
          limit and withholding basis.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Card label="Gross imported revenue" value={`₺${gross.toFixed(2)}`} />
        <Card
          label="Confirmed annual limit"
          value={limit ? `₺${limit.annualLimitTry.toFixed(2)}` : "Not entered"}
        />
        <Card
          label="Limit used"
          value={limit ? `${status.percent.toFixed(1)}%` : "Not calculated"}
        />
        <Card
          label="Actual withholding records"
          value={String(records.length)}
        />
      </section>

      {status.message && limit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {status.message}
        </div>
      )}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">
          Advanced: record accountant-confirmed exemption evidence
        </summary>
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-semibold">Annual exemption limit</h2>
            <p className="mt-1 text-sm text-stone-500">
              Create one version per year from a dated source.
            </p>
            <form
              action={createTaxLimitAction}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <Field label="Calendar year" name="year" value={String(year)} />
              <Field
                label="Confirmed annual limit (TRY)"
                name="annualLimitTry"
                type="number"
              />
              <Field label="Effective from" name="effectiveFrom" type="date" />
              <Field label="Source URL or accountant reference" name="source" />
              <Field label="Notes (optional)" name="notes" required={false} />
              <SaveButton label="Save limit version" />
            </form>
          </section>

          <section>
            <h2 className="font-semibold">Actual withholding record</h2>
            <p className="mt-1 text-sm text-stone-500">
              Record a real bank or accounting event, not a forecast.
            </p>
            <form
              action={createWithholdingAction}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <label className="text-xs text-stone-500">
                Legal operating profile
                <select className="field mt-1" name="legalOperatingProfileId">
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Record date" name="recordDate" type="date" />
              <Field
                label="Expected withholding rate (%)"
                name="expectedWithholdingRate"
                type="number"
              />
              <Field
                label="Expected withholding (TRY)"
                name="expectedWithholdingTry"
                type="number"
              />
              <Field
                label="Actual withholding shown by bank (TRY)"
                name="actualWithholdingTry"
                type="number"
              />
              <Field
                label="Confirmed withholding base (TRY)"
                name="withholdingBaseTry"
                type="number"
              />
              <label className="text-xs text-stone-500">
                Confirmed base type
                <select className="field mt-1" name="withholdingBaseType">
                  <option value="UNKNOWN_PENDING_CONFIRMATION">
                    Not confirmed
                  </option>
                  <option value="BANK_NET_PAYOUT">Bank net payout</option>
                  <option value="ETSY_GROSS_REVENUE">Etsy gross revenue</option>
                  <option value="MANUAL">Other confirmed base</option>
                </select>
              </label>
              <Field
                label="Verification status"
                name="verificationStatus"
                value="PENDING"
              />
              <Field
                label="Bank reference (optional)"
                name="bankReference"
                required={false}
              />
              <Field label="Notes (optional)" name="notes" required={false} />
              <SaveButton label="Save record" />
            </form>
          </section>
        </div>
      </details>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        aria-label={label}
        className="field mt-1"
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function SaveButton({ label }: { label: string }) {
  return (
    <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
      {label}
    </button>
  );
}

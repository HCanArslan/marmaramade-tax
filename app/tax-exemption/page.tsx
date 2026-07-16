import {
  createTaxLimitAction,
  createWithholdingAction,
} from "@/app/actions/ledger";
import { exemptionLimitStatus } from "@/lib/compliance";
import { requireAdmin } from "@/lib/auth/require-admin";
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
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">
          Configurable monitoring · no automatic legal conclusion
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Artisan exemption & withholding
        </h1>
      </header>
      <section className="grid gap-3 sm:grid-cols-4">
        <Card label="Gross imported revenue" value={`₺${gross.toFixed(2)}`} />
        <Card
          label="Annual entered limit"
          value={limit ? `₺${limit.annualLimitTry.toFixed(2)}` : "Not entered"}
        />
        <Card label="Limit used" value={`${status.percent.toFixed(1)}%`} />
        <Card label="Withholding records" value={String(records.length)} />
      </section>
      {status.message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {status.message}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">New annual limit version</h2>
          <form
            action={createTaxLimitAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Input name="year" value={String(year)} />
            <Input name="annualLimitTry" value="0" />
            <Input name="effectiveFrom" type="date" />
            <Input name="source" />
            <Input name="notes" required={false} />
            <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
              Save limit version
            </button>
          </form>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Withholding record</h2>
          <form
            action={createWithholdingAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <select className="field" name="legalOperatingProfileId">
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input name="recordDate" type="date" />
            <Input name="expectedWithholdingRate" value="0" />
            <Input name="expectedWithholdingTry" value="0" />
            <Input name="actualWithholdingTry" value="0" />
            <Input name="withholdingBaseTry" value="0" />
            <select className="field" name="withholdingBaseType">
              <option>UNKNOWN_PENDING_CONFIRMATION</option>
              <option>BANK_NET_PAYOUT</option>
              <option>ETSY_GROSS_REVENUE</option>
              <option>MANUAL</option>
            </select>
            <Input name="verificationStatus" value="PENDING" />
            <Input name="bankReference" required={false} />
            <Input name="notes" required={false} />
            <button className="rounded-xl bg-jade px-3 py-2 text-sm text-white">
              Save record
            </button>
          </form>
        </section>
      </div>
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
function Input({
  name,
  value,
  type = "text",
  required = true,
}: {
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      aria-label={name}
      className="field"
      name={name}
      defaultValue={value}
      type={type}
      required={required}
      step="0.01"
    />
  );
}

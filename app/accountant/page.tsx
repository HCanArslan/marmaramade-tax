import {
  createAccountantPeriodAction,
  updateAccountantPeriodStatusAction,
} from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
const checklist = [
  "Sales invoices",
  "Etsy order and fee summaries",
  "Etsy seller-fee VAT",
  "Etsy payout statements",
  "Bank and card statements",
  "Purchase/material/packaging documents",
  "ShipEntegra invoices and shipping receipts",
  "ETGB and customs documents",
  "Refunds",
  "Fixed assets",
  "Tax and SGK receipts",
  "Owner transaction summary",
];
export default async function AccountantPage() {
  await requireAdmin({ redirectTo: "/accountant" });
  const periods = await prisma.accountantPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Monthly evidence package</p>
        <h1 className="mt-2 text-3xl font-semibold">Accountant handoff</h1>
      </header>
      <section className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="card p-5">
          <h2 className="font-semibold">Open period</h2>
          <form
            action={createAccountantPeriodAction}
            className="mt-4 grid gap-3"
          >
            <I n="year" p="Year" v={String(new Date().getFullYear())} />
            <I n="month" p="Month" />
            <I
              n="expectedDocuments"
              p="Expected documents"
              v={String(checklist.length)}
            />
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Save period
            </button>
          </form>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Standard checklist</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <p className="rounded-lg border p-3 text-sm" key={item}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-3">
        {periods.map((p) => (
          <form
            action={updateAccountantPeriodStatusAction}
            className="card grid gap-3 p-5 md:grid-cols-[1fr_220px_1fr_auto] md:items-center"
            key={p.id}
          >
            <input type="hidden" name="id" value={p.id} />
            <div>
              <h2 className="font-semibold">
                {p.year}-{String(p.month).padStart(2, "0")}
              </h2>
              <p className="text-xs text-stone-500">
                {p.uploadedDocuments}/{p.expectedDocuments} uploaded ·{" "}
                {p.missingDocuments} missing
              </p>
            </div>
            <select className="field" name="status" defaultValue={p.status}>
              {[
                "OPEN",
                "COLLECTING",
                "READY",
                "SENT_TO_ACCOUNTANT",
                "ACCOUNTANT_REVIEW",
                "COMPLETED",
                "LOCKED",
                "REOPENED",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input
              className="field"
              name="accountantNotes"
              defaultValue={p.accountantNotes || ""}
              placeholder="Notes"
            />
            <button className="rounded-xl border px-3 py-2 text-sm">
              Update
            </button>
          </form>
        ))}
      </section>
    </div>
  );
}
const I = ({ n, p, v }: { n: string; p: string; v?: string }) => (
  <label className="text-xs text-stone-500">
    {p}
    <input className="field mt-1" name={n} defaultValue={v} required />
  </label>
);

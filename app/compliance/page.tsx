import { createComplianceCaseAction } from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const setup = [
  "SGK orphan-pension confirmation",
  "4/b / Bağ-Kur confirmation",
  "Artisan tax-exemption eligibility",
  "Etsy seller-identity confirmation",
  "Tax-exemption bank account",
  "ShipEntegra ETGB eligibility",
  "Sales/proforma requirements",
  "DDP operating process",
];
export default async function CompliancePage() {
  await requireAdmin({ redirectTo: "/compliance" });
  const [cases, profiles] = await Promise.all([
    prisma.complianceCase.findMany({
      include: { documents: true },
      orderBy: { openedAt: "desc" },
    }),
    prisma.legalOperatingProfile.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Official questions and evidence</p>
        <h1 className="mt-2 text-3xl font-semibold">Compliance cases</h1>
        <p className="mt-2 text-sm text-stone-500">
          Track unresolved questions without turning assumptions into legal
          conclusions.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="card p-5">
          <h2 className="font-semibold">MarmaraMade setup checklist</h2>
          <div className="mt-4 space-y-2">
            {setup.map((item) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
                key={item}
              >
                <span>{item}</span>
                <span className="pill">Pending confirmation</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Open a case</h2>
          <form
            action={createComplianceCaseAction}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Field name="title" label="Title" />
            <Field name="topic" label="Topic" />
            <Select
              name="institution"
              options={[
                "SGK",
                "GIB",
                "TAX_OFFICE",
                "ETSY",
                "SHIPENTEGRA",
                "BANK",
                "ACCOUNTANT",
                "OTHER",
              ]}
            />
            <Select
              name="status"
              options={[
                "DRAFT",
                "SUBMITTED",
                "WAITING_FOR_RESPONSE",
                "RESPONSE_RECEIVED",
                "NEEDS_CLARIFICATION",
                "RESOLVED",
                "ARCHIVED",
              ]}
            />
            <Field name="referenceNumber" label="Reference" required={false} />
            <label className="text-xs text-stone-500">
              Related profile
              <select className="field mt-1" name="profileId">
                <option value="">None</option>
                {profiles.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-stone-500 sm:col-span-2">
              Summary
              <textarea className="field mt-1" name="summary" />
            </label>
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Create case
            </button>
          </form>
        </section>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {cases.map((c) => (
          <article className="card p-5" key={c.id}>
            <div className="flex justify-between">
              <h2 className="font-semibold">{c.title}</h2>
              <span className="pill">{c.status.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {c.institution} · {c.topic} · opened{" "}
              {c.openedAt.toLocaleDateString("en-GB")}
            </p>
            <p className="mt-3 text-sm">{c.summary || "No summary yet."}</p>
            <p className="mt-3 text-xs text-stone-400">
              {c.documents.length} attached documents
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
function Field({
  name,
  label,
  required = true,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input className="field mt-1" name={name} required={required} />
    </label>
  );
}
function Select({ name, options }: { name: string; options: string[] }) {
  return (
    <label className="text-xs text-stone-500">
      {name}
      <select className="field mt-1" name={name}>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}

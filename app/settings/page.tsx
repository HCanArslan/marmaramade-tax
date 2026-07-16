import Link from "next/link";
import {
  createDocumentRequirementAction,
  saveGeneralSettingAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
const sections = [
  "SHOP_IDENTITY",
  "SHIPPING_DEFAULT",
  "CUSTOMS_DEFAULT",
  "PACKAGE_DEFAULT",
  "GOAL_DEFAULTS",
  "RESERVES",
  "DOCUMENT_RETENTION",
  "DOCUMENT_REQUIREMENTS",
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
      <div className="grid gap-4 md:grid-cols-2">
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
          <input
            className="field"
            name="name"
            placeholder="US DDP ETGB"
            required
          />
          <select className="field" name="category">
            <option>ETGB</option>
            <option>CUSTOMS_CALCULATION</option>
            <option>SHIPENTEGRA_INVOICE</option>
            <option>BANK_WITHHOLDING</option>
            <option>RETURN_DOCUMENT</option>
          </select>
          <input
            className="field"
            name="destinationCountry"
            placeholder="Country or blank"
          />
          <input
            className="field"
            name="incoterm"
            placeholder="Incoterm or blank"
          />
          <input
            className="field"
            name="carrier"
            placeholder="Carrier or blank"
          />
          <input className="field" name="effectiveFrom" type="date" required />
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

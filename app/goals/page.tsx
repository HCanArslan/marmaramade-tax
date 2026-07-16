import {
  createProfitGoalAction,
  runInventoryGoalAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function GoalsPage() {
  await requireAdmin({ redirectTo: "/goals" });
  const [goals, profiles, rate] = await Promise.all([
    prisma.profitGoal.findMany({
      include: { versions: true, scenarios: { include: { result: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.legalOperatingProfile.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.exchangeRateSnapshot.findFirst({
      where: { baseCurrency: "USD", quoteCurrency: "TRY" },
      orderBy: { capturedAt: "desc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Saved assumptions · versioned recalculation</p>
        <h1 className="mt-2 text-3xl font-semibold">Monthly Goals</h1>
        <p className="mt-2 text-sm text-stone-500">
          Plan average-product, product-combination, and stock-bounded targets
          using realistic after-tax-and-reserve profit.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Standard target"
          value="$1,000"
          note="Monthly realistic profit"
        />
        <Metric
          label="Growth target"
          value="$5,000"
          note="Compare as a separate goal"
        />
        <Metric
          label="Saved USD/TRY"
          value={rate?.rate.toFixed(4) || "Not set"}
          note="Goals do not auto-update"
        />
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">Create goal</h2>
        {profiles.length ? (
          <form
            action={createProfitGoalAction}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <Field
              name="name"
              label="Goal name"
              value="Monthly realistic profit"
            />
            <Field name="startDate" label="Start" type="date" />
            <Field name="endDate" label="End" type="date" />
            <Field name="target" label="Target" type="number" value="1000" />
            <label className="text-xs text-stone-500">
              Currency
              <select className="field mt-1" name="currency">
                <option>USD</option>
                <option>TRY</option>
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Planning mode
              <select className="field mt-1" name="planningMode">
                <option>AVERAGE_PRODUCT</option>
                <option>PRODUCT_COMBINATION</option>
                <option>CURRENT_INVENTORY</option>
                <option>CUSTOM_MIX</option>
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Operating profile
              <select className="field mt-1" name="operatingProfileId">
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.operatingMode}
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="exchangeRate"
              label="USD/TRY assumption"
              type="number"
              value={rate?.rate.toString() || "1"}
            />
            <Field
              name="unitProfitUsd"
              label="Average realistic profit / unit"
              type="number"
              value="0"
            />
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Save immutable version
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Create a legal operating profile before saving a goal.
          </p>
        )}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {goals.map((g) => {
          const settings = g.scenarioSettings as {
            unitProfitUsd?: number;
            exchangeRate?: number;
          };
          const unit = Number(settings.unitProfitUsd || 0);
          const targetUsd =
            g.targetProfitCurrency === "USD"
              ? Number(g.targetProfitAmount)
              : Number(g.targetProfitAmount) /
                Number(settings.exchangeRate || 1);
          const units = unit > 0 ? Math.ceil(targetUsd / unit) : null;
          return (
            <article className="card p-5" key={g.id}>
              <div className="flex justify-between">
                <div>
                  <h2 className="font-semibold">{g.name}</h2>
                  <p className="text-xs text-stone-500">
                    {g.planningMode.replaceAll("_", " ")} ·{" "}
                    {g.profitMetric.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="pill">v{g.versions.length}</span>
              </div>
              <p className="mt-5 text-3xl font-semibold">
                {g.targetProfitAmount.toFixed(2)} {g.targetProfitCurrency}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="text-stone-400">Required units</span>
                  <br />
                  <strong>{units ?? "Not feasible"}</strong>
                </p>
                <p>
                  <span className="text-stone-400">Saved rate</span>
                  <br />
                  <strong>{settings.exchangeRate || "—"}</strong>
                </p>
              </div>
              {!units && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">
                  Non-positive realistic unit profit cannot produce a meaningful
                  unit count. Increase price or reduce entered costs.
                </p>
              )}
              <form
                action={runInventoryGoalAction}
                className="mt-4 grid gap-2 rounded-xl border bg-stone-50 p-3 sm:grid-cols-4"
              >
                <input type="hidden" name="goalId" value={g.id} />
                <input
                  className="field"
                  name="maxUnits"
                  type="number"
                  defaultValue="50"
                  aria-label="Maximum units"
                />
                <input
                  className="field"
                  name="maxLaborHours"
                  type="number"
                  defaultValue="160"
                  aria-label="Maximum labor hours"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="offsiteAds" />
                  Offsite Ads
                </label>
                <button className="rounded-xl border bg-white px-3 text-xs">
                  Optimize inventory
                </button>
              </form>
              {g.scenarios.map((s) => (
                <div className="mt-3 rounded-xl border p-3 text-sm" key={s.id}>
                  <div className="flex justify-between">
                    <strong>{s.name}</strong>
                    <span className="pill">
                      {s.exactResult ? "Exact" : "Approximate"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {s.result
                      ? `${s.result.requiredUnits ?? "No feasible"} units · ${s.result.estimatedProfitUsd.toFixed(2)} USD · ${s.result.totalLaborHours.toFixed(2)} hours`
                      : "Pending result"}
                  </p>
                </div>
              ))}
            </article>
          );
        })}
      </section>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-stone-500">{note}</p>
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  value,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        className="field mt-1"
        name={name}
        type={type}
        defaultValue={value}
        required
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

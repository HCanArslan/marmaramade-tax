import Link from "next/link";
import Decimal from "decimal.js";
import {
  createProfitGoalAction,
  deleteProfitGoalAction,
  runInventoryGoalAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function GoalsPage() {
  await requireAdmin({ redirectTo: "/goals" });
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  );
  const [goals, profiles, rate, historical, listings, availableUnits] =
    await Promise.all([
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
      prisma.orderCostSnapshot.aggregate({
        _avg: { estimatedProfitUsd: true },
      }),
      prisma.etsyListing.findMany({
        where: { state: "active", priceCurrency: "USD" },
        select: {
          priceAmount: true,
          buyerDiscountedPrice: true,
          quantity: true,
        },
      }),
      prisma.productionUnit.count({ where: { inventoryStatus: "AVAILABLE" } }),
    ]);

  const historicalUnitProfit = historical._avg.estimatedProfitUsd
    ? new Decimal(historical._avg.estimatedProfitUsd.toString())
    : new Decimal(0);
  const positiveHistoricalProfit = Decimal.max(historicalUnitProfit, 0);
  const averagePrice = listings.length
    ? listings
        .reduce(
          (sum, listing) =>
            sum.plus(
              (listing.buyerDiscountedPrice ?? listing.priceAmount).toString(),
            ),
          new Decimal(0),
        )
        .div(listings.length)
    : new Decimal(0);
  const etsyListedUnits = listings.reduce(
    (sum, listing) => sum + listing.quantity,
    0,
  );
  const stockUnits = availableUnits || etsyListedUnits;
  const stockSource = availableUnits
    ? "finished inventory"
    : "active Etsy listing quantities";
  const requiredForThousand = positiveHistoricalProfit.gt(0)
    ? new Decimal(1000).div(positiveHistoricalProfit).ceil()
    : null;
  const fiveProfit = positiveHistoricalProfit.mul(5);
  const fiveRevenue = averagePrice.mul(5);
  const sellAllProfit = positiveHistoricalProfit.mul(stockUnits);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Three plain-language monthly answers</p>
        <h1 className="mt-2 text-3xl font-semibold">Monthly Goals</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
          “Net profit” means the realistic profit saved in completed order
          snapshots after entered Etsy fees, product costs, labor, shipping,
          customs, overhead, taxes, and reserves. The page never treats listing
          price as profit.
        </p>
      </header>

      {positiveHistoricalProfit.lte(0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          There is no positive completed-order profit history yet. Enter a
          realistic net profit per product when saving a goal, or calculate one
          in the{" "}
          <Link className="font-semibold underline" href="/calculator">
            Calculator
          </Link>
          . Until then, the three answers below remain intentionally blank
          instead of guessing.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <AnswerCard
          title="How do I make $1,000 net?"
          value={
            requiredForThousand
              ? `${requiredForThousand.toFixed()} sales`
              : "Needs unit net profit"
          }
          detail={
            requiredForThousand
              ? `${requiredForThousand.div("4.345").toDecimalPlaces(1)} per week at ${money(positiveHistoricalProfit)} net each.`
              : "Save a realistic unit-profit assumption below."
          }
        />
        <AnswerCard
          title="What if I sell all stock?"
          value={
            positiveHistoricalProfit.gt(0)
              ? `${money(sellAllProfit)} net`
              : "Needs unit net profit"
          }
          detail={`${stockUnits} units from ${stockSource}. This changes as inventory changes.`}
        />
        <AnswerCard
          title="What if I sell 5 products?"
          value={
            positiveHistoricalProfit.gt(0)
              ? `${money(fiveProfit)} net`
              : "Needs unit net profit"
          }
          detail={
            averagePrice.gt(0)
              ? `${money(fiveRevenue)} buyer revenue at the current ${money(averagePrice)} average price.`
              : "Sync active Etsy listings to calculate average buyer revenue."
          }
        />
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Save a monthly net-profit target</h2>
        <p className="mt-1 text-sm text-stone-500">
          The default is your $1,000 goal. You only need to confirm the unit
          net-profit assumption.
        </p>
        {profiles.length ? (
          <form
            action={createProfitGoalAction}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <Field
              name="name"
              label="Goal name"
              value="Monthly $1,000 net profit"
            />
            <Field
              name="startDate"
              label="Month starts"
              type="date"
              value={dateValue(monthStart)}
            />
            <Field
              name="endDate"
              label="Month ends"
              type="date"
              value={dateValue(monthEnd)}
            />
            <Field
              name="target"
              label="Net-profit target"
              type="number"
              value="1000"
            />
            <label className="text-xs text-stone-500">
              Currency
              <select className="field mt-1" name="currency">
                <option>USD</option>
                <option>TRY</option>
              </select>
            </label>
            <Field
              name="unitProfitUsd"
              label="Realistic net profit per sold product (USD)"
              type="number"
              value={
                positiveHistoricalProfit.gt(0)
                  ? positiveHistoricalProfit.toDecimalPlaces(2).toString()
                  : "0"
              }
            />
            <input type="hidden" name="planningMode" value="AVERAGE_PRODUCT" />
            <input
              type="hidden"
              name="operatingProfileId"
              value={profiles[0].id}
            />
            <input
              type="hidden"
              name="exchangeRate"
              value={rate?.rate.toString() || "1"}
            />
            <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
              Save goal
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Create a legal operating profile first.
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const settings = goal.scenarioSettings as {
            unitProfitUsd?: number;
            exchangeRate?: number;
          };
          const unitProfit = new Decimal(String(settings.unitProfitUsd || 0));
          const targetUsd =
            goal.targetProfitCurrency === "USD"
              ? new Decimal(goal.targetProfitAmount.toString())
              : new Decimal(goal.targetProfitAmount.toString()).div(
                  String(settings.exchangeRate || 1),
                );
          const requiredUnits = unitProfit.gt(0)
            ? targetUsd.div(unitProfit).ceil()
            : null;
          return (
            <article className="card p-5" key={goal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{goal.name}</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {goal.startDate.toLocaleDateString("en-GB")} –{" "}
                    {goal.endDate.toLocaleDateString("en-GB")}
                  </p>
                </div>
                <form action={deleteProfitGoalAction}>
                  <input type="hidden" name="id" value={goal.id} />
                  <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                    Delete
                  </button>
                </form>
              </div>
              <p className="mt-5 text-3xl font-semibold">
                {goal.targetProfitAmount.toFixed(2)} {goal.targetProfitCurrency}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat
                  label="Required sales"
                  value={requiredUnits?.toFixed() ?? "Set unit profit"}
                />
                <Stat
                  label="Net profit / sale"
                  value={unitProfit.gt(0) ? money(unitProfit) : "Not set"}
                />
                <Stat
                  label="Sales / week"
                  value={
                    requiredUnits
                      ? requiredUnits.div("4.345").toDecimalPlaces(1).toString()
                      : "—"
                  }
                />
                <Stat
                  label="Saved USD/TRY"
                  value={String(settings.exchangeRate || "—")}
                />
              </div>
              <details className="mt-4 rounded-xl border bg-stone-50 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Advanced: test inventory and labor limits
                </summary>
                <form
                  action={runInventoryGoalAction}
                  className="mt-3 grid gap-2 sm:grid-cols-4"
                >
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input
                    className="field"
                    name="maxUnits"
                    type="number"
                    defaultValue={String(Math.max(stockUnits, 1))}
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
                    <input type="checkbox" name="offsiteAds" /> Offsite Ads
                  </label>
                  <button className="rounded-xl border bg-white px-3 text-xs">
                    Run stock test
                  </button>
                </form>
                {goal.scenarios.map((scenario) => (
                  <p className="mt-2 text-xs text-stone-500" key={scenario.id}>
                    {scenario.name}:{" "}
                    {scenario.result
                      ? `${scenario.result.requiredUnits ?? "not feasible"} units, ${scenario.result.estimatedProfitUsd.toFixed(2)} USD`
                      : "pending"}
                  </p>
                ))}
              </details>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function AnswerCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="card p-6">
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p>
    </article>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-stone-400">{label}</span>
      <br />
      <strong>{value}</strong>
    </p>
  );
}
function money(value: Decimal) {
  return `$${value.toDecimalPlaces(2).toFixed(2)}`;
}
function dateValue(value: Date) {
  return value.toISOString().slice(0, 10);
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

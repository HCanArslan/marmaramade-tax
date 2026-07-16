import {
  createCustomsProfileAction,
  createMicroExportCaseAction,
  createTariffVersionAction,
} from "@/app/actions/operations";
import { saveEtgbCostRecordAction } from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const today = new Date().toISOString().slice(0, 10);
const guideUrl =
  "https://ticaret.gov.tr/duyurular/mikro-ihracat-gumruk-rehberi";

export default async function CustomsEtgbPage() {
  await requireAdmin({ redirectTo: "/customs-etgb" });
  const [profiles, tariffs, cases, orders, legalProfile, etgbCosts] =
    await Promise.all([
      prisma.customsProfile.findMany({ orderBy: { effectiveFrom: "desc" } }),
      prisma.tariffVersion.findMany({ orderBy: { effectiveFrom: "desc" } }),
      prisma.microExportCase.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.order.findMany({
        where: { destinationCountry: { not: "TR" } },
        orderBy: { orderDate: "desc" },
        take: 100,
      }),
      prisma.legalOperatingProfile.findFirst({
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.etgbCostRecord.findMany({
        orderBy: { effectiveFrom: "desc" },
        take: 25,
      }),
    ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">A simple export evidence workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Customs & ETGB</h1>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Step number="1" title="Save the route">
          Create one TR-to-destination planning profile.
        </Step>
        <Step number="2" title="Confirm the product code">
          Use material, purpose, and a dated official or broker source.
        </Step>
        <Step number="3" title="Link the real order">
          Create an ETGB case only when the export order exists.
        </Step>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ETGB eligibility and limits can change. The app records evidence but
        does not declare a shipment eligible. Review the{" "}
        <a
          className="font-medium underline"
          href={guideUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ministry of Trade micro-export guide
        </a>{" "}
        and confirm the shipment with your carrier or customs professional.
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">ETGB service-cost status</h2>
        <p className="mt-1 text-sm text-stone-500">
          ETGB is not assumed to be free. Keep the status unknown until a dated
          carrier invoice or written quote confirms whether it is included in
          shipping or charged separately. Unknown costs are not deducted.
        </p>
        <form
          action={saveEtgbCostRecordAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="text-xs text-stone-500">
            Confirmed status
            <select className="field mt-1" name="status">
              <option value="UNKNOWN_PENDING_CONFIRMATION">
                Unknown — pending confirmation
              </option>
              <option value="INCLUDED_IN_SHIPPING">Included in shipping</option>
              <option value="NO_SEPARATE_CHARGE">No separate charge</option>
              <option value="SEPARATE_FIXED_CHARGE">
                Separate fixed charge
              </option>
              <option value="SEPARATE_VARIABLE_CHARGE">
                Separate variable charge
              </option>
              <option value="MANUAL">Manual confirmed amount</option>
            </select>
          </label>
          <Field
            label="Estimated ETGB fee USD (0 means not entered)"
            name="estimatedFeeUsd"
            type="number"
            value="0"
          />
          <Field
            label="Actual ETGB fee USD (0 means not entered)"
            name="actualFeeUsd"
            type="number"
            value="0"
          />
          <label className="text-xs text-stone-500">
            Included in shipping?
            <select className="field mt-1" name="includedInShipping">
              <option value="UNKNOWN">Unknown</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
          <Field
            label="Evidence source"
            name="source"
            value="Pending carrier confirmation"
          />
          <Field
            label="Source date"
            name="sourceDate"
            type="date"
            value={today}
          />
          <Field
            label="Effective from"
            name="effectiveFrom"
            type="date"
            value={today}
          />
          <Field label="Notes (optional)" name="notes" required={false} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="deductFromProfit" />
            Deduct confirmed ETGB cost from seller profit
          </label>
          <SaveButton label="Save ETGB cost version" />
        </form>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {etgbCosts.map((cost) => (
            <div className="rounded-xl border p-3 text-sm" key={cost.id}>
              <p className="font-medium">{cost.status.replaceAll("_", " ")}</p>
              <p className="mt-1 text-stone-500">
                Estimate {cost.estimatedFeeUsd?.toFixed(2) ?? "not entered"} USD
                · actual {cost.actualFeeUsd?.toFixed(2) ?? "not entered"} USD ·
                included{" "}
                {cost.includedInShipping === null
                  ? "unknown"
                  : cost.includedInShipping
                    ? "yes"
                    : "no"}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {cost.source} · {cost.sourceDate.toLocaleDateString("en-GB")} ·{" "}
                {cost.deductFromProfit ? "deducted" : "not deducted"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Box title="1. Route profile">
          <form action={createCustomsProfileAction} className="grid gap-3">
            <Field
              label="Profile name"
              name="name"
              value="Türkiye → United States planning"
            />
            <Field
              label="Origin country code"
              name="originCountry"
              value="TR"
            />
            <Field
              label="Destination country code"
              name="destinationCountry"
              value="US"
            />
            <Field
              label="Confirmed Incoterm (optional)"
              name="incoterm"
              required={false}
            />
            <Field
              label="Effective from"
              name="effectiveFrom"
              type="date"
              value={today}
            />
            <Field
              label="Source URL or broker reference (optional)"
              name="source"
              required={false}
              value={guideUrl}
            />
            <Field label="Notes (optional)" name="notes" required={false} />
            <SaveButton label="Save route" />
          </form>
        </Box>

        <Box title="2. Confirmed tariff version">
          <p className="mb-3 text-sm text-stone-500">
            Leave the rate empty until it is confirmed for this exact product
            and destination.
          </p>
          <form action={createTariffVersionAction} className="grid gap-3">
            <Field label="Confirmed HS / GTIP code" name="hsCode" />
            <Field
              label="Exact product description"
              name="productDescription"
            />
            <Field
              label="Materials and composition (optional)"
              name="material"
              required={false}
            />
            <Field
              label="Origin country code"
              name="originCountry"
              value="TR"
            />
            <Field
              label="Destination country code"
              name="destinationCountry"
              value="US"
            />
            <Field
              label="Confirmed planning duty % (optional)"
              name="dutyRate"
              type="number"
              required={false}
            />
            <Field
              label="Effective from"
              name="effectiveFrom"
              type="date"
              value={today}
            />
            <Field
              label="Dated source URL or quote (optional)"
              name="source"
              required={false}
            />
            <Field label="Notes (optional)" name="notes" required={false} />
            <SaveButton label="Save tariff evidence" />
          </form>
        </Box>

        <Box title="3. Real micro-export case">
          <p className="mb-3 text-sm text-stone-500">
            Link a real international order. Shipment ID can be added after
            booking.
          </p>
          <form action={createMicroExportCaseAction} className="grid gap-3">
            <label className="text-xs text-stone-500">
              International order
              <select className="field mt-1" name="orderId">
                <option value="">Select later</option>
                {orders.map((order) => (
                  <option value={order.id} key={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Exporter legal name"
              name="exporterName"
              value={legalProfile?.exporterName || "Hamit Can Arslan"}
            />
            <Field
              label="Shipment ID (optional)"
              name="shipmentId"
              required={false}
            />
            <SaveButton label="Create ETGB case" />
          </form>
        </Box>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Rows
          title="Route profiles"
          rows={profiles.map(
            (profile) =>
              `${profile.name} · ${profile.originCountry}→${profile.destinationCountry} · ${profile.confirmationStatus}`,
          )}
        />
        <Rows
          title="Tariff evidence"
          rows={tariffs.map(
            (tariff) =>
              `${tariff.hsCode} · ${tariff.productDescription} · ${tariff.confirmationStatus}`,
          )}
        />
        <Rows
          title="ETGB cases"
          rows={cases.map(
            (item) =>
              `${item.orderId || "unlinked"} · ${item.status} · ETGB ${item.etgbStatus}`,
          )}
        />
      </section>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-jade">STEP {number}</p>
      <h2 className="mt-2 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{children}</p>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Box title={title}>
      {rows.length ? (
        rows.map((row, index) => (
          <p className="border-b py-3 text-sm" key={index}>
            {row}
          </p>
        ))
      ) : (
        <p className="text-sm text-stone-500">Nothing saved yet.</p>
      )}
    </Box>
  );
}

function Field({
  label,
  name,
  value,
  required = true,
  type = "text",
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        className="field mt-1"
        name={name}
        defaultValue={value}
        required={required}
        type={type}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function SaveButton({ label }: { label: string }) {
  return (
    <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
      {label}
    </button>
  );
}

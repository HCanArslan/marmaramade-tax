import {
  createCustomsProfileAction,
  createMicroExportCaseAction,
  createTariffVersionAction,
  deleteCustomsProfileAction,
  deleteMicroExportCaseAction,
  deleteTariffVersionAction,
  updateCustomsProfileAction,
  updateMicroExportCaseAction,
  updateTariffVersionAction,
} from "@/app/actions/operations";
import {
  deleteEtgbCostRecordAction,
  saveEtgbCostRecordAction,
  updateEtgbCostRecordAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const today = new Date().toISOString().slice(0, 10);
const guideUrl =
  "https://ticaret.gov.tr/duyurular/mikro-ihracat-gumruk-rehberi";
const etgbCostStatuses = [
  ["UNKNOWN_PENDING_CONFIRMATION", "Unknown — pending confirmation"],
  ["INCLUDED_IN_SHIPPING", "Included in shipping"],
  ["NO_SEPARATE_CHARGE", "No separate charge"],
  ["SEPARATE_FIXED_CHARGE", "Separate fixed charge"],
  ["SEPARATE_VARIABLE_CHARGE", "Separate variable charge"],
  ["MANUAL", "Manual confirmed amount"],
] as const;
const yesNoUnknown = [
  ["UNKNOWN", "Unknown"],
  ["YES", "Yes"],
  ["NO", "No"],
] as const;
const routeStatuses = [
  ["DRAFT", "Draft"],
  ["ACTIVE", "Active"],
  ["ARCHIVED", "Archived"],
] as const;
const caseStatuses = [
  ["DRAFT", "Draft"],
  ["READY", "Ready"],
  ["SUBMITTED", "Submitted"],
  ["COMPLETED", "Completed"],
  ["ARCHIVED", "Archived"],
] as const;
const caseEtgbStatuses = [
  ["PENDING", "Pending"],
  ["READY", "Ready"],
  ["SUBMITTED", "Submitted"],
  ["COMPLETED", "Completed"],
  ["FAILED", "Failed"],
] as const;

export default async function CustomsEtgbPage() {
  await requireAdmin({ redirectTo: "/customs-etgb" });
  const [products, profiles, tariffs, cases, orders, legalProfile, etgbCosts] =
    await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: { sku: "asc" },
      }),
      prisma.customsProfile.findMany({
        include: { product: true },
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.tariffVersion.findMany({
        include: { product: true },
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.microExportCase.findMany({
        include: { product: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: { destinationCountry: { not: "TR" } },
        orderBy: { orderDate: "desc" },
        take: 100,
      }),
      prisma.legalOperatingProfile.findFirst({
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.etgbCostRecord.findMany({
        include: { product: true },
        orderBy: { effectiveFrom: "desc" },
        take: 25,
      }),
    ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Editable export evidence and cost versions</p>
        <h1 className="mt-2 text-3xl font-semibold">Customs &amp; ETGB</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Open any saved record below to edit it. Unused versions can be
          deleted; linked or progressed ETGB cases remain audit evidence and
          should be archived. Tariff versions store classification evidence;
          Calculator deducts money only from the selected product&apos;s dated
          Customs &amp; tariffs quote, where declared value and payer are known.
        </p>
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
        ETGB eligibility and limits can change. Review the{" "}
        <a
          className="font-medium underline"
          href={guideUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ministry of Trade micro-export guide
        </a>{" "}
        and confirm each shipment with your carrier or customs professional.
      </div>

      <Box title="ETGB service-cost versions">
        <p className="text-sm text-stone-500">
          Calculator uses the latest effective saved version. Deleting or
          editing a version immediately refreshes Calculator assumptions.
        </p>
        <form
          action={saveEtgbCostRecordAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <ProductSelect products={products} />
          <SelectField
            label="Confirmed status"
            name="status"
            value="UNKNOWN_PENDING_CONFIRMATION"
            options={etgbCostStatuses}
          />
          <Field
            label="Estimated ETGB fee USD"
            name="estimatedFeeUsd"
            type="number"
            value="0"
          />
          <Field
            label="Actual ETGB fee USD"
            name="actualFeeUsd"
            type="number"
            value="0"
          />
          <SelectField
            label="Included in shipping?"
            name="includedInShipping"
            value="UNKNOWN"
            options={yesNoUnknown}
          />
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
            <input name="deductFromProfit" type="checkbox" />
            Deduct confirmed ETGB cost from seller profit
          </label>
          <SaveButton label="Save new cost version" />
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {etgbCosts.length === 0 ? (
            <Empty />
          ) : (
            etgbCosts.map((cost) => (
              <details className="rounded-xl border p-4" key={cost.id}>
                <summary className="cursor-pointer text-sm font-medium">
                  {cost.product?.sku ?? "Legacy unassigned"} ·{" "}
                  {cost.status.replaceAll("_", " ")} ·{" "}
                  {cost.estimatedFeeUsd?.toFixed(2) ?? "not entered"} USD
                </summary>
                <form
                  action={updateEtgbCostRecordAction}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <input name="id" type="hidden" value={cost.id} />
                  <ProductSelect
                    products={products}
                    value={cost.productId ?? ""}
                  />
                  <SelectField
                    label="Confirmed status"
                    name="status"
                    value={cost.status}
                    options={etgbCostStatuses}
                  />
                  <Field
                    label="Estimated fee USD"
                    name="estimatedFeeUsd"
                    type="number"
                    value={cost.estimatedFeeUsd?.toString() ?? "0"}
                  />
                  <Field
                    label="Actual fee USD"
                    name="actualFeeUsd"
                    type="number"
                    value={cost.actualFeeUsd?.toString() ?? "0"}
                  />
                  <SelectField
                    label="Included in shipping?"
                    name="includedInShipping"
                    value={
                      cost.includedInShipping === null
                        ? "UNKNOWN"
                        : cost.includedInShipping
                          ? "YES"
                          : "NO"
                    }
                    options={yesNoUnknown}
                  />
                  <Field
                    label="Evidence source"
                    name="source"
                    value={cost.source}
                  />
                  <Field
                    label="Source date"
                    name="sourceDate"
                    type="date"
                    value={dateValue(cost.sourceDate)}
                  />
                  <Field
                    label="Effective from"
                    name="effectiveFrom"
                    type="date"
                    value={dateValue(cost.effectiveFrom)}
                  />
                  <Field
                    label="Effective to (optional)"
                    name="effectiveTo"
                    type="date"
                    required={false}
                    value={dateValue(cost.effectiveTo)}
                  />
                  <Field
                    label="Notes (optional)"
                    name="notes"
                    required={false}
                    value={cost.notes ?? ""}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      defaultChecked={cost.deductFromProfit}
                      name="deductFromProfit"
                      type="checkbox"
                    />
                    Deduct from seller profit
                  </label>
                  <SaveButton label="Save cost changes" />
                </form>
                <DeleteForm
                  action={deleteEtgbCostRecordAction}
                  id={cost.id}
                  label="Delete cost version"
                />
              </details>
            ))
          )}
        </div>
      </Box>

      <section className="grid gap-5 xl:grid-cols-3">
        <Box title="1. New route profile">
          <form action={createCustomsProfileAction} className="grid gap-3">
            <ProductSelect products={products} />
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
        <Box title="2. New tariff version">
          <form action={createTariffVersionAction} className="grid gap-3">
            <ProductSelect products={products} />
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
        <Box title="3. New micro-export case">
          <form action={createMicroExportCaseAction} className="grid gap-3">
            <ProductSelect products={products} />
            <OrderSelect orders={orders} />
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
        <Box title="Saved route profiles">
          {profiles.length === 0 ? (
            <Empty />
          ) : (
            profiles.map((profile) => (
              <details className="border-b py-3" key={profile.id}>
                <summary className="cursor-pointer text-sm font-medium">
                  {profile.product?.sku ?? "Legacy unassigned"} · {profile.name}{" "}
                  · {profile.originCountry}→{profile.destinationCountry} ·{" "}
                  {profile.status}
                </summary>
                <form
                  action={updateCustomsProfileAction}
                  className="mt-3 grid gap-3"
                >
                  <input name="id" type="hidden" value={profile.id} />
                  <ProductSelect
                    products={products}
                    value={profile.productId ?? ""}
                  />
                  <Field
                    label="Profile name"
                    name="name"
                    value={profile.name}
                  />
                  <Field
                    label="Origin country code"
                    name="originCountry"
                    value={profile.originCountry}
                  />
                  <Field
                    label="Destination country code"
                    name="destinationCountry"
                    value={profile.destinationCountry}
                  />
                  <Field
                    label="Incoterm (optional)"
                    name="incoterm"
                    required={false}
                    value={profile.incoterm ?? ""}
                  />
                  <SelectField
                    label="Status"
                    name="status"
                    value={profile.status}
                    options={routeStatuses}
                  />
                  <Field
                    label="Effective from"
                    name="effectiveFrom"
                    type="date"
                    value={dateValue(profile.effectiveFrom)}
                  />
                  <Field
                    label="Effective to (optional)"
                    name="effectiveTo"
                    type="date"
                    required={false}
                    value={dateValue(profile.effectiveTo)}
                  />
                  <Field
                    label="Source (optional)"
                    name="source"
                    required={false}
                    value={profile.source ?? ""}
                  />
                  <Field
                    label="Notes (optional)"
                    name="notes"
                    required={false}
                    value={profile.notes ?? ""}
                  />
                  <SaveButton label="Save route changes" />
                </form>
                <DeleteForm
                  action={deleteCustomsProfileAction}
                  id={profile.id}
                  label="Delete route profile"
                />
              </details>
            ))
          )}
        </Box>

        <Box title="Saved tariff versions">
          {tariffs.length === 0 ? (
            <Empty />
          ) : (
            tariffs.map((tariff) => (
              <details className="border-b py-3" key={tariff.id}>
                <summary className="cursor-pointer text-sm font-medium">
                  {tariff.product?.sku ?? "Legacy unassigned"} · {tariff.hsCode}{" "}
                  · {tariff.productDescription}
                </summary>
                <form
                  action={updateTariffVersionAction}
                  className="mt-3 grid gap-3"
                >
                  <input name="id" type="hidden" value={tariff.id} />
                  <ProductSelect
                    products={products}
                    value={tariff.productId ?? ""}
                  />
                  <Field
                    label="HS / GTIP code"
                    name="hsCode"
                    value={tariff.hsCode}
                  />
                  <Field
                    label="Product description"
                    name="productDescription"
                    value={tariff.productDescription}
                  />
                  <Field
                    label="Material (optional)"
                    name="material"
                    required={false}
                    value={tariff.material ?? ""}
                  />
                  <Field
                    label="Origin country code"
                    name="originCountry"
                    value={tariff.originCountry}
                  />
                  <Field
                    label="Destination country code"
                    name="destinationCountry"
                    value={tariff.destinationCountry}
                  />
                  <Field
                    label="Duty % (optional)"
                    name="dutyRate"
                    type="number"
                    required={false}
                    value={tariff.dutyRate?.toString() ?? ""}
                  />
                  <Field
                    label="Effective from"
                    name="effectiveFrom"
                    type="date"
                    value={dateValue(tariff.effectiveFrom)}
                  />
                  <Field
                    label="Effective to (optional)"
                    name="effectiveTo"
                    type="date"
                    required={false}
                    value={dateValue(tariff.effectiveTo)}
                  />
                  <Field
                    label="Source (optional)"
                    name="source"
                    required={false}
                    value={tariff.source ?? ""}
                  />
                  <Field
                    label="Notes (optional)"
                    name="notes"
                    required={false}
                    value={tariff.notes ?? ""}
                  />
                  <SaveButton label="Save tariff changes" />
                </form>
                <DeleteForm
                  action={deleteTariffVersionAction}
                  id={tariff.id}
                  label="Delete tariff version"
                />
              </details>
            ))
          )}
        </Box>

        <Box title="Saved ETGB cases">
          {cases.length === 0 ? (
            <Empty />
          ) : (
            cases.map((item) => {
              const deletable =
                item.status === "DRAFT" &&
                !item.orderId &&
                !item.shipmentId &&
                !item.invoiceDocumentId &&
                !item.proformaDocumentId &&
                !item.etgbDocumentId &&
                !item.customsDocumentId;
              return (
                <details className="border-b py-3" key={item.id}>
                  <summary className="cursor-pointer text-sm font-medium">
                    {item.product?.sku ?? "Legacy unassigned"} ·{" "}
                    {item.orderId || "unlinked draft"} · {item.status} · ETGB{" "}
                    {item.etgbStatus}
                  </summary>
                  <form
                    action={updateMicroExportCaseAction}
                    className="mt-3 grid gap-3"
                  >
                    <input name="id" type="hidden" value={item.id} />
                    <ProductSelect
                      products={products}
                      value={item.productId ?? ""}
                    />
                    <OrderSelect orders={orders} value={item.orderId ?? ""} />
                    <Field
                      label="Exporter legal name"
                      name="exporterName"
                      value={item.exporterName}
                    />
                    <Field
                      label="Shipment ID (optional)"
                      name="shipmentId"
                      required={false}
                      value={item.shipmentId ?? ""}
                    />
                    <SelectField
                      label="Case status"
                      name="status"
                      value={item.status}
                      options={caseStatuses}
                    />
                    <Field
                      label="Customs status (optional)"
                      name="customsStatus"
                      required={false}
                      value={item.customsStatus ?? ""}
                    />
                    <SelectField
                      label="ETGB status"
                      name="etgbStatus"
                      value={item.etgbStatus}
                      options={caseEtgbStatuses}
                    />
                    <SaveButton label="Save case changes" />
                  </form>
                  {deletable ? (
                    <DeleteForm
                      action={deleteMicroExportCaseAction}
                      id={item.id}
                      label="Delete unlinked draft"
                    />
                  ) : (
                    <p className="mt-3 text-xs text-amber-700">
                      Linked or progressed cases are audit evidence. Set the
                      case status to Archived instead of deleting it.
                    </p>
                  )}
                </details>
              );
            })
          )}
        </Box>
      </section>
    </div>
  );
}

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
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

function Empty() {
  return <p className="text-sm text-stone-500">Nothing saved yet.</p>;
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

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <select className="field mt-1" defaultValue={value} name={name}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OrderSelect({
  orders,
  value = "",
}: {
  orders: Array<{ id: string; orderNumber: string }>;
  value?: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      International order
      <select className="field mt-1" defaultValue={value} name="orderId">
        <option value="">Unlinked / select later</option>
        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            {order.orderNumber}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductSelect({
  products,
  value = "",
}: {
  products: Array<{ id: string; sku: string; title: string }>;
  value?: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      Product
      <select
        className="field mt-1"
        defaultValue={value}
        name="productId"
        required
      >
        <option disabled value="">
          Choose product
        </option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.sku} · {product.title}
          </option>
        ))}
      </select>
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

function DeleteForm({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action} className="mt-3 border-t pt-3">
      <input name="id" type="hidden" value={id} />
      <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
        {label}
      </button>
    </form>
  );
}

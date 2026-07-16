import Link from "next/link";
import {
  createProductionBatchAction,
  createProductionUnitAction,
} from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function ProductionPage() {
  await requireAdmin({ redirectTo: "/production" });
  const [products, makers, batches] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: {
        costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
        etsyListingLinks: { include: { listing: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.businessPerson.findMany({
      where: { roles: { some: { role: "MAKER", effectiveTo: null } } },
    }),
    prisma.productionBatch.findMany({
      include: { units: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const openBatches = batches.filter(
    (batch) => batch.completedQuantity < batch.plannedQuantity,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Turn a product design into physical inventory</p>
        <h1 className="mt-2 text-3xl font-semibold">Production</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
          Use a batch to record what you intend to make. Complete a unit only
          when a physical item exists and is ready for sale. Completing a unit
          adds it to Inventory and captures the product&apos;s current cost
          version.
        </p>
      </header>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        Etsy listing quantity is marketplace availability; Production is your
        physical stock record. Link the finished unit to an Etsy listing when
        possible so Inventory can show the difference clearly.
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="1. Plan a production batch">
          {!makers.length && (
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Add a person with the Maker role under{" "}
              <Link className="font-semibold underline" href="/business">
                Business
              </Link>{" "}
              first.
            </p>
          )}
          <form
            action={createProductionBatchAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field
              label="Batch code"
              name="batchCode"
              placeholder="Example: JUL-2026-BAG-01"
            />
            <label className="text-xs text-stone-500">
              Product design
              <select className="field mt-1" name="productTemplateId" required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.sku} · {product.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Maker
              <select className="field mt-1" name="makerPersonId" required>
                <option value="">Select maker</option>
                {makers.map((maker) => (
                  <option value={maker.id} key={maker.id}>
                    {maker.fullName}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Production start date" name="startDate" type="date" />
            <Field
              label="How many physical units are planned?"
              name="plannedQuantity"
              type="number"
              value="1"
            />
            <Field
              label="Total planned labor hours"
              name="totalLaborHours"
              type="number"
              value="0"
            />
            <Field
              label="Batch notes (optional)"
              name="notes"
              required={false}
            />
            <SaveButton
              label="Create batch"
              disabled={!products.length || !makers.length}
            />
          </form>
        </Box>

        <Box title="2. Record a completed physical unit">
          <form
            action={createProductionUnitAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="text-xs text-stone-500">
              Production batch
              <select className="field mt-1" name="batchId" required>
                <option value="">Select open batch</option>
                {openBatches.map((batch) => {
                  const product = productById.get(batch.productTemplateId);
                  return (
                    <option value={batch.id} key={batch.id}>
                      {batch.batchCode} · {product?.sku ?? "Unknown product"}
                    </option>
                  );
                })}
              </select>
            </label>
            <Field
              label="Unique finished-unit SKU"
              name="localSku"
              placeholder="Example: MM-BAG-001-U1"
            />
            <Field
              label="Serial number (optional)"
              name="serialNumber"
              required={false}
            />
            <label className="text-xs text-stone-500">
              Etsy listing link (optional)
              <select className="field mt-1" name="etsyListingId">
                <option value="">Link later</option>
                {products.flatMap((product) =>
                  product.etsyListingLinks.map(({ listing }) => (
                    <option
                      value={listing.etsyListingId}
                      key={listing.etsyListingId}
                    >
                      {product.sku} · #{listing.etsyListingId}
                    </option>
                  )),
                )}
              </select>
            </label>
            <Field
              label="Completion notes (optional)"
              name="notes"
              required={false}
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="oneOfOne" type="checkbox" defaultChecked />{" "}
              One-of-one item
            </label>
            <SaveButton
              label="Add finished unit to inventory"
              disabled={!openBatches.length}
            />
          </form>
        </Box>
      </section>

      <section className="space-y-3">
        {batches.map((batch) => {
          const product = productById.get(batch.productTemplateId);
          return (
            <div className="card p-5" key={batch.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{batch.batchCode}</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {product
                      ? `${product.sku} · ${product.title}`
                      : "Product record unavailable"}
                  </p>
                </div>
                <span className="pill">{batch.status}</span>
              </div>
              <p className="mt-3 text-sm text-stone-500">
                Planned {batch.plannedQuantity} · completed{" "}
                {batch.completedQuantity} · rejected {batch.rejectedQuantity} ·
                labor {batch.totalLaborHours.toFixed(2)}h
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {batch.units.map((unit) => (
                  <span className="pill" key={unit.id}>
                    {unit.localSku} · {unit.inventoryStatus}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {!batches.length && (
          <p className="card p-8 text-center text-sm text-stone-500">
            No production batches yet.
          </p>
        )}
      </section>
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

function Field({
  label,
  name,
  value,
  required = true,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function SaveButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="rounded-xl bg-jade px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

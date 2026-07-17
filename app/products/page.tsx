import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Copy,
  ExternalLink,
  PackageSearch,
  RefreshCw,
  Ruler,
  Tag,
  Trash2,
} from "lucide-react";
import { syncEtsyAction } from "@/app/actions/etsy";
import { setListingDiscountAction } from "@/app/actions/listings";
import {
  createProductCostAction,
  createProductMaterialAction,
  copyProductMaterialAction,
  deleteProductCostAction,
  deleteProductMaterialAction,
  duplicateProductCostSetupAction,
  updateProductCostAction,
  updateProductMaterialAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getActiveConnection } from "@/lib/etsy/auth";
import { resolveListingPricing } from "@/lib/etsy/pricing";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  await requireAdmin({ redirectTo: "/products" });
  const connection = await getActiveConnection();
  const allProducts = await prisma.product.findMany({
    where: { active: true },
    include: {
      costVersions: {
        orderBy: { effectiveFrom: "desc" },
        include: {
          materialComponents: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
    orderBy: { sku: "asc" },
  });
  const listings = connection
    ? await prisma.etsyListing.findMany({
        where: { connectionId: connection.id },
        include: {
          images: { orderBy: { rank: "asc" }, take: 1 },
          productLink: {
            include: {
              product: {
                include: {
                  costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: [{ state: "asc" }, { title: "asc" }],
      })
    : [];

  const active = listings.filter(
    (listing) => listing.state === "active",
  ).length;
  const withLocalCosts = listings.filter(
    (listing) => listing.productLink?.product.costVersions.length,
  ).length;
  const withDimensions = listings.filter(
    (listing) => listing.itemLength && listing.itemWidth && listing.itemHeight,
  ).length;
  const hasEditableCostVersions = allProducts.some((product) =>
    product.costVersions.some((version) => version._count.orderItems === 0),
  );

  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Etsy catalog + local cost foundation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">
            Products
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            Every synchronized Etsy listing is shown here. Etsy data stays
            read-only; packed parcel dimensions, production costs, carrier
            quotes, HS codes, taxes and destination tariffs remain explicit
            local inputs.
          </p>
        </div>
        {connection && (
          <form action={syncEtsyAction}>
            <input type="hidden" name="syncType" value="LISTINGS_ONLY" />
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white">
              <RefreshCw size={16} /> Sync Etsy listings
            </button>
          </form>
        )}
      </header>

      <section className="card p-5">
        <h2 className="font-semibold">New product cost version</h2>
        <form
          action={createProductCostAction}
          className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <label className="text-xs text-stone-500">
            Product
            <select className="field mt-1" name="productId" required>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.title}
                </option>
              ))}
            </select>
          </label>
          {[
            ["effectiveFrom", "Effective from", "date", ""],
            ["materialCostTry", "Materials TRY", "number", "0"],
            ["laborHours", "Labor hours", "number", "0"],
            ["laborHourlyRateTry", "Hourly TRY", "number", "0"],
            ["packagingCostTry", "Packaging TRY", "number", "0"],
            ["additionalDirectCostTry", "Other direct TRY", "number", "0"],
            ["wastageRate", "Wastage %", "number", "0"],
            ["additionalMakerPaymentTry", "Maker payment TRY", "number", "0"],
            ["allocatedEquipmentCostTry", "Equipment TRY", "number", "0"],
            ["templateType", "Template", "text", "cotton crochet"],
            ["changeReason", "Change reason", "text", "Initial cost"],
            ["notes", "Notes", "text", ""],
          ].map(([name, label, type, value]) => (
            <label className="text-xs text-stone-500" key={name}>
              {label}
              <input
                className="field mt-1"
                name={name}
                type={type}
                defaultValue={value}
                required={
                  !["templateType", "changeReason", "notes"].includes(name)
                }
                step={type === "number" ? "0.01" : undefined}
              />
            </label>
          ))}
          <button
            disabled={!allProducts.length}
            className="rounded-xl bg-jade px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save cost version
          </button>
        </form>
      </section>

      <section className="card p-5" id="saved-cost-versions">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Saved cost versions by product</h2>
            <p className="mt-1 max-w-3xl text-sm text-stone-500">
              Every saved value appears here under its related product. The
              Calculator uses the newest effective version. Versions already
              used by an order are locked so historical records stay intact.
            </p>
          </div>
          <span className="pill">
            {allProducts.reduce(
              (total, product) => total + product.costVersions.length,
              0,
            )}{" "}
            saved versions
          </span>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {allProducts.map((product) => (
            <article
              className="rounded-2xl border bg-stone-50/60 p-4"
              key={product.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{product.sku}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                    {product.title}
                  </p>
                </div>
                <span className="pill">
                  {product.costVersions.length} version
                  {product.costVersions.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {product.costVersions.map((costVersion, versionIndex) => {
                  const locked = costVersion._count.orderItems > 0;
                  const laborTotal = costVersion.laborHours.mul(
                    costVersion.laborHourlyRateTry,
                  );
                  const materialWithWastage = costVersion.materialCostTry.plus(
                    costVersion.materialCostTry
                      .mul(costVersion.wastageRate)
                      .div(100),
                  );
                  const directTotal = materialWithWastage
                    .plus(laborTotal)
                    .plus(costVersion.packagingCostTry)
                    .plus(costVersion.additionalDirectCostTry)
                    .plus(costVersion.additionalMakerPaymentTry)
                    .plus(costVersion.allocatedEquipmentCostTry);
                  return (
                    <div
                      className="rounded-xl border bg-white p-4"
                      id={`cost-version-${costVersion.id}`}
                      key={costVersion.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm">
                              {costVersion.effectiveFrom.toLocaleDateString(
                                "en-GB",
                              )}
                            </strong>
                            <span className="pill">
                              {versionIndex === 0
                                ? "Latest · used by Calculator"
                                : "Historical"}
                            </span>
                            {locked && (
                              <span className="pill">Order locked</span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-stone-500">
                            Direct planning cost:{" "}
                            <strong>₺{directTotal.toFixed(2)}</strong>
                            {costVersion.materialComponents.length > 0 && (
                              <>
                                {" "}
                                · {costVersion.materialComponents.length}{" "}
                                itemized material component
                                {costVersion.materialComponents.length === 1
                                  ? ""
                                  : "s"}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <form
                        action={updateProductCostAction}
                        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        <input type="hidden" name="id" value={costVersion.id} />
                        <CostInput
                          label="Effective from"
                          name="effectiveFrom"
                          type="date"
                          value={costVersion.effectiveFrom
                            .toISOString()
                            .slice(0, 10)}
                          locked={locked}
                        />
                        <CostInput
                          label={
                            costVersion.materialComponents.length
                              ? "Materials TRY · itemized total"
                              : "Materials TRY"
                          }
                          name="materialCostTry"
                          value={costVersion.materialCostTry.toString()}
                          locked={locked}
                          readOnly={costVersion.materialComponents.length > 0}
                        />
                        <CostInput
                          label="Labor hours"
                          name="laborHours"
                          value={costVersion.laborHours.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Hourly TRY"
                          name="laborHourlyRateTry"
                          value={costVersion.laborHourlyRateTry.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Packaging TRY"
                          name="packagingCostTry"
                          value={costVersion.packagingCostTry.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Other direct TRY"
                          name="additionalDirectCostTry"
                          value={costVersion.additionalDirectCostTry.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Wastage %"
                          name="wastageRate"
                          value={costVersion.wastageRate.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Maker payment TRY"
                          name="additionalMakerPaymentTry"
                          value={costVersion.additionalMakerPaymentTry.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Equipment TRY"
                          name="allocatedEquipmentCostTry"
                          value={costVersion.allocatedEquipmentCostTry.toString()}
                          locked={locked}
                        />
                        <CostInput
                          label="Template"
                          name="templateType"
                          type="text"
                          value={costVersion.templateType || ""}
                          locked={locked}
                          required={false}
                        />
                        <CostInput
                          label="Change reason"
                          name="changeReason"
                          type="text"
                          value={costVersion.changeReason || ""}
                          locked={locked}
                          required={false}
                        />
                        <CostInput
                          label="Notes"
                          name="notes"
                          type="text"
                          value={costVersion.notes || ""}
                          locked={locked}
                          required={false}
                        />
                        <button
                          className="rounded-xl bg-jade px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={locked}
                        >
                          {locked ? "Locked by order" : "Save changes"}
                        </button>
                      </form>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <p className="text-[11px] text-stone-400">
                          Created{" "}
                          {costVersion.createdAt.toLocaleString("en-GB")}
                          {costVersion.updatedAt > costVersion.createdAt
                            ? ` · updated ${costVersion.updatedAt.toLocaleString("en-GB")}`
                            : ""}
                        </p>
                        <form action={deleteProductCostAction}>
                          <input
                            type="hidden"
                            name="id"
                            value={costVersion.id}
                          />
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={locked}
                          >
                            <Trash2 size={13} /> Delete version
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
                {!product.costVersions.length && (
                  <p className="rounded-xl border border-dashed p-4 text-center text-sm text-stone-400">
                    No cost version saved for this product.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Duplicate a complete cost setup</h2>
        <p className="mt-1 text-sm text-stone-500">
          Copy materials, labour, packaging, other direct costs, wastage, maker
          payment, equipment allocation, and every itemized component directly
          to another product. The destination does not need an existing cost
          version.
        </p>
        <form
          action={duplicateProductCostSetupAction}
          className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(180px,1fr)_auto] sm:items-end"
        >
          <label className="text-xs text-stone-500">
            Copy from cost version
            <select
              className="field mt-1"
              name="sourceProductCostVersionId"
              required
            >
              <option value="">Choose source</option>
              {allProducts.flatMap((product) =>
                product.costVersions.map((costVersion, index) => (
                  <option value={costVersion.id} key={costVersion.id}>
                    {product.sku} ·{" "}
                    {costVersion.effectiveFrom.toLocaleDateString("en-GB")}
                    {index === 0 ? " · latest" : ""}
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Duplicate to product
            <select className="field mt-1" name="targetProductId" required>
              <option value="">Choose destination product</option>
              {allProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} · {product.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Effective from
            <input
              className="field mt-1"
              name="effectiveFrom"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm text-white">
            <Copy size={15} /> Duplicate full setup
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Material components</h2>
        <p className="mt-1 text-xs text-stone-500">
          Yarn, lining, handles, base, closure, packaging, labels, consumables,
          and other direct materials remain itemized. Calculator uses only the
          latest cost version for each product; deleting a component from an
          older version does not change the current plan.
        </p>
        <form
          action={createProductMaterialAction}
          className="mt-4 grid gap-3 sm:grid-cols-5"
        >
          <label className="text-xs text-stone-500">
            Cost version
            <select className="field mt-1" name="productCostVersionId" required>
              {allProducts.flatMap((p) =>
                p.costVersions
                  .filter((c) => c._count.orderItems === 0)
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {p.sku} · {c.effectiveFrom.toLocaleDateString("en-GB")}
                    </option>
                  )),
              )}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Component type
            <input
              className="field mt-1"
              name="componentType"
              placeholder="Example: YARN"
              required
            />
          </label>
          <label className="text-xs text-stone-500">
            Description (optional)
            <input className="field mt-1" name="description" />
          </label>
          <label className="text-xs text-stone-500">
            Quantity used
            <input
              className="field mt-1"
              name="quantity"
              type="number"
              step="0.01"
              defaultValue="1"
            />
          </label>
          <label className="text-xs text-stone-500">
            Unit cost (TRY)
            <input
              className="field mt-1"
              name="unitCostTry"
              type="number"
              step="0.01"
              defaultValue="0"
            />
          </label>
          <button
            className="rounded-xl bg-jade px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={!hasEditableCostVersions}
          >
            Add component
          </button>
        </form>
        <div className="mt-5 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="p-3">Product / cost version</th>
                <th>Edit component</th>
                <th>Total material cost</th>
                <th>Copy to another product</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.flatMap((product) =>
                product.costVersions.flatMap((costVersion, versionIndex) =>
                  costVersion.materialComponents.map((component) => {
                    const locked = costVersion._count.orderItems > 0;
                    const copyTargets = allProducts
                      .filter(
                        (targetProduct) => targetProduct.id !== product.id,
                      )
                      .map((targetProduct) => ({
                        id: targetProduct.id,
                        label: targetProduct.sku,
                      }));
                    return (
                      <tr className="border-t align-top" key={component.id}>
                        <td className="p-3">
                          <strong>{product.sku}</strong>
                          <span className="mt-1 block text-xs text-stone-500">
                            {costVersion.effectiveFrom.toLocaleDateString(
                              "en-GB",
                            )}
                            {versionIndex === 0
                              ? " · latest (Calculator)"
                              : " · historical"}
                          </span>
                        </td>
                        <td
                          className="py-3 pr-3"
                          id={`material-${component.id}`}
                        >
                          <form
                            action={updateProductMaterialAction}
                            className="grid min-w-[420px] grid-cols-2 gap-2"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={component.id}
                            />
                            <input
                              className="field py-2 text-xs"
                              name="componentType"
                              defaultValue={component.componentType}
                              aria-label="Component type"
                              disabled={locked}
                              required
                            />
                            <input
                              className="field py-2 text-xs"
                              name="description"
                              defaultValue={component.description || ""}
                              placeholder="Description"
                              aria-label="Component description"
                              disabled={locked}
                            />
                            <input
                              className="field py-2 text-xs"
                              name="quantity"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={component.quantity.toString()}
                              aria-label="Quantity used"
                              disabled={locked}
                              required
                            />
                            <input
                              className="field py-2 text-xs"
                              name="unitCostTry"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={component.unitCostTry.toString()}
                              aria-label="Unit cost TRY"
                              disabled={locked}
                              required
                            />
                            <button
                              className="col-span-2 rounded-lg border bg-white px-3 py-2 text-xs disabled:opacity-40"
                              disabled={locked}
                            >
                              {locked
                                ? "Locked by order"
                                : "Save component changes"}
                            </button>
                          </form>
                        </td>
                        <td className="py-3 font-semibold">
                          ₺{component.totalCostTry.toFixed(2)}
                        </td>
                        <td className="py-3 pr-3">
                          {copyTargets.length ? (
                            <form
                              action={copyProductMaterialAction}
                              className="flex min-w-[300px] gap-2"
                            >
                              <input
                                type="hidden"
                                name="sourceId"
                                value={component.id}
                              />
                              <select
                                className="field py-2 text-xs"
                                name="targetProductId"
                                aria-label={`Copy ${component.componentType} to product`}
                                required
                              >
                                <option value="">Choose destination</option>
                                {copyTargets.map((target) => (
                                  <option key={target.id} value={target.id}>
                                    {target.label}
                                  </option>
                                ))}
                              </select>
                              <button className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs">
                                <Copy size={13} /> Copy
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-stone-400">
                              No other product is available.
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <form action={deleteProductMaterialAction}>
                            <input
                              type="hidden"
                              name="id"
                              value={component.id}
                            />
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-40"
                              disabled={locked}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  }),
                ),
              )}
            </tbody>
          </table>
          {!allProducts.some((product) =>
            product.costVersions.some(
              (costVersion) => costVersion.materialComponents.length > 0,
            ),
          ) && (
            <p className="p-6 text-center text-sm text-stone-500">
              No material components have been added yet.
            </p>
          )}
        </div>
      </section>

      {!connection ? (
        <section className="card p-10 text-center">
          <PackageSearch className="mx-auto text-stone-300" size={38} />
          <h2 className="mt-4 font-semibold">
            Connect Etsy before importing products
          </h2>
          <Link
            href="/settings/etsy"
            className="mt-5 inline-flex rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white"
          >
            Open Etsy settings
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Boxes />}
              label="Imported listings"
              value={String(listings.length)}
              note="All Etsy listing states"
            />
            <Metric
              icon={<Tag />}
              label="Active on Etsy"
              value={String(active)}
              note={`${listings.length - active} inactive, draft, sold or expired`}
            />
            <Metric
              icon={<CircleDollarSign />}
              label="Local costs linked"
              value={`${withLocalCosts}/${listings.length}`}
              note="Required for profit calculations"
            />
            <Metric
              icon={<Ruler />}
              label="Item dimensions"
              value={`${withDimensions}/${listings.length}`}
              note="Etsy item data, not packed parcels"
            />
          </section>

          {listings.length === 0 && (
            <section className="card p-10 text-center">
              <PackageSearch className="mx-auto text-stone-300" size={38} />
              <h2 className="mt-4 font-semibold">
                No Etsy listings have been synchronized
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Use “Sync Etsy listings” above. Connecting OAuth alone does not
                backfill an older deployment.
              </p>
            </section>
          )}

          <section className="grid gap-5 lg:grid-cols-2">
            {listings.map((listing) => {
              const image = listing.images[0];
              const localProduct = listing.productLink?.product;
              const latestCost = localProduct?.costVersions[0];
              const latestCostTotal = latestCost
                ? latestCost.materialCostTry
                    .plus(
                      latestCost.materialCostTry
                        .mul(latestCost.wastageRate)
                        .div(100),
                    )
                    .plus(
                      latestCost.laborHours.mul(latestCost.laborHourlyRateTry),
                    )
                    .plus(latestCost.packagingCostTry)
                    .plus(latestCost.additionalDirectCostTry)
                    .plus(latestCost.additionalMakerPaymentTry)
                    .plus(latestCost.allocatedEquipmentCostTry)
                : null;
              const variationCount = inventoryProductCount(
                listing.inventorySummary,
              );
              const dimensions = formatDimensions(listing);
              const pricing = resolveListingPricing(listing);
              return (
                <article className="card overflow-hidden" key={listing.id}>
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    <div className="relative min-h-48 bg-stone-100 sm:min-h-full">
                      {image ? (
                        <Image
                          src={image.urlFull}
                          alt={listing.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 180px"
                          className="object-cover"
                        />
                      ) : (
                        <PackageSearch
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-300"
                          size={34}
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`pill ${listing.state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-600"}`}
                          >
                            {listing.state}
                          </span>
                          <h2 className="mt-3 font-semibold leading-6">
                            {listing.title}
                          </h2>
                          <p className="mt-1 text-xs text-stone-400">
                            Etsy #{listing.etsyListingId} · SKU{" "}
                            {listing.sku || "not set"}
                          </p>
                        </div>
                        {listing.url && (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open listing on Etsy"
                            className="text-stone-400 hover:text-jade"
                          >
                            <ExternalLink size={17} />
                          </a>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <Datum
                          label="Original price"
                          value={formatCurrency(
                            pricing.originalPrice.toString(),
                            pricing.currency,
                          )}
                        />
                        <Datum
                          label="Current buyer price"
                          value={formatCurrency(
                            pricing.discountedPrice.toString(),
                            pricing.currency,
                          )}
                        />
                        <Datum
                          label="Discount"
                          value={
                            pricing.discountPercentage.gt(0)
                              ? `${pricing.discountPercentage.toDecimalPlaces(2).toString()}% · ${pricing.source === "ETSY" ? "from Etsy" : "local override"}`
                              : "No active discount"
                          }
                        />
                        <Datum
                          label="Quantity"
                          value={String(listing.quantity)}
                        />
                        <Datum
                          label="Variations"
                          value={String(variationCount)}
                        />
                        <Datum
                          label="Favorites"
                          value={String(listing.favorerCount || 0)}
                        />
                        <Datum
                          label="Item dimensions"
                          value={dimensions || "Not supplied by Etsy"}
                        />
                        <Datum
                          label="Item weight"
                          value={
                            listing.itemWeight
                              ? `${listing.itemWeight.toString()} ${listing.itemWeightUnit || ""}`.trim()
                              : "Not supplied by Etsy"
                          }
                        />
                        <Datum
                          label="Processing"
                          value={formatProcessing(
                            listing.processingMinDays,
                            listing.processingMaxDays,
                          )}
                        />
                        <Datum
                          label="Shipping profile"
                          value={listing.shippingProfileId || "Not supplied"}
                        />
                      </div>

                      <form
                        action={setListingDiscountAction}
                        className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3"
                      >
                        <input
                          type="hidden"
                          name="etsyListingId"
                          value={listing.etsyListingId}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <label className="min-w-0 flex-1">
                            <span className="mb-1.5 block text-xs font-medium text-stone-600">
                              Local discount override
                            </span>
                            <div className="relative">
                              <input
                                className="field pr-8"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                name="manualDiscountPercentage"
                                defaultValue={
                                  listing.manualDiscountPercentage?.toString() ||
                                  ""
                                }
                                placeholder={
                                  listing.buyerHasDiscount
                                    ? "Using Etsy discount"
                                    : "No override"
                                }
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                                %
                              </span>
                            </div>
                          </label>
                          <button className="rounded-xl border bg-white px-3 py-2.5 text-xs font-medium">
                            Save discount
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-stone-500">
                          Leave blank to use Etsy&apos;s BuyerPrice discount
                          automatically. The override changes only this
                          dashboard, never your Etsy shop.
                        </p>
                      </form>

                      {(listing.materials.length > 0 ||
                        listing.tags.length > 0) && (
                        <div className="mt-4 space-y-2 text-xs text-stone-500">
                          {listing.materials.length > 0 && (
                            <p>
                              <strong className="text-stone-700">
                                Materials:
                              </strong>{" "}
                              {listing.materials.join(", ")}
                            </p>
                          )}
                          {listing.tags.length > 0 && (
                            <p>
                              <strong className="text-stone-700">Tags:</strong>{" "}
                              {listing.tags.join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      <div
                        className={`mt-5 rounded-xl border p-3 text-xs ${localProduct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                      >
                        {localProduct ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                Linked to {localProduct.sku} ·{" "}
                                {latestCost
                                  ? `cost version ${latestCost.effectiveFrom.toLocaleDateString("en-GB")}`
                                  : "cost version still missing"}
                              </span>
                              <div className="flex flex-wrap gap-3">
                                {latestCost && (
                                  <Link
                                    href={`#cost-version-${latestCost.id}`}
                                    className="font-medium underline"
                                  >
                                    View / edit costs
                                  </Link>
                                )}
                                <Link
                                  href="/calculator"
                                  className="font-medium underline"
                                >
                                  Use in calculator →
                                </Link>
                              </div>
                            </div>
                            {latestCost && latestCostTotal && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-emerald-200 pt-3 sm:grid-cols-4">
                                <CostDatum
                                  label="Materials"
                                  value={`₺${latestCost.materialCostTry.toFixed(2)}`}
                                />
                                <CostDatum
                                  label="Labour"
                                  value={`${latestCost.laborHours.toFixed(2)} h × ₺${latestCost.laborHourlyRateTry.toFixed(2)}`}
                                />
                                <CostDatum
                                  label="Packaging"
                                  value={`₺${latestCost.packagingCostTry.toFixed(2)}`}
                                />
                                <CostDatum
                                  label="Other direct"
                                  value={`₺${latestCost.additionalDirectCostTry.toFixed(2)}`}
                                />
                                <CostDatum
                                  label="Wastage"
                                  value={`${latestCost.wastageRate.toFixed(2)}%`}
                                />
                                <CostDatum
                                  label="Maker + equipment"
                                  value={`₺${latestCost.additionalMakerPaymentTry.plus(latestCost.allocatedEquipmentCostTry).toFixed(2)}`}
                                />
                                <CostDatum
                                  label="Template"
                                  value={
                                    latestCost.templateType || "Not entered"
                                  }
                                />
                                <CostDatum
                                  label="Direct total"
                                  value={`₺${latestCostTotal.toFixed(2)}`}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <AlertTriangle
                              className="mr-1.5 inline"
                              size={14}
                            />
                            Not linked to a local product, so costs, package,
                            shipping and tariff calculations are not yet
                            product-specific.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {listings.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <AlertTriangle className="mr-2 inline" size={16} />
              Etsy item weight and dimensions describe the listing item.
              Shipping must use packed length, width, height and actual packed
              weight. Tariffs also require destination, HS code, origin and
              declared value; Etsy cannot safely infer those values.
              <Link href="/etsy-import" className="ml-2 font-medium underline">
                Link listings to local products →
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CostInput({
  label,
  name,
  value,
  type = "number",
  locked,
  readOnly = false,
  required = true,
}: {
  label: string;
  name: string;
  value: string;
  type?: "number" | "text" | "date";
  locked: boolean;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <input
        className="field mt-1 disabled:bg-stone-100 disabled:text-stone-400"
        name={name}
        type={type}
        defaultValue={value}
        disabled={locked}
        readOnly={readOnly}
        required={required}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card p-5">
      <span className="text-jade [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <p className="mt-3 text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{note}</p>
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[.12em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-medium text-stone-700">{value}</p>
    </div>
  );
}

function CostDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[.1em] text-emerald-700/60">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-emerald-900">
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

function formatDimensions(listing: {
  itemLength: { toString(): string } | null;
  itemWidth: { toString(): string } | null;
  itemHeight: { toString(): string } | null;
  itemDimensionsUnit: string | null;
}) {
  if (!listing.itemLength || !listing.itemWidth || !listing.itemHeight)
    return null;
  return `${listing.itemLength.toString()} × ${listing.itemWidth.toString()} × ${listing.itemHeight.toString()} ${listing.itemDimensionsUnit || ""}`.trim();
}

function formatProcessing(min: number | null, max: number | null) {
  if (min == null && max == null) return "Not supplied";
  if (min === max || max == null) return `${min} day${min === 1 ? "" : "s"}`;
  return `${min ?? max}–${max} days`;
}

function inventoryProductCount(value: unknown) {
  if (!value || typeof value !== "object" || !("products" in value)) return 0;
  const products = (value as { products?: unknown }).products;
  return Array.isArray(products) ? products.length : 0;
}

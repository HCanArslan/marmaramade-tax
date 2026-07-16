import Link from "next/link";
import Decimal from "decimal.js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  await requireAdmin({ redirectTo: "/inventory" });
  const [materials, units, products] = await Promise.all([
    prisma.material.findMany({
      where: { active: true },
      include: { lots: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionUnit.findMany({
      include: { batch: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.product.findMany({
      where: { active: true },
      include: {
        etsyListingLinks: { include: { listing: true } },
      },
      orderBy: { sku: "asc" },
    }),
  ]);

  const activeListings = products.flatMap((product) =>
    product.etsyListingLinks
      .map((link) => link.listing)
      .filter((listing) => listing.state === "active"),
  );
  const etsyQuantity = activeListings.reduce(
    (sum, listing) => sum + listing.quantity,
    0,
  );
  const availableUnits = units.filter(
    (unit) => unit.inventoryStatus === "AVAILABLE",
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">
          Catalog, Etsy availability, and physical stock
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Inventory</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
          A product is a design/catalog record. Etsy quantity is what buyers can
          currently purchase. A finished unit is a physical item recorded after
          production. These counts are compared here but never silently copied
          into one another.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Catalog products"
          value={String(products.length)}
          note="Local products linked from Etsy"
        />
        <Metric
          label="Active Etsy listings"
          value={String(activeListings.length)}
          note="Listing records, not physical units"
        />
        <Metric
          label="Etsy sellable quantity"
          value={String(etsyQuantity)}
          note="Latest synchronized Etsy quantity"
        />
        <Metric
          label="Recorded finished units"
          value={String(availableUnits.length)}
          note="Created through Production"
        />
        <Metric
          label="Raw materials"
          value={String(materials.length)}
          note="Materials with purchase-lot balances"
        />
      </section>

      {products.length > 0 && availableUnits.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Your {products.length} products are present, but no physical finished
          units have been recorded. This does not mean Etsy sync failed. If the
          products already exist physically, record each item under{" "}
          <Link className="font-semibold underline" href="/production">
            Production
          </Link>
          . Do not create units merely to force the numbers to match Etsy.
        </div>
      )}

      <section className="card overflow-x-auto">
        <div className="border-b p-5">
          <h2 className="font-semibold">Product and Etsy reconciliation</h2>
          <p className="mt-1 text-xs text-stone-500">
            A warning means the marketplace quantity and recorded physical stock
            need review; it is not automatically an error.
          </p>
        </div>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-500">
              <th className="p-4">Local product</th>
              <th>Etsy listing</th>
              <th>Etsy state</th>
              <th>Etsy quantity</th>
              <th>Physical available</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const listings = product.etsyListingLinks.map(
                (link) => link.listing,
              );
              const active = listings.filter(
                (listing) => listing.state === "active",
              );
              const listedQuantity = active.reduce(
                (sum, listing) => sum + listing.quantity,
                0,
              );
              const physicalQuantity = availableUnits.filter(
                (unit) => unit.batch.productTemplateId === product.id,
              ).length;
              const needsReview = listedQuantity !== physicalQuantity;
              return (
                <tr className="border-b" key={product.id}>
                  <td className="p-4 font-medium">
                    {product.sku} · {product.title}
                  </td>
                  <td>
                    {listings.length
                      ? listings
                          .map((listing) => `#${listing.etsyListingId}`)
                          .join(", ")
                      : "Not linked"}
                  </td>
                  <td>
                    {listings.length
                      ? listings.map((listing) => listing.state).join(", ")
                      : "—"}
                  </td>
                  <td>{listedQuantity}</td>
                  <td>{physicalQuantity}</td>
                  <td>
                    <span
                      className={`pill ${needsReview ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                    >
                      {needsReview ? "Review quantities" : "Matched"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!products.length && (
          <p className="p-8 text-center text-sm text-stone-500">
            No products have been imported or created.
          </p>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Material balances">
          {materials.length ? (
            materials.map((material) => (
              <p className="border-b py-3 text-sm" key={material.id}>
                {material.sku} · {material.name}
                <strong className="float-right">
                  {material.lots
                    .reduce(
                      (sum, lot) => sum.plus(lot.remaining.toString()),
                      new Decimal(0),
                    )
                    .toFixed()}{" "}
                  {material.unit}
                </strong>
              </p>
            ))
          ) : (
            <Empty
              href="/materials"
              label="No materials recorded. Add purchase-lot stock under Materials."
            />
          )}
        </Box>
        <Box title="Recorded finished units">
          {units.length ? (
            units.map((unit) => (
              <p className="border-b py-3 text-sm" key={unit.id}>
                {unit.localSku} · {unit.batch.batchCode}
                <strong className="float-right">{unit.inventoryStatus}</strong>
              </p>
            ))
          ) : (
            <Empty
              href="/production"
              label="No physical units recorded. Complete a production unit when an item actually exists."
            />
          )}
        </Box>
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
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{note}</p>
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
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ href, label }: { href: string; label: string }) {
  return (
    <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
      {label}{" "}
      <Link className="font-medium underline" href={href}>
        Open page
      </Link>
    </p>
  );
}

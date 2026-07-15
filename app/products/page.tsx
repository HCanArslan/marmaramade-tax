import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  ExternalLink,
  PackageSearch,
  RefreshCw,
  Ruler,
  Tag,
} from "lucide-react";
import { syncEtsyAction } from "@/app/actions/etsy";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getActiveConnection } from "@/lib/etsy/auth";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  await requireAdmin({ redirectTo: "/products" });
  const connection = await getActiveConnection();
  const listings = connection
    ? await prisma.etsyListing.findMany({
        where: { connectionId: connection.id },
        include: {
          images: { orderBy: { rank: "asc" }, take: 1 },
          productLink: {
            include: {
              product: {
                include: { costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
              },
            },
          },
        },
        orderBy: [{ state: "asc" }, { title: "asc" }],
      })
    : [];

  const active = listings.filter((listing) => listing.state === "active").length;
  const withLocalCosts = listings.filter((listing) => listing.productLink?.product.costVersions.length).length;
  const withDimensions = listings.filter((listing) => listing.itemLength && listing.itemWidth && listing.itemHeight).length;

  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Etsy catalog + local cost foundation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">Products</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
            Every synchronized Etsy listing is shown here. Etsy data stays read-only; packed parcel dimensions,
            production costs, carrier quotes, HS codes, taxes and destination tariffs remain explicit local inputs.
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

      {!connection ? (
        <section className="card p-10 text-center">
          <PackageSearch className="mx-auto text-stone-300" size={38} />
          <h2 className="mt-4 font-semibold">Connect Etsy before importing products</h2>
          <Link href="/settings/etsy" className="mt-5 inline-flex rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white">
            Open Etsy settings
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Boxes />} label="Imported listings" value={String(listings.length)} note="All Etsy listing states" />
            <Metric icon={<Tag />} label="Active on Etsy" value={String(active)} note={`${listings.length - active} inactive, draft, sold or expired`} />
            <Metric icon={<CircleDollarSign />} label="Local costs linked" value={`${withLocalCosts}/${listings.length}`} note="Required for profit calculations" />
            <Metric icon={<Ruler />} label="Item dimensions" value={`${withDimensions}/${listings.length}`} note="Etsy item data, not packed parcels" />
          </section>

          {listings.length === 0 && (
            <section className="card p-10 text-center">
              <PackageSearch className="mx-auto text-stone-300" size={38} />
              <h2 className="mt-4 font-semibold">No Etsy listings have been synchronized</h2>
              <p className="mt-2 text-sm text-stone-500">Use “Sync Etsy listings” above. Connecting OAuth alone does not backfill an older deployment.</p>
            </section>
          )}

          <section className="grid gap-5 lg:grid-cols-2">
            {listings.map((listing) => {
              const image = listing.images[0];
              const localProduct = listing.productLink?.product;
              const variationCount = inventoryProductCount(listing.inventorySummary);
              const dimensions = formatDimensions(listing);
              return (
                <article className="card overflow-hidden" key={listing.id}>
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    <div className="relative min-h-48 bg-stone-100 sm:min-h-full">
                      {image ? (
                        <Image src={image.urlFull} alt={listing.title} fill sizes="(max-width: 640px) 100vw, 180px" className="object-cover" />
                      ) : (
                        <PackageSearch className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-300" size={34} />
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`pill ${listing.state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-600"}`}>
                            {listing.state}
                          </span>
                          <h2 className="mt-3 font-semibold leading-6">{listing.title}</h2>
                          <p className="mt-1 text-xs text-stone-400">Etsy #{listing.etsyListingId} · SKU {listing.sku || "not set"}</p>
                        </div>
                        {listing.url && (
                          <a href={listing.url} target="_blank" rel="noreferrer" aria-label="Open listing on Etsy" className="text-stone-400 hover:text-jade">
                            <ExternalLink size={17} />
                          </a>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <Datum label="Price" value={formatCurrency(listing.priceAmount.toString(), listing.priceCurrency)} />
                        <Datum label="Quantity" value={String(listing.quantity)} />
                        <Datum label="Variations" value={String(variationCount)} />
                        <Datum label="Favorites" value={String(listing.favorerCount || 0)} />
                        <Datum label="Item dimensions" value={dimensions || "Not supplied by Etsy"} />
                        <Datum label="Item weight" value={listing.itemWeight ? `${listing.itemWeight.toString()} ${listing.itemWeightUnit || ""}`.trim() : "Not supplied by Etsy"} />
                        <Datum label="Processing" value={formatProcessing(listing.processingMinDays, listing.processingMaxDays)} />
                        <Datum label="Shipping profile" value={listing.shippingProfileId || "Not supplied"} />
                      </div>

                      {(listing.materials.length > 0 || listing.tags.length > 0) && (
                        <div className="mt-4 space-y-2 text-xs text-stone-500">
                          {listing.materials.length > 0 && <p><strong className="text-stone-700">Materials:</strong> {listing.materials.join(", ")}</p>}
                          {listing.tags.length > 0 && <p><strong className="text-stone-700">Tags:</strong> {listing.tags.join(", ")}</p>}
                        </div>
                      )}

                      <div className={`mt-5 rounded-xl border p-3 text-xs ${localProduct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                        {localProduct ? (
                          <>Linked to {localProduct.sku} · {localProduct.costVersions.length ? "latest cost version available" : "cost version still missing"}</>
                        ) : (
                          <><AlertTriangle className="mr-1.5 inline" size={14} />Not linked to a local product, so costs, package, shipping and tariff calculations are not yet product-specific.</>
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
              <AlertTriangle className="mr-2 inline" size={16} />Etsy item weight and dimensions describe the listing item. Shipping must use packed length, width, height and actual packed weight. Tariffs also require destination, HS code, origin and declared value; Etsy cannot safely infer those values.
              <Link href="/etsy-import" className="ml-2 font-medium underline">Link listings to local products →</Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="card p-5"><span className="text-jade [&>svg]:h-4 [&>svg]:w-4">{icon}</span><p className="mt-3 text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-400">{note}</p></div>;
}

function Datum({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-[.12em] text-stone-400">{label}</p><p className="mt-1 text-xs font-medium text-stone-700">{value}</p></div>;
}

function formatCurrency(value: string, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}

function formatDimensions(listing: { itemLength: { toString(): string } | null; itemWidth: { toString(): string } | null; itemHeight: { toString(): string } | null; itemDimensionsUnit: string | null }) {
  if (!listing.itemLength || !listing.itemWidth || !listing.itemHeight) return null;
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

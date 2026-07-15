import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireEtsySecrets } from "@/lib/env";
import { getActiveConnection, getValidAccessToken } from "@/lib/etsy/auth";
import { etsyGet } from "@/lib/etsy/client";
import { ETSY_LISTING_STATES, EtsyEndpoints } from "@/lib/etsy/endpoints";
import { collectOffsetPages } from "@/lib/etsy/pagination";
import { etsyInventorySchema, etsyLedgerEntrySchema, etsyListingImageSchema, etsyListingSchema, etsyPaymentSchema, etsyReceiptSchema, etsyShopSchema, paginatedSchema, type EtsyListingPayload } from "@/lib/etsy/schemas";
import { mapLedgerEntry } from "@/lib/etsy/mappers";
import { withEtsyRetry } from "@/lib/etsy/rate-limit";
import { assertReadOnlyEtsyScopes } from "@/lib/etsy/scopes";
import { Prisma } from "@/generated/prisma/client";

export const ETSY_SYNC_TYPES = ["INITIAL_FULL", "INCREMENTAL", "LISTINGS_ONLY", "ORDERS_ONLY", "PAYMENTS_ONLY", "LEDGER_ONLY"] as const;
export type EtsySyncType = (typeof ETSY_SYNC_TYPES)[number];
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const date = (seconds?: number | null) => seconds ? new Date(seconds * 1000) : null;
const amount = (money?: { amount: number; divisor: number }) => new Prisma.Decimal(money ? money.amount : 0).div(money?.divisor || 1);
const decimal = (value?: number | null) => value == null ? null : new Prisma.Decimal(value);

export async function syncEtsy(type: EtsySyncType) {
  const connection = await getActiveConnection(); if (!connection) throw new Error("Etsy is not connected.");
  const scopes = connection.scopes.split(/\s+/); try { assertReadOnlyEtsyScopes(scopes); } catch { await prisma.etsyConnection.update({ where: { id: connection.id }, data: { status: "SCOPE_VIOLATION" } }); throw new Error("Etsy synchronization disabled because an unapproved scope was detected."); }
  const env = requireEtsySecrets(); const accessToken = await getValidAccessToken(connection.id);
  const run = await prisma.etsySyncRun.create({ data: { connectionId: connection.id, syncType: type } });
  const get = async <T>(path: string) => withEtsyRetry(async () => (await etsyGet<T>(path, { accessToken, apiKeyString: env.ETSY_API_KEYSTRING, sharedSecret: env.ETSY_SHARED_SECRET })).data);
  try {
    const wantsListings = ["INITIAL_FULL","INCREMENTAL","LISTINGS_ONLY"].includes(type);
    const wantsOrders = ["INITIAL_FULL","INCREMENTAL","ORDERS_ONLY"].includes(type);
    const wantsLedger = ["INITIAL_FULL","INCREMENTAL","PAYMENTS_ONLY","LEDGER_ONLY"].includes(type);
    const shop = etsyShopSchema.parse(await get(EtsyEndpoints.shop(connection.shopId)));
    await prisma.etsyConnection.update({ where: { id: connection.id }, data: { shopName: shop.shop_name, shopTitle: shop.title, shopCurrency: shop.currency_code, shopUrl: shop.url, lastSuccessfulApiCallAt: new Date() } });
    if (wantsListings) await importListings(connection.id, run.id, connection.shopId, get);
    if (wantsOrders) await importReceipts(connection.id, run.id, connection.shopId, get);
    if (wantsLedger) await importLedgerAndPayments(connection.id, run.id, connection.shopId, get);
    const counts = await prisma.etsySyncRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", completedAt: new Date() } });
    await prisma.etsyConnection.update({ where: { id: connection.id }, data: { lastSuccessfulSyncAt: new Date() } });
    return counts;
  } catch (error) {
    await prisma.etsySyncError.create({ data: { syncRunId: run.id, resource: "SYNC", code: error instanceof Error ? error.name : "ERROR", message: "Etsy synchronization could not complete.", retryable: false } });
    await prisma.etsySyncRun.update({ where: { id: run.id }, data: { status: "PARTIAL", completedAt: new Date() } });
    throw error;
  }
}

async function importListings(connectionId: string, syncRunId: string, shopId: string, get: <T>(path: string) => Promise<T>) {
  const schema = paginatedSchema(etsyListingSchema);
  const listings: EtsyListingPayload[] = [];
  for (const state of ETSY_LISTING_STATES) {
    const pages = await collectOffsetPages(async (offset, limit) => schema.parse(await get(EtsyEndpoints.listings(shopId, state, offset, limit))));
    listings.push(...pages.results);
  }
  for (const listing of listings) {
    const sourceHash = hash(listing); const existing = await prisma.etsyListing.findUnique({ where: { etsyListingId: String(listing.listing_id) }, select: { sourceHash: true } });
    const data = {
      syncRunId,
      sku: listing.skus?.[0] || null,
      title: listing.title,
      description: listing.description,
      state: listing.state,
      priceAmount: amount(listing.price),
      priceCurrency: listing.price.currency_code,
      quantity: listing.quantity,
      taxonomyId: listing.taxonomy_id ? String(listing.taxonomy_id) : null,
      shopSectionId: listing.shop_section_id ? String(listing.shop_section_id) : null,
      shippingProfileId: listing.shipping_profile_id ? String(listing.shipping_profile_id) : null,
      returnPolicyId: listing.return_policy_id ? String(listing.return_policy_id) : null,
      url: listing.url,
      favorerCount: listing.num_favorers,
      listingType: listing.listing_type || listing.type,
      isTaxable: listing.is_taxable,
      nonTaxable: listing.non_taxable,
      isCustomizable: listing.is_customizable,
      isPersonalizable: listing.is_personalizable,
      tags: listing.tags || [],
      materials: listing.materials || [],
      itemWeight: decimal(listing.item_weight),
      itemWeightUnit: listing.item_weight_unit,
      itemLength: decimal(listing.item_length),
      itemWidth: decimal(listing.item_width),
      itemHeight: decimal(listing.item_height),
      itemDimensionsUnit: listing.item_dimensions_unit,
      processingMinDays: listing.processing_min,
      processingMaxDays: listing.processing_max,
      sourceCreatedAt: date(listing.creation_timestamp),
      sourceUpdatedAt: date(listing.updated_timestamp),
      sourceEndingAt: date(listing.ending_timestamp),
      sourceHash,
    };
    await prisma.etsyListing.upsert({
      where: { etsyListingId: String(listing.listing_id) },
      update: { ...data, lastImportedAt: new Date(), ...(existing?.sourceHash !== sourceHash ? { lastChangedAt: new Date() } : {}) },
      create: { connectionId, etsyListingId: String(listing.listing_id), ...data },
    });
    const [images, inventory] = await Promise.all([get(EtsyEndpoints.listingImages(String(listing.listing_id))).then((value) => paginatedSchema(etsyListingImageSchema).parse(value)), get(EtsyEndpoints.listingInventory(String(listing.listing_id))).then((value) => etsyInventorySchema.parse(value))]);
    await prisma.etsyListing.update({ where: { etsyListingId: String(listing.listing_id) }, data: { inventorySummary: JSON.parse(JSON.stringify(inventory)) as Prisma.InputJsonValue } });
    for (const image of images.results) await prisma.etsyListingImage.upsert({ where: { etsyImageId: String(image.listing_image_id) }, update: { rank: image.rank, urlFull: image.url_fullxfull, urlThumbnail: image.url_170x135, sourceUpdatedAt: date(image.updated_timestamp), lastImportedAt: new Date() }, create: { etsyImageId: String(image.listing_image_id), etsyListingId: String(listing.listing_id), rank: image.rank, urlFull: image.url_fullxfull, urlThumbnail: image.url_170x135, sourceUpdatedAt: date(image.updated_timestamp) } });
    await ensureLocalProductLink(String(listing.listing_id), listing);
  }
  await prisma.etsySyncRun.update({ where: { id: syncRunId }, data: { listingsImported: listings.length } });
}

async function importReceipts(connectionId: string, syncRunId: string, shopId: string, get: <T>(path: string) => Promise<T>) {
  const schema = paginatedSchema(etsyReceiptSchema); const pages = await collectOffsetPages(async (offset, limit) => schema.parse(await get(EtsyEndpoints.receipts(shopId, offset, limit))));
  for (const receipt of pages.results) {
    const id = String(receipt.receipt_id); const sourceHash = hash(receipt); const existing = await prisma.etsyReceipt.findUnique({ where: { etsyReceiptId: id }, select: { sourceHash: true, localOrderId: true } }); const changed = Boolean(existing && existing.sourceHash !== sourceHash);
    await prisma.etsyReceipt.upsert({ where: { etsyReceiptId: id }, update: { syncRunId, sourceUpdatedAt: date(receipt.update_timestamp), paymentStatus: receipt.is_paid ? "PAID" : "UNPAID", shipmentStatus: receipt.is_shipped ? "SHIPPED" : "OPEN", destinationCountry: receipt.country_iso, destinationRegion: receipt.state, postalCodePrefix: receipt.zip?.slice(0, 3), subtotalAmount: amount(receipt.subtotal), shippingAmount: amount(receipt.total_shipping_cost), discountAmount: amount(receipt.discount_amt), taxAmount: amount(receipt.total_tax_cost), totalAmount: amount(receipt.grandtotal), currency: receipt.grandtotal.currency_code, sourceHash, lastImportedAt: new Date(), needsReconciliation: changed && Boolean(existing?.localOrderId), ...(changed ? { lastChangedAt: new Date() } : {}) }, create: { connectionId, syncRunId, etsyReceiptId: id, sourceCreatedAt: date(receipt.create_timestamp)!, sourceUpdatedAt: date(receipt.update_timestamp), paymentStatus: receipt.is_paid ? "PAID" : "UNPAID", shipmentStatus: receipt.is_shipped ? "SHIPPED" : "OPEN", destinationCountry: receipt.country_iso, destinationRegion: receipt.state, postalCodePrefix: receipt.zip?.slice(0, 3), subtotalAmount: amount(receipt.subtotal), shippingAmount: amount(receipt.total_shipping_cost), discountAmount: amount(receipt.discount_amt), giftWrapAmount: 0, taxAmount: amount(receipt.total_tax_cost), totalAmount: amount(receipt.grandtotal), refundAmount: 0, currency: receipt.grandtotal.currency_code, sourceHash } });
    for (const item of receipt.transactions || []) await prisma.etsyReceiptItem.upsert({ where: { etsyTransactionId: String(item.transaction_id) }, update: { title: item.title, sku: item.sku, quantity: item.quantity, priceAmount: amount(item.price), currency: item.price.currency_code, lastImportedAt: new Date() }, create: { etsyTransactionId: String(item.transaction_id), etsyReceiptId: id, etsyListingId: item.listing_id ? String(item.listing_id) : null, title: item.title, sku: item.sku, quantity: item.quantity, priceAmount: amount(item.price), currency: item.price.currency_code } });
  }
  await prisma.etsySyncRun.update({ where: { id: syncRunId }, data: { receiptsImported: pages.results.length } });
}

async function importLedgerAndPayments(connectionId: string, syncRunId: string, shopId: string, get: <T>(path: string) => Promise<T>) {
  const schema = paginatedSchema(etsyLedgerEntrySchema);
  const minCreated = 946684800;
  const maxCreated = Math.floor(Date.now() / 1000);
  const pages = await collectOffsetPages(async (offset, limit) => schema.parse(await get(EtsyEndpoints.ledger(shopId, minCreated, maxCreated, offset, limit))));
  for (const entry of pages.results) { const mapping = mapLedgerEntry(entry.reference_type || "", entry.description); const sourceHash = hash(entry); await prisma.etsyLedgerEntry.upsert({ where: { etsyLedgerEntryId: String(entry.entry_id) }, update: { syncRunId, originalDescription: entry.description, mappedCategory: mapping.category, mappingConfidence: mapping.confidence, manualReview: mapping.manualReview, amount: amount(entry.amount), runningBalance: entry.balance ? amount(entry.balance) : null, currency: entry.amount.currency_code, sourceHash, lastImportedAt: new Date() }, create: { connectionId, syncRunId, etsyLedgerEntryId: String(entry.entry_id), etsyLedgerId: entry.ledger_id ? String(entry.ledger_id) : null, entryType: entry.reference_type || "UNKNOWN", originalDescription: entry.description, mappedCategory: mapping.category, mappingConfidence: mapping.confidence, manualReview: mapping.manualReview, amount: amount(entry.amount), runningBalance: entry.balance ? amount(entry.balance) : null, currency: entry.amount.currency_code, sourceCreatedAt: date(entry.create_date)!, sourceHash } }); }
  let paymentCount = 0; const ids = pages.results.map((entry) => String(entry.entry_id));
  for (let index = 0; index < ids.length; index += 100) { const paymentPage = paginatedSchema(etsyPaymentSchema).parse(await get(EtsyEndpoints.ledgerPayments(shopId, ids.slice(index, index + 100)))); for (const payment of paymentPage.results) { paymentCount += 1; await prisma.etsyPayment.upsert({ where: { etsyPaymentId: String(payment.payment_id) }, update: { syncRunId, amount: amount(payment.amount_gross), adjustedAmount: amount(payment.adjusted_gross), feeAmount: amount(payment.amount_fees), netAmount: amount(payment.amount_net), currency: payment.amount_gross.currency_code, paidAt: date(payment.posted_timestamp), sourceHash: hash(payment), lastImportedAt: new Date() }, create: { connectionId, syncRunId, etsyPaymentId: String(payment.payment_id), etsyReceiptId: payment.receipt_id ? String(payment.receipt_id) : null, amount: amount(payment.amount_gross), adjustedAmount: amount(payment.adjusted_gross), shippingAmount: 0, taxAmount: 0, feeAmount: amount(payment.amount_fees), netAmount: amount(payment.amount_net), currency: payment.amount_gross.currency_code, paidAt: date(payment.posted_timestamp), sourceHash: hash(payment) } }); } }
  await prisma.etsySyncRun.update({ where: { id: syncRunId }, data: { ledgerEntriesImported: pages.results.length, paymentsImported: paymentCount } });
}

async function ensureLocalProductLink(etsyListingId: string, listing: EtsyListingPayload) {
  const existingLink = await prisma.etsyListingProductLink.findUnique({ where: { etsyListingId } });
  if (existingLink) return;

  const etsySku = listing.skus?.find((value) => value.trim())?.trim();
  const sku = etsySku || `ETSY-${etsyListingId}`;
  const product = await prisma.product.upsert({
    where: { sku },
    update: {},
    create: {
      sku,
      title: listing.title,
      description: listing.description,
      material: listing.materials?.filter(Boolean).join(", ") || null,
      oneOfOne: listing.quantity <= 1,
      active: listing.state === "active",
      notes: `Automatically created from Etsy listing ${etsyListingId}. Add local costs, packed dimensions and HS code before relying on calculations.`,
    },
  });
  await prisma.etsyListingProductLink.create({
    data: { etsyListingId, productId: product.id, skuConflict: false },
  });
}

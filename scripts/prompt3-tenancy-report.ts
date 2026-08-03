import "dotenv/config";
import pg from "pg";
import { normalizePostgresSslMode } from "../lib/database-url";

const retainedTables = [
  "Product",
  "ProductCostVersion",
  "EtsyConnection",
  "EtsyListing",
  "EtsyReceipt",
  "EtsyPayment",
  "EtsyLedgerEntry",
  "Order",
  "OrderItem",
  "OrderCostSnapshot",
  "OrderCostLine",
  "FeeProfile",
  "ExchangeRateSnapshot",
] as const;

function databaseUrl() {
  const raw =
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL;
  if (!raw) throw new Error("Database URL is missing.");
  return normalizePostgresSslMode(raw);
}

async function scalar(client: pg.Client, sql: string) {
  const result = await client.query<{ value: string }>(sql);
  return result.rows[0]?.value ?? "0";
}

async function counts(client: pg.Client) {
  const result: Record<string, number> = {};
  for (const table of retainedTables) {
    result[table] = Number(
      await scalar(client, `SELECT COUNT(*)::text AS value FROM "${table}"`),
    );
  }
  return result;
}

async function immutableFingerprints(client: pg.Client) {
  return {
    orderCostSnapshots: await scalar(
      client,
      `SELECT md5(COALESCE(string_agg(
        "id" || '|' || "grossRevenueUsd"::text || '|' || "totalCostUsd"::text || '|' ||
        "totalCostTry"::text || '|' || "estimatedProfitUsd"::text || '|' ||
        "estimatedProfitTry"::text || '|' || "assumptionsJson",
        ',' ORDER BY "id"), '')) AS value FROM "OrderCostSnapshot"`,
    ),
    orderCostLines: await scalar(
      client,
      `SELECT md5(COALESCE(string_agg(
        "id" || '|' || "sourceAmount"::text || '|' || "sourceCurrency" || '|' ||
        "convertedAmountUsd"::text || '|' || "convertedAmountTry"::text || '|' ||
        "exchangeRateUsed"::text,
        ',' ORDER BY "id"), '')) AS value FROM "OrderCostLine"`,
    ),
  };
}

async function preflight(client: pg.Client) {
  const duplicateChecks = {
    productSku: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "sku" FROM "Product" GROUP BY "sku" HAVING COUNT(*) > 1) x`)),
    orderNumber: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "orderNumber" FROM "Order" GROUP BY "orderNumber" HAVING COUNT(*) > 1) x`)),
    listingId: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "etsyListingId" FROM "EtsyListing" GROUP BY "etsyListingId" HAVING COUNT(*) > 1) x`)),
    receiptId: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "etsyReceiptId" FROM "EtsyReceipt" GROUP BY "etsyReceiptId" HAVING COUNT(*) > 1) x`)),
    paymentId: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "etsyPaymentId" FROM "EtsyPayment" GROUP BY "etsyPaymentId" HAVING COUNT(*) > 1) x`)),
    ledgerEntryId: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM (SELECT "etsyLedgerEntryId" FROM "EtsyLedgerEntry" GROUP BY "etsyLedgerEntryId" HAVING COUNT(*) > 1) x`)),
  };
  const report = {
    phase: "prompt3-preflight",
    legacyWorkspaceAssignments: Number(
      await scalar(client, `SELECT COUNT(*)::text AS value FROM "LegacyWorkspaceAssignment" WHERE "sourceKey" = 'MARMARAMADE_LEDGER'`),
    ),
    counts: await counts(client),
    immutableFingerprints: await immutableFingerprints(client),
    duplicateChecks,
  };
  if (report.legacyWorkspaceAssignments !== 1) {
    throw new Error("Founder workspace assignment did not resolve exactly once.");
  }
  if (Object.values(duplicateChecks).some((value) => value !== 0)) {
    throw new Error("Unsafe uniqueness collision detected.");
  }
  console.log(JSON.stringify(report));
}

async function postMigration(client: pg.Client) {
  const unassigned: Record<string, number> = {};
  for (const table of retainedTables) {
    unassigned[table] = Number(
      await scalar(
        client,
        `SELECT COUNT(*)::text AS value FROM "${table}" WHERE "workspaceId" IS NULL`,
      ),
    );
  }
  console.log(
    JSON.stringify({
      phase: "prompt3-post-migration",
      counts: await counts(client),
      immutableFingerprints: await immutableFingerprints(client),
      shopCount: Number(await scalar(client, `SELECT COUNT(*)::text AS value FROM "Shop"`)),
      unassigned,
    }),
  );
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
try {
  if (process.argv.includes("--preflight")) await preflight(client);
  else await postMigration(client);
} finally {
  await client.end();
}

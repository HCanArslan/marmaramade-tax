import pg from "pg";
import { normalizePostgresSslMode } from "../lib/database-url";

const exactCallback = "https://marmaramade-tax.vercel.app/api/etsy/oauth/callback";

async function main() {
  const rawDatabaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
  if (!rawDatabaseUrl) throw new Error("Production migration URL is missing.");
  if (!process.env.ETSY_API_KEYSTRING || !process.env.ETSY_SHARED_SECRET || !process.env.TOKEN_ENCRYPTION_KEY) throw new Error("Production Etsy credentials are incomplete.");
  if (process.env.ETSY_REDIRECT_URI !== exactCallback) throw new Error("Production Etsy callback URL is not configured exactly.");
  if ((process.env.ETSY_SCOPES ?? "") !== "shops_r listings_r transactions_r") throw new Error("Production Etsy scopes are not the approved read-only set.");
  const key = /^[a-f\d]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY) ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "hex") : Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) throw new Error("Production Etsy token encryption key is invalid.");

  const client = new pg.Client({ connectionString: normalizePostgresSslMode(rawDatabaseUrl) });
  await client.connect();
  try {
    const result = await client.query<{
      connections: string; listings: string; webhooks: string;
      unowned_connections: string; ambiguous_shops: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM "EtsyConnection")::text AS connections,
        (SELECT COUNT(*) FROM "EtsyListing")::text AS listings,
        (SELECT COUNT(*) FROM "EtsyWebhookEvent")::text AS webhooks,
        (SELECT COUNT(*) FROM "EtsyConnection" WHERE "workspaceId" IS NULL OR "saasShopId" IS NULL)::text AS unowned_connections,
        (SELECT COUNT(*) FROM (
          SELECT "externalShopId" FROM "Shop"
          WHERE "platform" = 'ETSY' AND "externalShopId" IS NOT NULL
          GROUP BY "externalShopId" HAVING COUNT(*) > 1
        ) duplicates)::text AS ambiguous_shops
    `);
    const row = result.rows[0];
    if (Number(row.unowned_connections) || Number(row.ambiguous_shops)) throw new Error("Prompt 4 Etsy ownership verification failed.");
    console.log(JSON.stringify({
      prompt: 4,
      connections: Number(row.connections),
      listings: Number(row.listings),
      webhookEvents: Number(row.webhooks),
      unownedConnections: Number(row.unowned_connections),
      ambiguousExternalShops: Number(row.ambiguous_shops),
      callbackExact: true,
      backgroundConfigured: Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY),
      webhookConfigured: Boolean(process.env.ETSY_WEBHOOK_SIGNING_SECRET),
    }));
  } finally {
    await client.end();
  }
}

main();

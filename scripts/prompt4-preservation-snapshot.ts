import pg from "pg";
import { normalizePostgresSslMode } from "../lib/database-url";

async function main() {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!raw) throw new Error("Database URL is required.");
  const client = new pg.Client({ connectionString: normalizePostgresSslMode(raw) });
  await client.connect();
  try {
    const result = await client.query<{
      connections: string;
      listings: string;
      token_hash: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM "EtsyConnection")::text AS connections,
        (SELECT COUNT(*) FROM "EtsyListing")::text AS listings,
        COALESCE((
          SELECT md5(string_agg("encryptedAccessToken" || ':' || "encryptedRefreshToken", '|' ORDER BY "id"))
          FROM "EtsyConnection"
        ), 'empty') AS token_hash
    `);
    console.log(JSON.stringify(result.rows[0]));
  } finally {
    await client.end();
  }
}

main();

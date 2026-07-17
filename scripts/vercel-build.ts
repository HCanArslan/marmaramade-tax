import { spawnSync } from "node:child_process";
import pg from "pg";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function recoverProductLogisticsMigration() {
  const databaseUrl =
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Production migration URL is missing");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE "_prisma_migrations"
       SET rolled_back_at = NOW()
       WHERE migration_name = $1
         AND finished_at IS NULL
         AND rolled_back_at IS NULL`,
      ["20260717183000_product_specific_logistics"],
    );
    if (result.rowCount) {
      console.log("Recovered the interrupted product-logistics migration.");
    }
  } finally {
    await client.end();
  }
}

run("npx", ["prisma", "generate"]);

// Vercel integration credentials are intentionally unavailable for local pulls.
// Apply committed, idempotent migrations only in the production deployment.
if (process.env.VERCEL_ENV === "production") {
  await recoverProductLogisticsMigration();
  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["next", "build"]);

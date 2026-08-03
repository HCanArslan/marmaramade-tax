import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

describe("Prompt 3 SaaS persistence architecture", () => {
  it("tracks the complete retained, transformed, and private-only classification", async () => {
    const classification = await source("docs/PROMPT3_MODEL_CLASSIFICATION.md");
    expect(classification).toContain("## Retained SaaS core");
    expect(classification).toContain("## Transformed into additive SaaS foundations");
    expect(classification).toContain("## Preserved legacy/private-only");
    expect(classification).toContain("`Shop`");
    expect(classification).toContain("`PortfolioScenario`");
  });

  it("orders the migration backfill and guards before uniqueness contraction", async () => {
    const migration = await source("prisma/migrations/20260803190000_prompt3_saas_tenancy_currency_scenarios/migration.sql");
    const backfill = migration.indexOf('UPDATE "Product"');
    const guard = migration.indexOf("workspace/shop uniqueness collision detected");
    const compound = migration.indexOf('CREATE UNIQUE INDEX "Product_workspaceId_sku_key"');
    const contraction = migration.indexOf('DROP INDEX "Product_sku_key"');
    expect(backfill).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(backfill);
    expect(compound).toBeGreaterThan(guard);
    expect(contraction).toBeGreaterThan(compound);
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM|prisma db push/i);
    expect(migration).not.toMatch(/ALTER TABLE "[^"]+" ADD COLUMN\s+"workspaceId" TEXT NOT NULL/);
    expect(migration).toContain("MARMARAMADE_LEDGER");
    expect(migration).toContain("ON CONFLICT");
  });

  it("requires trusted workspace context across the seven SaaS repositories", async () => {
    const repositories = [
      "product-repository.ts",
      "shop-repository.ts",
      "order-repository.ts",
      "fee-repository.ts",
      "exchange-rate-repository.ts",
      "scenario-repository.ts",
      "workspace-settings-repository.ts",
    ];
    for (const repository of repositories) {
      const contents = await source(`lib/server/repositories/${repository}`);
      expect(contents).toContain("WorkspaceContext");
      expect(contents).toContain("assertTrustedWorkspaceContext");
    }
  });

  it("keeps the new currency layer additive to the protected legacy money module", async () => {
    const legacy = await source("lib/domain/money.ts");
    const generic = await source("lib/domain/currency-conversion.ts");
    expect(legacy).toContain('export type CurrencyCode = "TRY" | "USD"');
    expect(generic).toContain("convertWithExchangeRate");
    expect(generic).toContain("BASE_TO_QUOTE");
    expect(generic).toContain("QUOTE_TO_BASE");
  });
});

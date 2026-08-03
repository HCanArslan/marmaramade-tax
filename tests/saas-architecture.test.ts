import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { saasNavigation } from "@/lib/saas/navigation";
import {
  legacyPrismaImportAllowlist,
  validatePrismaBoundary,
} from "@/scripts/assert-prisma-boundary";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("SaaS architecture boundaries", () => {
  it("creates public, authentication, and protected SaaS route foundations", async () => {
    const pages = [
      "app/(public)/page.tsx",
      "app/(public)/pricing/page.tsx",
      "app/(public)/etsy-kar-hesaplama/page.tsx",
      "app/(public)/blog/page.tsx",
      "app/(auth)/login/page.tsx",
      "app/(auth)/signup/page.tsx",
      "app/(auth)/forgot-password/page.tsx",
      "app/(auth)/reset-password/page.tsx",
      "app/(saas)/app/page.tsx",
      "app/(saas)/app/products/page.tsx",
      "app/(saas)/app/orders/page.tsx",
      "app/(saas)/app/profit/page.tsx",
      "app/(saas)/app/pricing/page.tsx",
      "app/(saas)/app/scenarios/page.tsx",
      "app/(saas)/app/reports/page.tsx",
      "app/(saas)/app/settings/page.tsx",
      "app/(saas)/app/billing/page.tsx",
      "app/(saas)/app/help/page.tsx",
      "app/(saas)/workspace/setup/page.tsx",
      "app/ledger/page.tsx",
    ];
    await Promise.all(
      pages.map((file) => access(path.join(process.cwd(), file))),
    );
  });

  it("limits SaaS navigation to the approved product surface", () => {
    expect(saasNavigation).toEqual([
      { key: "dashboard", href: "/app" },
      { key: "products", href: "/app/products" },
      { key: "orders", href: "/app/orders" },
      { key: "profit", href: "/app/profit" },
      { key: "pricing", href: "/app/pricing" },
      { key: "scenarios", href: "/app/scenarios" },
      { key: "reports", href: "/app/reports" },
      { key: "settings", href: "/app/settings" },
      { key: "billing", href: "/app/billing" },
      { key: "help", href: "/app/help" },
    ]);
    expect(JSON.stringify(saasNavigation)).not.toMatch(
      /banking|tax|sgk|compliance|inventory|production|shipentegra|documents/,
    );
  });

  it("keeps public routes outside the authentication matcher and SaaS routes protected", async () => {
    const proxy = await source("proxy.ts");
    expect(proxy).toContain("pricing(?:/|$)");
    expect(proxy).toContain("etsy-kar-hesaplama(?:/|$)");
    expect(proxy).toContain("forgot-password(?:/|$)");
    expect(proxy).toContain("reset-password(?:/|$)");
    expect(proxy).toContain("api/inngest(?:/|$)");
    expect(proxy).toContain('pathname === "/api/inngest"');
    expect(proxy).toContain('pathname.startsWith("/api/inngest/")');
    expect(proxy).not.toContain("app(?:/|$)");
    expect(proxy).toContain('new URL("/login", request.url)');
    expect(proxy).toContain("getSessionCookie");
  });

  it("enforces the incremental Prisma repository boundary", async () => {
    expect(await validatePrismaBoundary()).toEqual([]);
    expect(legacyPrismaImportAllowlist).toHaveLength(51);
    const compatibility = await source("lib/prisma.ts");
    const repository = await source(
      "lib/server/repositories/health-repository.ts",
    );
    expect(compatibility).toContain('from "@/lib/server/db/client"');
    expect(repository).toContain('from "@/lib/server/db/client"');
  });

  it("documents the protected financial engine and migration safety rules", async () => {
    const architecture = await source("docs/SAAS_ARCHITECTURE_BOUNDARIES.md");
    for (const file of [
      "lib/domain/money.ts",
      "lib/domain/calculator.ts",
      "lib/domain/profitability.ts",
      "lib/domain/sales-plan.ts",
      "lib/goals/planner.ts",
    ]) {
      expect(architecture).toContain(file);
    }
    expect(architecture).toContain("Never use `prisma db push`");
    expect(architecture).toContain("temporary compatibility re-export");
  });

  it("keeps the Prompt 2 migration additive", async () => {
    const migration = await source(
      "prisma/migrations/20260803120000_better_auth_workspace_tenancy/migration.sql",
    );
    expect(migration).not.toMatch(/^\s*(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+)/im);
    expect(migration).toContain('CREATE TABLE "user"');
    expect(migration).toContain('CREATE TABLE "Workspace"');
    expect(migration).toContain('CREATE TABLE "Membership"');
  });

  it("uses Better Auth as the only public authentication handler", async () => {
    const handler = await source("app/api/auth/[...nextauth]/route.ts");
    expect(handler).toContain("toNextJsHandler(auth)");
    expect(handler).not.toContain("NextAuth");
    expect(await source("package.json")).not.toContain('"next-auth"');
  });
});

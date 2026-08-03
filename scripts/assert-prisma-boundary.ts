import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const legacyPrismaImportAllowlist = [
  "app/accountant/page.tsx",
  "app/actions/etsy.ts",
  "app/actions/formation.ts",
  "app/actions/import-receipt.ts",
  "app/actions/ledger.ts",
  "app/actions/listings.ts",
  "app/actions/operations.ts",
  "app/actions/shipentegra.ts",
  "app/api/cron/shipentegra-tracking/route.ts",
  "app/api/documents/[id]/route.ts",
  "app/api/etsy/webhook/route.ts",
  "app/api/exports/[entity]/route.ts",
  "app/audit-log/page.tsx",
  "app/banking/page.tsx",
  "app/business/page.tsx",
  "app/calculator/page.tsx",
  "app/cash-flow/page.tsx",
  "app/compliance/page.tsx",
  "app/customs-etgb/page.tsx",
  "app/customs/page.tsx",
  "app/documents/page.tsx",
  "app/etsy-import/page.tsx",
  "app/etsy-import/receipts/[id]/page.tsx",
  "app/etsy-payouts/page.tsx",
  "app/expenses/page.tsx",
  "app/fees/page.tsx",
  "app/formation/page.tsx",
  "app/goals/page.tsx",
  "app/inventory/page.tsx",
  "app/invoices/page.tsx",
  "app/ledger/page.tsx",
  "app/materials/page.tsx",
  "app/orders/[id]/page.tsx",
  "app/orders/page.tsx",
  "app/production/page.tsx",
  "app/products/page.tsx",
  "app/reconciliation/page.tsx",
  "app/sales-plan/page.tsx",
  "app/settings/page.tsx",
  "app/settings/security/page.tsx",
  "app/settings/shipentegra/page.tsx",
  "app/sgk/page.tsx",
  "app/shipentegra/page.tsx",
  "app/shipping/page.tsx",
  "app/tax-exemption/page.tsx",
  "app/taxes/page.tsx",
  "lib/auth/security.ts",
  "lib/etsy/auth.ts",
  "lib/etsy/sync.ts",
  "lib/reporting.ts",
  "lib/shipentegra/documents.ts",
  "lib/shipentegra/quotes.ts",
  "lib/shipentegra/shipments.ts",
  "lib/shipentegra/tracking.ts",
] as const;

const legacyGeneratedClientImportAllowlist = [
  "app/actions/ledger.ts",
  "app/actions/operations.ts",
  "lib/compliance.ts",
  "lib/etsy/sync.ts",
] as const;

const scannedRoots = ["app", "components", "lib", "scripts"] as const;
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const ignoredDirectories = new Set([".next", "generated", "node_modules"]);
const importPattern =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g;

function normalizePath(file: string) {
  return file.replaceAll("\\", "/");
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) return [];
        return sourceFiles(path.join(directory, entry.name));
      }
      return sourceExtensions.has(path.extname(entry.name))
        ? [path.join(directory, entry.name)]
        : [];
    }),
  );
  return files.flat();
}

function importSpecifiers(source: string) {
  return Array.from(source.matchAll(importPattern), (match) => match[1]);
}

export async function validatePrismaBoundary(root = process.cwd()) {
  const legacyAllowlist = new Set<string>(legacyPrismaImportAllowlist);
  const generatedAllowlist = new Set<string>(
    legacyGeneratedClientImportAllowlist,
  );
  const seenLegacyImports = new Set<string>();
  const seenGeneratedImports = new Set<string>();
  const violations: string[] = [];
  const files = (
    await Promise.all(scannedRoots.map((entry) => sourceFiles(path.join(root, entry))))
  ).flat();

  for (const file of files) {
    const relative = normalizePath(path.relative(root, file));
    const source = await readFile(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier === "@/lib/prisma") {
        seenLegacyImports.add(relative);
        if (!legacyAllowlist.has(relative)) {
          violations.push(
            `${relative}: new imports from @/lib/prisma are forbidden; use lib/server/repositories`,
          );
        }
      }

      const importsDbClient =
        specifier === "@/lib/server/db/client" ||
        specifier.endsWith("/server/db/client") ||
        specifier.endsWith("/db/client");
      if (
        importsDbClient &&
        relative !== "lib/prisma.ts" &&
        !relative.startsWith("lib/server/repositories/")
      ) {
        violations.push(
          `${relative}: direct database-client access is allowed only in lib/server/repositories`,
        );
      }

      const importsGeneratedClient =
        specifier.startsWith("@/generated/prisma/") ||
        specifier === "@prisma/client" ||
        specifier === "@prisma/adapter-pg";
      if (importsGeneratedClient) {
        seenGeneratedImports.add(relative);
        if (
          !relative.startsWith("lib/server/db/") &&
          !generatedAllowlist.has(relative)
        ) {
          violations.push(
            `${relative}: generated Prisma imports are restricted to lib/server/db`,
          );
        }
      }
    }
  }

  for (const file of legacyAllowlist) {
    if (!seenLegacyImports.has(file)) {
      violations.push(`${file}: stale @/lib/prisma legacy allowlist entry`);
    }
  }
  for (const file of generatedAllowlist) {
    if (!seenGeneratedImports.has(file)) {
      violations.push(`${file}: stale generated-client legacy allowlist entry`);
    }
  }

  return violations;
}

async function main() {
  const violations = await validatePrismaBoundary();
  if (violations.length) {
    console.error("Prisma import boundary violations:\n" + violations.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Prisma import boundary is valid (${legacyPrismaImportAllowlist.length} temporary legacy imports).`,
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  await main();
}

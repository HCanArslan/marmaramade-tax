import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import { applyFeeProfile } from "@/lib/domain/fee-profile";
import { defaultCalculatorInput } from "@/lib/domain/defaults";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("planning usability", () => {
  it("supports deleting monthly goals and shows the three requested answers", async () => {
    const [actions, page] = await Promise.all([
      source("app/actions/ledger.ts"),
      source("app/goals/page.tsx"),
    ]);
    expect(actions).toContain("deleteProfitGoalAction");
    expect(page).toContain("How do I make $1,000 net?");
    expect(page).toContain("What if I sell all stock?");
    expect(page).toContain("What if I sell 5 products?");
  });

  it("provides the official Etsy Türkiye main planning preset", async () => {
    const actions = await source("app/actions/ledger.ts");
    expect(actions).toContain("createOfficialEtsyTurkeyFeeProfileAction");
    expect(actions).toContain('fixedAmount: "0.20"');
    expect(actions).toContain('percentageRate: "6.5"');
    expect(actions).toContain('percentageRate: "1.67"');
    expect(actions).toContain("https://www.etsy.com/legal/fees/");
  });

  it("labels the provided customs starter as an editable estimate", async () => {
    const customs = await source("app/customs/page.tsx");
    expect(customs).toContain("4202224500");
    expect(customs).toContain('["dutyRate", "Estimated duty %", "6.3"]');
    expect(customs).toContain("ShipEntegra US customs calculator");
    expect(customs).toContain('name="includeInSellerProfit"');
    expect(customs).toContain("Open official GTIP search");
  });

  it("labels exemption fields and keeps them behind evidence guidance", async () => {
    const exemption = await source("app/tax-exemption/page.tsx");
    expect(exemption).toContain("Do not fill an artisan-exemption limit yet");
    expect(exemption).toContain("Confirmed annual limit (TRY)");
    expect(exemption).toContain("Actual withholding shown by bank (TRY)");
  });

  it("keeps every sidebar destination backed by a route page", async () => {
    const sidebar = await source("components/sidebar.tsx");
    const routes = [...sidebar.matchAll(/href: "([^"]+)"/g)].map(
      (match) => match[1],
    );
    await Promise.all(
      routes.map((route) =>
        access(path.join(process.cwd(), "app", route.slice(1), "page.tsx")),
      ),
    );
  });

  it("does not erase saved costs or show hard-coded dashboard examples", async () => {
    const [calculator, dashboard, defaults] = await Promise.all([
      source("components/calculator-workspace.tsx"),
      source("app/page.tsx"),
      source("lib/domain/defaults.ts"),
    ]);
    expect(calculator).not.toContain("withoutIgnoredCosts");
    expect(calculator).toContain('title="Product costs"');
    expect(dashboard).not.toContain("Tuesday · 14 July 2026");
    expect(dashboard).not.toContain("40.00 USD/TRY");
    expect(defaults).toContain('internationalShippingUsd: "0"');
  });

  it("uses saved fee rules as calculator inputs", () => {
    const result = applyFeeProfile(defaultCalculatorInput, [
      {
        category: "PAYMENT_PROCESSING_PERCENT",
        percentageRate: { toString: () => "6.5" },
        fixedAmount: null,
        fixedCurrency: null,
        vatApplicable: true,
        vatRate: { toString: () => "20" },
      },
    ]);
    expect(result.processingRate).toBe("6.5");
    expect(result.vatApplicable.processingPercentage).toBe(true);
  });

  it("shows catalog, Etsy, and physical inventory as separate reconciled values", async () => {
    const inventory = await source("app/inventory/page.tsx");
    expect(inventory).toContain("Catalog products");
    expect(inventory).toContain("Etsy sellable quantity");
    expect(inventory).toContain("Recorded finished units");
  });

  it("never presents a zero-input scenario as reliable profit", async () => {
    const [calculator, calculatorPage, shipping, actions] = await Promise.all([
      source("components/calculator-workspace.tsx"),
      source("app/calculator/page.tsx"),
      source("app/shipping/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(calculator).toContain(
      "Zorunlu maliyetler eksik olduğu için sonuç geçicidir",
    );
    expect(calculator).toContain("Gider dökümü ve veri kaynakları");
    expect(calculator).toContain("Uluslararası kargo");
    expect(calculator).toContain("customs / destination charges");
    expect(calculator).toContain("tax reserve");
    expect(calculator).toContain("Kaynak:");
    expect(calculatorPage).toContain("Latest saved fallback");
    expect(calculatorPage).toContain("annualBusinessBudgetIds");
    expect(calculatorPage).toContain('contains: "example"');
    expect(shipping).toContain("Use for planning");
    expect(shipping).toContain("Automatic Calculator fallback");
    expect(actions).toContain("setPlanningDefaultShippingQuoteAction");
  });

  it("supports copying and deleting material components while keeping totals synchronized", async () => {
    const [products, actions, calculator, calculatorPage] = await Promise.all([
      source("app/products/page.tsx"),
      source("app/actions/ledger.ts"),
      source("components/calculator-workspace.tsx"),
      source("app/calculator/page.tsx"),
    ]);
    expect(products).toContain("copyProductMaterialAction");
    expect(products).toContain("deleteProductMaterialAction");
    expect(products).toContain("Copy to another product");
    expect(products).toContain("Duplicate a complete cost setup");
    expect(products).toContain("destination does not need an existing cost");
    expect(actions).toContain("syncMaterialComponentTotal");
    expect(actions).toContain("duplicateProductCostSetupAction");
    expect(actions).toContain('action: "FULL_SETUP_DUPLICATED"');
    expect(actions).toContain('action: "COPIED_TO_PRODUCT"');
    expect(actions).toContain('action: "DELETED"');
    expect(calculator).toContain('label="Malzemeler"');
    expect(calculator).toContain('label="Emek"');
    expect(calculator).toContain('label="Paketleme"');
    expect(calculatorPage).toContain("materialWithWastage");
    expect(calculatorPage).toContain("additionalMakerPaymentTry");
  });

  it("shows saved product cost values under each product with safe edit and delete controls", async () => {
    const [products, actions] = await Promise.all([
      source("app/products/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(products).toContain("Saved cost versions by product");
    expect(products).toContain("Every saved value appears here");
    expect(products).toContain("View / edit costs");
    expect(products).toContain("Direct planning cost");
    expect(products).toContain("Save changes");
    expect(products).toContain("Delete version");
    expect(products).toContain("Save component changes");
    expect(products).toContain("Order locked");
    expect(actions).toContain("updateProductCostAction");
    expect(actions).toContain("deleteProductCostAction");
    expect(actions).toContain("updateProductMaterialAction");
    expect(actions).toContain("used by an order and cannot be edited");
    expect(actions).toContain("used by an order and cannot be deleted");
    expect(actions).toContain('action: "UPDATED"');
  });

  it("archives customs quotes explicitly and deletes only unused quotes", async () => {
    const [customs, actions] = await Promise.all([
      source("app/customs/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(customs).toContain("deleteCustomsQuoteAction");
    expect(customs).toContain('q.estimateStatus === "ARCHIVED"');
    expect(customs).toContain("Permanently delete this unused quote");
    expect(customs).toContain("Linked records protect this quote");
    expect(actions).toContain("deleteCustomsQuoteAction");
    expect(actions).toContain('estimateStatus: "ARCHIVED"');
    expect(actions).toContain("includeInSellerProfit: false");
    expect(actions).toContain("actualCharges: true");
    expect(actions).toContain('action: "DELETED"');
    expect(actions).toContain("Archive it instead");
  });

  it("duplicates, archives, and safely deletes shipping quotes", async () => {
    const [shipping, actions] = await Promise.all([
      source("app/shipping/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(shipping).toContain("duplicateShippingQuoteAction");
    expect(shipping).toContain("archiveShippingQuoteAction");
    expect(shipping).toContain("deleteShippingQuoteAction");
    expect(shipping).toContain('q.estimateStatus === "ARCHIVED"');
    expect(shipping).toContain("Permanently delete this unused quote");
    expect(shipping).toContain("Linked records protect this quote");
    expect(actions).toContain("deleteShippingQuoteAction");
    expect(actions).toContain('estimateStatus: "ARCHIVED"');
    expect(actions).toContain("actualShippingCost: null");
    expect(actions).toContain("documents: true");
    expect(actions).toContain(
      "This shipping quote is linked to an order or document",
    );
    expect(actions).toContain('action: "DELETED"');
  });

  it("copies one shipping quote to several other products at once", async () => {
    const [shipping, actions] = await Promise.all([
      source("app/shipping/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(shipping).toContain("copyShippingQuoteToProductsAction");
    expect(shipping).toContain("Copy to products");
    expect(shipping).toContain('name="targetProductIds"');
    expect(shipping).toContain('name="copyToAllOtherProducts"');
    expect(shipping).toContain("All other active products");
    expect(shipping).toContain("Copy to selected");
    expect(shipping).toContain("product.id !== q.productId");
    expect(actions).toContain("copyShippingQuoteToProductsAction");
    expect(actions).toContain('formData.getAll("targetProductIds")');
    expect(actions).toContain(
      'formData.get("copyToAllOtherProducts") ?? undefined',
    );
    expect(actions).toContain("value.copyToAllOtherProducts");
    expect(actions).toContain("targetProductIds.includes(source.productId)");
    expect(actions).toContain('action: "COPIED_TO_PRODUCT"');
    expect(actions).toContain("actualShippingCost: null");
    expect(actions).toContain("reconciledAt: null");
  });

  it("connects saved tax planning rules to Calculator without mixing filed tax", async () => {
    const [taxes, actions, calculatorPage, migration] = await Promise.all([
      source("app/taxes/page.tsx"),
      source("app/actions/operations.ts"),
      source("app/calculator/page.tsx"),
      source(
        "prisma/migrations/20260717120000_tax_planning_rules/migration.sql",
      ),
    ]);

    expect(taxes).toContain("TaxPlanningReserve");
    expect(taxes).toContain("Gelişmiş Vergi Kuralları");
    expect(taxes).toContain("tam istisna");
    expect(actions).toContain('taxType: "PROVISIONAL_INCOME_TAX"');
    expect(actions).toContain("estimatedPayable ??");
    expect(calculatorPage).toContain('purpose: "PLANNING_RESERVE"');
    expect(calculatorPage).toContain("planningTaxRule?.rate");
    expect(migration).toContain("tax_2026_income_bracket_1");
    expect(migration).toContain("tax_2026_income_bracket_2");
    expect(migration).toContain("tax_2026_income_safety_reserve");
  });

  it("edits and safely deletes Customs and ETGB workspace records", async () => {
    const [page, operations, ledger] = await Promise.all([
      source("app/customs-etgb/page.tsx"),
      source("app/actions/operations.ts"),
      source("app/actions/ledger.ts"),
    ]);

    expect(page).toContain("updateCustomsProfileAction");
    expect(page).toContain("deleteCustomsProfileAction");
    expect(page).toContain("updateTariffVersionAction");
    expect(page).toContain("deleteTariffVersionAction");
    expect(page).toContain("updateMicroExportCaseAction");
    expect(page).toContain("deleteMicroExportCaseAction");
    expect(page).toContain("updateEtgbCostRecordAction");
    expect(page).toContain("deleteEtgbCostRecordAction");
    expect(page).toContain("case status to Archived instead of deleting it");
    expect(operations).toContain(
      "Only an unlinked draft ETGB case can be deleted",
    );
    expect(operations).toContain('entityType: "CustomsProfile"');
    expect(operations).toContain('entityType: "TariffVersion"');
    expect(ledger).toContain('entityType: "EtgbCostRecord"');
    expect(ledger).toContain('action: "UPDATED"');
    expect(ledger).toContain('action: "DELETED"');
  });

  it("keeps shipping, customs, tariff, and ETGB assumptions product-specific", async () => {
    const [shipping, customs, etgb, calculatorPage, calculator, schema, icon] =
      await Promise.all([
        source("app/shipping/page.tsx"),
        source("app/customs/page.tsx"),
        source("app/customs-etgb/page.tsx"),
        source("app/calculator/page.tsx"),
        source("components/calculator-workspace.tsx"),
        source("prisma/schema.prisma"),
        source("app/icon.svg"),
      ]);

    expect(shipping).toContain('name="productId"');
    expect(shipping).toContain("packageLengthCm");
    expect(customs).toContain('name="productId"');
    expect(etgb).toContain("ProductSelect");
    expect(calculatorPage).toContain(
      "shippingQuotes.find((quote) => quote.productId === product.id)",
    );
    expect(calculatorPage).toContain(
      "customsQuotes.find((quote) => quote.productId === product.id)",
    );
    expect(calculator).toContain(
      "internationalShippingUsd: product.internationalShippingUsd",
    );
    expect(schema).toContain("shippingQuotes     ShippingQuote[]");
    expect(schema).toContain("customsQuotes      CustomsQuote[]");
    expect(icon).toContain('fill="#173b34"');
  });
});

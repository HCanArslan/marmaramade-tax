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
    expect(calculator).toContain("Product & business costs");
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

  it("never presents a zero-input monthly scenario as reliable profit", async () => {
    const [calculator, calculatorPage, shipping, actions] = await Promise.all([
      source("components/calculator-workspace.tsx"),
      source("app/calculator/page.tsx"),
      source("app/shipping/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(calculator).toContain(
      "Profit is preliminary because required costs are zero",
    );
    expect(calculator).toContain("Scenario deduction audit");
    expect(calculator).toContain("International shipping");
    expect(calculator).toContain("customs / destination charges");
    expect(calculator).toContain("tax reserve");
    expect(calculator).toContain("Open source page");
    expect(calculatorPage).toContain("Latest saved fallback");
    expect(calculatorPage).toContain("businessProfile");
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
    expect(calculator).toContain('label="Materials"');
    expect(calculator).toContain('label="Labour"');
    expect(calculator).toContain('label="Packaging"');
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
});

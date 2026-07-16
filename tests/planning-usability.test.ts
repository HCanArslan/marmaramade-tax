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

  it("does not prefill a guessed product classification or customs rate", async () => {
    const customs = await source("app/customs/page.tsx");
    expect(customs).not.toContain("4202224500");
    expect(customs).not.toContain('["dutyRate", "Duty %", "6.3"]');
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
    const [calculator, shipping, actions] = await Promise.all([
      source("components/calculator-workspace.tsx"),
      source("app/shipping/page.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(calculator).toContain(
      "Profit is preliminary because required costs are zero",
    );
    expect(calculator).toContain("Scenario deduction audit");
    expect(calculator).toContain("Shipping / ETGB service");
    expect(calculator).toContain("customs / destination charges");
    expect(calculator).toContain("tax reserve");
    expect(shipping).toContain("Use for planning");
    expect(actions).toContain("setPlanningDefaultShippingQuoteAction");
  });
});

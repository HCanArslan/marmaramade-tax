import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { businessPresetFor, calculateFirstResult, ONBOARDING_STEP_COUNT, productCompleteness, workspaceCompleteness } from "@/lib/domain/onboarding";
import { captureOnboardingEvent, type AnalyticsProvider } from "@/lib/analytics/onboarding";

const source = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

describe("Prompt 5 completeness and first-result boundary", () => {
  it("distinguishes unknown from an explicit zero deterministically", () => {
    expect(productCompleteness({ materialCost: null, laborHours: "1", laborRate: "0", packagingCost: "0", shippingCost: "0" }).ready).toBe(false);
    expect(productCompleteness({ materialCost: "0", laborHours: "1", laborRate: "0", packagingCost: "0", shippingCost: "0" }).ready).toBe(true);
    const input = { importedListings: 2, linkedProducts: 2, products: [
      { materialCost: "1", laborHours: "1", laborRate: "2", packagingCost: "0", shippingCost: "3" },
      { materialCost: null, laborHours: "1", laborRate: "2", packagingCost: "0", shippingCost: "3" },
    ], marketplaceFeesAvailable: true, destinationSelected: true, businessProfileSelected: true };
    expect(workspaceCompleteness(input)).toEqual(workspaceCompleteness(input));
    expect(workspaceCompleteness(input)).toMatchObject({ includedProducts: 1, excludedProducts: 1, readiness: "Ready for an initial estimate" });
  });

  it("calculates each complete product with Decimal and excludes incomplete products", () => {
    const result = calculateFirstResult([
      { revenue: "100.10", fees: "10.01", materialCost: "20", laborHours: "2", laborRate: "5", economicLaborRate: "8", packagingCost: "3", shippingCost: "7" },
      { revenue: "200", fees: "20", materialCost: null, laborHours: "2", laborRate: "5", economicLaborRate: "8", packagingCost: "3", shippingCost: "7" },
    ]);
    expect(result).toMatchObject({ included: 1, excluded: 1 });
    expect(result.revenue.toString()).toBe("100.1");
    expect(result.cashProfit.toString()).toBe("60.09");
    expect(result.economicProfit.toString()).toBe("44.09");
    expect(result.warnings).toContain("Material cost is missing.");
  });

  it("reports shipping separately from configured product costs", () => {
    const result = workspaceCompleteness({ importedListings: 1, linkedProducts: 1, products: [{ materialCost: "10", laborHours: "1", laborRate: "5", packagingCost: "2", shippingCost: null }], marketplaceFeesAvailable: true, destinationSelected: true, businessProfileSelected: true });
    expect(result.readiness).toBe("Needs shipping costs");
    expect(result.dimensions.find((item) => item.key === "product_costs")?.status).toBe("COMPLETE");
    expect(result.dimensions.find((item) => item.key === "shipping")?.status).toBe("MISSING");
  });

  it("reports missing FX without substituting zero", () => {
    const completeness = workspaceCompleteness({ importedListings: 1, linkedProducts: 1, products: [{ materialCost: "10", laborHours: "1", laborRate: "5", packagingCost: "2", shippingCost: "3" }], marketplaceFeesAvailable: true, destinationSelected: true, businessProfileSelected: true, exchangeRateAvailable: false });
    expect(completeness.blockingGaps).toContain("Exchange rate");
    const preview = calculateFirstResult([{ revenue: null, revenueMissingReason: "FX", fees: null, materialCost: "10", laborHours: "1", laborRate: "5", economicLaborRate: "5", packagingCost: "2", shippingCost: "3" }]);
    expect(preview.included).toBe(0);
    expect(preview.warnings).toContain("Exchange rate is missing.");
  });

  it.each([
    ["NO_REGISTERED_BUSINESS", "NONE"], ["ARTISAN_EXEMPTION", "CONSERVATIVE"], ["SOLE_PROPRIETORSHIP", "STANDARD"], ["LIMITED_OR_CORPORATION", "STANDARD"], ["OTHER_OR_UNKNOWN", "NONE"],
  ])("maps %s to a planning preset without eligibility conclusions", (type, preset) => expect(businessPresetFor(type)).toBe(preset));
});

describe("Prompt 5 UI, signup, and analytics contracts", () => {
  it("contains exactly five steps, progress, safe unknown copy, and no eligibility audit", async () => {
    expect(ONBOARDING_STEP_COUNT).toBe(5);
    const page = await source("app/(saas)/onboarding/page.tsx");
    expect(page).toContain('const steps = ["Etsy", "İşletme", "Maliyetler", "Pazar", "İlk sonuç"]');
    expect(page).toContain('aria-label="Onboarding progress"');
    expect(page).toContain("Bilmiyorum");
    expect(page).toContain("view.suggestedCosts.averageLaborHours");
    expect(page).toContain("Panelimi aç");
    for (const forbidden of ["SGK", "vergi dairesi", "banka hesabı uygunluğu", "muafiyet koşullarının tamamı"]) expect(page).not.toContain(forbidden);
    expect(page).toContain("sm:grid-cols-2");
    expect(page).not.toContain("min-w-[");
  });

  it("keeps public signup closed in both UI and production API", async () => {
    expect(await source("app/(auth)/signup/page.tsx")).toContain("Early access is currently limited.");
    const route = await source("app/api/auth/[...nextauth]/route.ts");
    expect(route).toContain("SIGNUP_CLOSED");
    expect(route.indexOf("SIGNUP_CLOSED")).toBeLessThan(route.indexOf("handler.POST(request)"));
  });

  it("allows only privacy-safe analytics properties and never blocks", async () => {
    const provider: AnalyticsProvider = { capture: async () => { throw new Error("offline"); } };
    await expect(captureOnboardingEvent("onboarding_started", { step: 1, importedProductCount: 12 }, provider)).resolves.toBeUndefined();
    const analytics = await source("lib/analytics/onboarding.ts");
    for (const sensitive of ["productTitle", "customerName", "buyer", "oauthToken", "taxIdentifier", "financialAmount"]) expect(analytics).not.toContain(sensitive);
  });

  it("keeps protected app gating and founder ledger routing separate", async () => {
    expect(await source("app/(saas)/app/layout.tsx")).toContain('redirect("/onboarding")');
    expect(await source("lib/server/auth/workspace-context.ts")).toContain("authorizeFounderUser");
    expect(await source("proxy.ts")).toContain("terms(?:/|$)|privacy(?:/|$)");
  });
});

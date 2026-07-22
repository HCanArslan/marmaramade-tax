import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { calculate } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import {
  annualizeRecurringBusinessCost,
  monthStartUtc,
  monthlyOverheadTotalTry,
  resolveAnnualPlanOverhead,
} from "@/lib/domain/overhead";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("annual business spending", () => {
  it("normalizes eligibility to the current Istanbul planning month", () => {
    expect(
      monthStartUtc(new Date("2026-07-21T12:00:00+03:00")).toISOString(),
    ).toBe("2026-07-01T00:00:00.000Z");
    expect(
      monthStartUtc(new Date("2026-07-31T22:30:00.000Z")).toISOString(),
    ).toBe("2026-08-01T00:00:00.000Z");
  });

  it("adds only the seven explicitly saved recurring categories", () => {
    expect(
      monthlyOverheadTotalTry({
        accountantTry: "1000",
        socialSecurityTry: "0",
        softwareTry: "1200",
        bankingTry: "0",
        officeTry: "0",
        otherTry: "0",
        etsyPlusTry: "0",
      }).toString(),
    ).toBe("2200");
  });

  it("allocates the saved monthly total through the canonical calculator", () => {
    const result = calculate({
      ...defaultCalculatorInput,
      monthlyOverheadTry: "12000",
      overheadAllocationMethod: "EXPECTED_SALES",
      expectedMonthlyOrders: "12",
      usdTryRate: "40",
    });
    expect(result.totals.allocatedBusinessOverheadUsd.toString()).toBe("25");
    expect(result.totals.allocatedBusinessOverheadUsd.mul(12).toString()).toBe(
      "300",
    );
  });

  it("annualizes native-currency costs with their explicit VAT", () => {
    const mukellef = annualizeRecurringBusinessCost(
      {
        amount: "36000",
        currency: "TRY",
        billingFrequency: "ANNUAL",
        vatRate: "20",
      },
      "47.1134",
    );
    expect(mukellef.annualNetNative.toString()).toBe("36000");
    expect(mukellef.annualVatNative.toString()).toBe("7200");
    expect(mukellef.annualGrossTry.toString()).toBe("43200");

    const chatGpt = annualizeRecurringBusinessCost(
      {
        amount: "20",
        currency: "USD",
        billingFrequency: "MONTHLY",
        vatRate: "0",
      },
      "47.1134",
    );
    expect(chatGpt.annualGrossNative.toString()).toBe("240");
    expect(chatGpt.annualGrossTry.toString()).toBe("11307.216");
  });

  it("matches the initial yearly budget without duplicate legacy costs", () => {
    const rate = "47.1134";
    const mukellef = annualizeRecurringBusinessCost(
      {
        amount: "2999",
        currency: "TRY",
        billingFrequency: "MONTHLY",
        vatRate: "20",
      },
      rate,
    );
    const chatGpt = annualizeRecurringBusinessCost(
      {
        amount: "24",
        currency: "USD",
        billingFrequency: "MONTHLY",
        vatRate: "0",
      },
      rate,
    );
    const total = mukellef.annualGrossTry
      .plus(chatGpt.annualGrossTry)
      .plus("1500")
      .plus(new Decimal("480").mul(12));
    expect(mukellef.annualGrossTry.toString()).toBe("43185.6");
    expect(chatGpt.annualGrossNative.toString()).toBe("288");
    expect(total.toString()).toBe("64014.2592");
  });

  it("deducts the annual total exactly once across every planned unit", () => {
    const allocation = resolveAnnualPlanOverhead("54507.216", "12");
    expect(allocation.totalPlanOverheadTry.toString()).toBe("54507.216");
    expect(allocation.manualOverheadPerOrderTry.toString()).toBe("4542.268");

    const perUnit = calculate({
      ...defaultCalculatorInput,
      monthlyOverheadTry: "0",
      overheadAllocationMethod: allocation.allocationMethod,
      manualOverheadPerOrderTry: allocation.manualOverheadPerOrderTry,
      usdTryRate: "47.1134",
    });
    expect(
      perUnit.totals.allocatedBusinessOverheadUsd
        .mul(12)
        .mul("47.1134")
        .minus("54507.216")
        .abs()
        .lt("0.000001"),
    ).toBe(true);
  });

  it("does not invent annual overhead when no recurring costs exist", () => {
    const allocation = resolveAnnualPlanOverhead("0", "12");
    expect(allocation.totalPlanOverheadTry.toString()).toBe("0");
    expect(allocation.manualOverheadPerOrderTry.toString()).toBe("0");
  });

  it("uses only the canonical annual budget and ignores monthly records", async () => {
    const calculatorPage = await source("app/calculator/page.tsx");
    expect(calculatorPage).toContain("prisma.recurringBusinessCost.findMany");
    expect(calculatorPage).toContain("id: { in: annualBusinessBudgetIds }");
    expect(calculatorPage).not.toContain("prisma.monthlyOverhead");
    expect(calculatorPage).toContain('monthlyOverheadTry: "0"');
    expect(calculatorPage).toContain('overheadAllocationMethod: "NONE"');
    expect(calculatorPage).toContain(
      "No annual recurring business costs configured; no Sales Plan overhead deducted",
    );
    expect(calculatorPage).not.toContain("Fallback from business profile");
  });

  it("shows one compact annual budget with the supplied starting values", async () => {
    const [business, calculator, actions, migration] = await Promise.all([
      source("app/business/page.tsx"),
      source("components/calculator-workspace.tsx"),
      source("app/actions/ledger.ts"),
      source(
        "prisma/migrations/20260722120000_seed_annual_business_budget/migration.sql",
      ),
    ]);
    expect(business).toContain("Yearly business spending");
    expect(business).toContain("One source of truth");
    expect(business).toContain("Save yearly budget");
    expect(business).toContain("What Mükellef includes");
    expect(calculator).not.toContain('label="Monthly overhead"');
    expect(calculator).toContain("annualPackagingBudgetIncluded");
    expect(calculator).toContain("Included in annual budget");
    expect(calculator).toContain("Annual recurring-cost breakdown");
    expect(calculator).toContain("Mevcut planı sat");
    expect(calculator).toContain("Beklenen yıllık satış");
    expect(calculator).not.toContain("Full plan-period overhead");
    expect(calculator).not.toContain("Planning horizon");
    expect(calculator).not.toContain("Exclude overhead from this plan");
    expect(calculator).toContain("baseInput={planCalculationInput}");
    expect(calculator).toContain("showOverheadSensitivity={false}");
    expect(actions).toContain("saveAnnualBusinessBudgetAction");
    expect(actions).toContain("id: { notIn: annualBusinessBudgetIds }");
    expect(migration).toContain("2999, 'TRY', 'MONTHLY', 20");
    expect(migration).toContain("24, 'USD', 'MONTHLY', 0");
    expect(migration).toContain("1500, 'TRY', 'ANNUAL', 0");
    expect(migration).toContain("480, 'TRY', 'MONTHLY', 0");
    expect(actions).toContain("economicHourlyRateTry");
  });
});

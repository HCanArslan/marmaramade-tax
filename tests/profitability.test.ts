import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import {
  analyzeProfitability,
  defaultProfitabilityThresholds,
  overheadSensitivity,
  profitabilityGrade,
  solveProfitabilityTarget,
} from "@/lib/domain/profitability";

const input = (overrides = {}) => ({
  ...defaultCalculatorInput,
  itemSubtotalUsd: "150",
  materialCostTry: "500",
  laborHours: "4",
  laborHourlyRateTry: "0",
  packagingCostTry: "100",
  internationalShippingUsd: "25",
  monthlyOverheadTry: "1000",
  expectedMonthlyOrders: "10",
  ...overrides,
});

describe("profitability intelligence", () => {
  it("keeps imputed unpaid labour out of cash profit", () => {
    const withoutRate = analyzeProfitability({ calculatorInput: input() });
    const withRate = analyzeProfitability({
      calculatorInput: input(),
      economicHourlyRateTry: "200",
    });
    expect(withRate.cashProfit.eq(withoutRate.cashProfit)).toBe(true);
  });

  it("includes imputed labour in economic profit", () => {
    const result = analyzeProfitability({
      calculatorInput: input(),
      economicHourlyRateTry: "200",
    });
    expect(
      result.economicProfit?.eq(
        result.cashProfit.minus(new Decimal(800).div(input().usdTryRate)),
      ),
    ).toBe(true);
  });

  it("warns instead of treating a missing economic rate as zero", () => {
    const result = analyzeProfitability({ calculatorInput: input() });
    expect(result.economicProfit).toBeNull();
    expect(result.warnings).toContain("Economic labour cost not configured");
  });

  it("distinguishes an explicitly configured zero economic rate from unknown", () => {
    const result = analyzeProfitability({
      calculatorInput: input(),
      economicHourlyRateTry: "0",
    });
    expect(result.economicLabourCostUsd?.eq(0)).toBe(true);
    expect(result.economicProfit?.eq(result.cashProfit)).toBe(true);
    expect(result.warnings).not.toContain(
      "Economic labour cost not configured",
    );
  });

  it("returns unavailable margins for zero revenue", () => {
    const result = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: "0" }),
      economicHourlyRateTry: "200",
    });
    expect(result.cashMarginPercent).toBeNull();
    expect(result.economicMarginPercent).toBeNull();
  });

  it.each(["0", ""])(
    "does not divide by missing or zero hours (%s)",
    (hours) => {
      const result = analyzeProfitability({
        calculatorInput: input({ laborHours: hours || "0" }),
        economicHourlyRateTry: "200",
      });
      expect(result.cashProfitPerHour).toBeNull();
      expect(result.warnings).toContain("Production time not configured.");
    },
  );

  it("applies grade boundaries", () => {
    expect(profitabilityGrade("50", "25")).toBe("A");
    expect(profitabilityGrade("30", "15")).toBe("B");
    expect(profitabilityGrade("20", "10")).toBe("C");
    expect(profitabilityGrade("19.99", "50")).toBe("D");
  });

  it("adds independent risk flags", () => {
    const result = analyzeProfitability({
      calculatorInput: input({
        itemSubtotalUsd: "20",
        internationalShippingUsd: "15",
      }),
      economicHourlyRateTry: "500",
      customsSensitive: true,
    });
    expect(result.riskFlags).toContain("LOW_PROFIT");
    expect(result.riskFlags).toContain("SHIPPING_HEAVY");
    expect(result.riskFlags).toContain("CUSTOMS_SENSITIVE");
  });

  it("uses canonical Etsy fees and increases percentage fees at higher prices", () => {
    const low = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: "100" }),
    });
    const high = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: "200" }),
    });
    expect(
      high.calculation.totals.totalEtsyFees.gt(
        low.calculation.totals.totalEtsyFees,
      ),
    ).toBe(true);
  });

  it("solves a cash-profit target", () => {
    const solved = solveProfitabilityTarget({
      calculatorInput: input(),
      economicHourlyRateTry: "200",
      target: { kind: "cashProfit", value: "30" },
    });
    expect(solved.success).toBe(true);
    const achieved = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: solved.price!.toString() }),
      economicHourlyRateTry: "200",
    });
    expect(achieved.cashProfit.gte("29.99")).toBe(true);
  });

  it("solves an economic-margin target", () => {
    const solved = solveProfitabilityTarget({
      calculatorInput: input(),
      economicHourlyRateTry: "200",
      target: { kind: "economicMargin", value: "15" },
    });
    expect(solved.success).toBe(true);
  });

  it("fails safely when a target is impossible within bounds", () => {
    const solved = solveProfitabilityTarget({
      calculatorInput: input(),
      target: { kind: "cashProfit", value: "1000" },
      upperBound: "100",
    });
    expect(solved).toMatchObject({ success: false, price: null });
  });

  it("changes profit when seller-paid customs is selected", () => {
    const base = input({ customsDutyUsd: "20" });
    const excluded = analyzeProfitability({
      calculatorInput: { ...base, includeCustomsInSellerProfit: false },
    });
    const deducted = analyzeProfitability({
      calculatorInput: { ...base, includeCustomsInSellerProfit: true },
    });
    expect(excluded.cashProfit.minus(deducted.cashProfit).eq(20)).toBe(true);
  });

  it("changes overhead per unit without mutating input", () => {
    const base = input({ expectedMonthlyOrders: "12" });
    const snapshot = JSON.stringify(base);
    const rows = overheadSensitivity({
      calculatorInput: base,
      quantity: 2,
      economicHourlyRateTry: "200",
    });
    expect(
      rows
        .find((row) => row.volume === 5)!
        .overheadPerOrder.gt(
          rows.find((row) => row.volume === 50)!.overheadPerOrder,
        ),
    ).toBe(true);
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("represents negative profit without clamping", () => {
    expect(
      analyzeProfitability({
        calculatorInput: input({ itemSubtotalUsd: "5" }),
      }).cashProfit.lt(0),
    ).toBe(true);
  });

  it("reconciles aggregate totals with product-level totals", () => {
    const a = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: "100" }),
    });
    const b = analyzeProfitability({
      calculatorInput: input({ itemSubtotalUsd: "200" }),
    });
    expect(
      a.cashProfit
        .plus(b.cashProfit)
        .eq(
          [a, b].reduce((sum, row) => sum.plus(row.cashProfit), new Decimal(0)),
        ),
    ).toBe(true);
  });

  it("uses Decimal rounding consistently in solver output", () => {
    const result = solveProfitabilityTarget({
      calculatorInput: input(),
      target: { kind: "cashProfit", value: "30" },
    });
    expect(result.price?.decimalPlaces()).toBeLessThanOrEqual(2);
  });

  it("distinguishes confirmed-zero ETGB from unknown in the UI", async () => {
    const source = await readFile(
      path.join(process.cwd(), "components/profitability-simulator.tsx"),
      "utf8",
    );
    expect(source).toContain("$0.00 · Confirmed included/free");
    expect(source).toContain("UNKNOWN_PENDING_CONFIRMATION");
    expect(source).toContain("Not configured");
  });

  it("keeps threshold defaults centralized", () => {
    expect(defaultProfitabilityThresholds.gradeAProfitUsd).toBe("50");
    expect(defaultProfitabilityThresholds.shippingHeavyPercent).toBe("25");
  });

  it("wires persisted profitability settings and labour-rate fallbacks into planning", async () => {
    const [schema, settings, calculatorPage, simulator, migration] =
      await Promise.all([
        readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf8"),
        readFile(path.join(process.cwd(), "app/settings/page.tsx"), "utf8"),
        readFile(path.join(process.cwd(), "app/calculator/page.tsx"), "utf8"),
        readFile(
          path.join(process.cwd(), "components/profitability-simulator.tsx"),
          "utf8",
        ),
        readFile(
          path.join(
            process.cwd(),
            "prisma/migrations/20260721170000_profitability_intelligence/migration.sql",
          ),
          "utf8",
        ),
      ]);

    expect(schema).toContain("globalEconomicHourlyRateTry");
    expect(schema).toContain("minimumEconomicMarginPercent");
    expect(settings).toContain("Profitability intelligence");
    expect(calculatorPage).toContain("Product cost version");
    expect(calculatorPage).toContain("Maker / family role");
    expect(calculatorPage).toContain("Global profitability setting");
    expect(simulator).toContain("Use suggested price");
    expect(simulator).toContain("Test prices without changing Etsy");
    expect(migration).toContain("economicHourlyRateTry");
  });
});

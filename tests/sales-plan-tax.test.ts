import { readFile } from "node:fs/promises";
import path from "node:path";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  allocateAnnualOverhead,
  calculateAggregateTaxReserve,
  calculateSalesProjection,
} from "@/lib/domain/sales-plan";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("aggregate Sales Plan tax reserve", () => {
  it("returns zero for a negative aggregate pre-tax result", () => {
    const result = calculateAggregateTaxReserve("-515.94", "20");
    expect(result.taxReserve.toString()).toBe("0");
    expect(result.finalProfit.toString()).toBe("-515.94");
  });

  it("returns zero for an exactly zero aggregate pre-tax result", () => {
    const result = calculateAggregateTaxReserve("0", "20");
    expect(result.taxReserve.toString()).toBe("0");
    expect(result.finalProfit.toString()).toBe("0");
  });

  it("reserves $20 from $100 positive aggregate pre-tax profit at 20%", () => {
    const result = calculateAggregateTaxReserve("100", "20");
    expect(result.taxReserve.toString()).toBe("20");
    expect(result.finalProfit.toString()).toBe("80");
  });

  it("does not sum positive product reserves when the mixed plan loses money", () => {
    const productPreTaxResults = [new Decimal("60"), new Decimal("-100")];
    const aggregate = productPreTaxResults.reduce(
      (total, value) => total.plus(value),
      new Decimal(0),
    );
    expect(
      calculateAggregateTaxReserve(aggregate, "20").taxReserve.toString(),
    ).toBe("0");
  });

  it("returns zero when fixed overhead turns contribution into a loss", () => {
    const contributionBeforeOverhead = new Decimal("100");
    const fixedOverhead = new Decimal("125");
    const result = calculateAggregateTaxReserve(
      contributionBeforeOverhead.minus(fixedOverhead),
      "20",
    );
    expect(result.aggregatePreTaxProfit.toString()).toBe("-25");
    expect(result.taxReserve.toString()).toBe("0");
    expect(result.finalProfit.toString()).toBe("-25");
  });

  it("uses pre-tax profit as its base and has no circular reserve calculation", () => {
    const result = calculateAggregateTaxReserve("100", "20");
    expect(
      result.aggregatePreTaxProfit
        .minus(result.taxReserve)
        .eq(result.finalProfit),
    ).toBe(true);
    expect(result.taxReserve.toString()).toBe("20");
    expect(result.taxReserve.toString()).not.toBe("16");
  });

  it("disables per-product reserve and applies one aggregate reserve in the workspace", async () => {
    const workspace = await source("components/calculator-workspace.tsx");
    expect(workspace).toContain('taxReserveRate: "0"');
    expect(workspace).toContain("planTotalsBeforeTax.preTaxProfit");
    expect(workspace).toContain("calculateAggregateTaxReserve");
    expect(workspace).toContain(
      "No reserve because aggregate pre-tax planning profit is not positive.",
    );
    expect(workspace).toContain(
      "% reserve on positive aggregate pre-tax planning profit.",
    );
  });
});

describe("Sales Plan overhead and volume projections", () => {
  it("keeps current inventory separate from expected annual sales allocation", () => {
    expect(
      allocateAnnualOverhead({
        annualOverhead: "12000",
        mode: "EXPECTED_ANNUAL_SALES",
        plannedUnits: "12",
        expectedAnnualSales: "120",
      }).toString(),
    ).toBe("1200");
  });

  it("supports full annual and excluded overhead modes", () => {
    const common = {
      annualOverhead: "12000",
      plannedUnits: "12",
      expectedAnnualSales: "120",
    };
    expect(
      allocateAnnualOverhead({ ...common, mode: "FULL_ANNUAL" }).toString(),
    ).toBe("12000");
    expect(
      allocateAnnualOverhead({ ...common, mode: "EXCLUDED" }).toString(),
    ).toBe("0");
  });

  it("scales 30, 50, and 100 sales while fixed costs remain fixed", () => {
    const project = (salesQuantity: number) =>
      calculateSalesProjection({
        salesQuantity,
        averageSellerRevenue: "100",
        averageVariableCost: "40",
        annualFixedBusinessCosts: "1000",
        taxReserveRate: "20",
      });
    expect(project(30).projectedContribution.toString()).toBe("1800");
    expect(project(50).projectedContribution.toString()).toBe("3000");
    expect(project(100).projectedContribution.toString()).toBe("6000");
    expect(project(30).fixedBusinessCosts.toString()).toBe("1000");
    expect(project(100).fixedBusinessCosts.toString()).toBe("1000");
  });

  it("calculates break-even from positive contribution and suppresses misleading results", () => {
    const positive = calculateSalesProjection({
      salesQuantity: 10,
      averageSellerRevenue: 100,
      averageVariableCost: 60,
      annualFixedBusinessCosts: 1000,
      taxReserveRate: 20,
    });
    expect(positive.averageContribution.toString()).toBe("40");
    expect(positive.breakEvenSales?.toString()).toBe("25");
    const nonPositive = calculateSalesProjection({
      salesQuantity: 10,
      averageSellerRevenue: 50,
      averageVariableCost: 50,
      annualFixedBusinessCosts: 1000,
      taxReserveRate: 20,
    });
    expect(nonPositive.breakEvenSales).toBeNull();
  });

  it("reconciles projected contribution, pre-tax result, reserve, and final profit", () => {
    const result = calculateSalesProjection({
      salesQuantity: 30,
      averageSellerRevenue: 100,
      averageVariableCost: 40,
      annualFixedBusinessCosts: 1000,
      taxReserveRate: 20,
    });
    expect(result.aggregatePreTaxProfit.toString()).toBe("800");
    expect(result.taxReserve.toString()).toBe("160");
    expect(result.finalCashProfit.toString()).toBe("640");
    expect(
      result.aggregatePreTaxProfit
        .minus(result.taxReserve)
        .eq(result.finalCashProfit),
    ).toBe(true);
  });

  it("current-mix averages reconcile with the same quantity", () => {
    const totalRevenue = new Decimal("1000");
    const totalVariableCosts = new Decimal("400");
    const units = new Decimal("10");
    const result = calculateSalesProjection({
      salesQuantity: units,
      averageSellerRevenue: totalRevenue.div(units),
      averageVariableCost: totalVariableCosts.div(units),
      annualFixedBusinessCosts: "100",
      taxReserveRate: "20",
    });
    expect(result.projectedRevenue.eq(totalRevenue)).toBe(true);
    expect(result.projectedVariableCosts.eq(totalVariableCosts)).toBe(true);
  });

  it("wires representative-product and customs modes without arbitrary zero-unit averages", async () => {
    const workspace = await source("components/calculator-workspace.tsx");
    expect(workspace).toContain('"REPRESENTATIVE_PRODUCT"');
    expect(workspace).toContain("selectedRepresentativeRow");
    expect(workspace).toContain("if (planTotals.units <= 0) return null");
    expect(workspace).toContain("Gümrük senaryosu");
    expect(workspace).toContain(
      "calculationInput.includeCustomsInSellerProfit",
    );
  });
});

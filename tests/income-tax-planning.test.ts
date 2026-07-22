import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { calculateIncomeTaxPlanningReserve } from "@/lib/domain/income-tax-planning";
import { calculateAggregateTaxReserve } from "@/lib/domain/sales-plan";

const plan = (enabled: boolean) =>
  calculateIncomeTaxPlanningReserve({
    businessProfit: "100000",
    reserveRate: "20",
    useMicroExportBenefit: enabled,
  });

describe("micro-export income-tax planning benefit", () => {
  it("changes the taxable planning base from 100% to 50%", () => {
    expect(plan(false).taxablePlanningBase.toString()).toBe("100000");
    expect(plan(true).taxablePlanningBase.toString()).toBe("50000");
  });

  it("never changes business profit", () => {
    expect(plan(false).businessProfit.toString()).toBe("100000");
    expect(plan(true).businessProfit.toString()).toBe("100000");
  });

  it("changes only the selected taxable planning base", () => {
    const result = plan(true);
    expect(result.taxablePlanningBaseWithoutBenefit.toString()).toBe("100000");
    expect(result.taxablePlanningBaseWithBenefit.toString()).toBe("50000");
    expect(result.businessProfit.toString()).toBe("100000");
  });

  it("applies the configured reserve to the adjusted planning base", () => {
    expect(plan(true).reserve.toString()).toBe("10000");
    expect(plan(false).reserve.toString()).toBe("20000");
  });

  it("turning the toggle off restores the full-profit planning base", () => {
    const enabled = plan(true);
    const disabled = plan(false);
    expect(enabled.taxablePlanningBase.toString()).toBe("50000");
    expect(disabled.taxablePlanningBase.toString()).toBe("100000");
  });

  it("integrates the adjusted base into the canonical calculator", () => {
    const result = calculate({
      ...defaultCalculatorInput,
      taxReserveRate: "20",
      useMicroExportIncomeTaxBenefit: true,
    });
    expect(
      result.totals.taxablePlanningProfit.eq(
        result.totals.estimatedPreTaxProfit.mul("0.5"),
      ),
    ).toBe(true);
    expect(
      result.totals.taxReserve.eq(
        result.totals.taxablePlanningProfit.mul("0.2"),
      ),
    ).toBe(true);
  });

  it("uses the same adjusted aggregate base in Sales Plan", () => {
    const result = calculateAggregateTaxReserve("100000", "20", true);
    expect(result.aggregatePreTaxProfit.toString()).toBe("100000");
    expect(result.taxablePlanningProfit.toString()).toBe("50000");
    expect(result.taxReserve.toString()).toBe("10000");
    expect(result.finalProfit.toString()).toBe("90000");
  });

  it("keeps advanced CRUD collapsed and VAT refunds outside planning", async () => {
    const page = await readFile(
      path.join(process.cwd(), "app/taxes/page.tsx"),
      "utf8",
    );
    expect(page).toContain("Mikro İhracat Vergi Avantajları");
    expect(page).toContain("Gelişmiş Vergi Kuralları");
    expect(page).toContain("<details");
    expect(page).toContain("KDV iadesi hesaplamaz");
    expect(page).not.toContain("upsertVatPeriodAction");
  });
});

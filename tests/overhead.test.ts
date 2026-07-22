import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import {
  monthStartUtc,
  monthlyOverheadTotalTry,
  resolvePlanOverhead,
} from "@/lib/domain/overhead";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("monthly overhead auditability", () => {
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

  it("deducts exactly three months of fixed overhead for a three-month plan", () => {
    const allocation = resolvePlanOverhead({
      treatment: "FULL_PERIOD",
      monthlyOverheadTry: "6750",
      horizonMonths: "3",
      plannedUnits: "12",
      configuredMethod: "EXPECTED_SALES",
      expectedMonthlyOrders: "5",
      actualMonthlyOrders: "0",
      manualOverheadPerOrderTry: "0",
    });
    expect(allocation.totalPlanOverheadTry.toString()).toBe("20250");
    expect(allocation.manualOverheadPerOrderTry.toString()).toBe("1687.5");

    const perUnit = calculate({
      ...defaultCalculatorInput,
      monthlyOverheadTry: "6750",
      overheadAllocationMethod: allocation.allocationMethod,
      manualOverheadPerOrderTry: allocation.manualOverheadPerOrderTry,
      usdTryRate: "47.1134",
    });
    expect(
      perUnit.totals.allocatedBusinessOverheadUsd
        .mul(12)
        .mul("47.1134")
        .eq("20250"),
    ).toBe(true);
  });

  it("keeps per-order and excluded treatments mutually exclusive", () => {
    const common = {
      monthlyOverheadTry: "6750",
      horizonMonths: "3",
      plannedUnits: "12",
      configuredMethod: "EXPECTED_SALES" as const,
      expectedMonthlyOrders: "5",
      actualMonthlyOrders: "0",
      manualOverheadPerOrderTry: "0",
    };
    expect(
      resolvePlanOverhead({
        ...common,
        treatment: "PER_ORDER",
      }).totalPlanOverheadTry.toString(),
    ).toBe("16200");
    expect(
      resolvePlanOverhead({
        ...common,
        treatment: "EXCLUDED",
      }).totalPlanOverheadTry.toString(),
    ).toBe("0");
  });

  it("excludes future overhead records and does not fall back to unrelated profiles", async () => {
    const calculatorPage = await source("app/calculator/page.tsx");
    expect(calculatorPage).toContain(
      "where: { month: { lte: monthStartUtc(now) } }",
    );
    expect(calculatorPage).toContain(
      "No current monthly overhead record; no overhead deducted",
    );
    expect(calculatorPage).not.toContain("Fallback from business profile");
  });

  it("shows saved records and exact allocation evidence without phantom defaults", async () => {
    const [business, calculator, actions] = await Promise.all([
      source("app/business/page.tsx"),
      source("components/calculator-workspace.tsx"),
      source("app/actions/ledger.ts"),
    ]);
    expect(business).toContain("Saved monthly overhead");
    expect(business).toContain("Future · not used yet");
    expect(business).toContain('defaultValue="0"');
    expect(business).not.toContain('name === "etsyPlusTry" ? "500"');
    expect(calculator).toContain("Exact saved breakdown");
    expect(calculator).toContain("Per planned order");
    expect(calculator).toContain("Full plan-period overhead (recommended)");
    expect(calculator).toContain("Exclude overhead from this plan");
    expect(calculator).toContain("Full-period net profit deducts");
    expect(calculator).toContain("baseInput={planCalculationInput}");
    expect(calculator).toContain(
      'showOverheadSensitivity={planOverheadTreatment === "PER_ORDER"}',
    );
    expect(actions).toContain("deleteMonthlyOverheadAction");
    expect(actions).toContain("economicHourlyRateTry");
  });
});

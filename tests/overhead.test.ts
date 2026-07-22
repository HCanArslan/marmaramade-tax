import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
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

  it("excludes future overhead records and does not fall back to unrelated profiles", async () => {
    const calculatorPage = await source("app/calculator/page.tsx");
    expect(calculatorPage).toContain(
      "where: { month: { lte: monthStartUtc(now) } }",
    );
    expect(calculatorPage).toContain("prisma.recurringBusinessCost.findMany");
    expect(calculatorPage).toContain(
      "No annual recurring business costs configured; no Sales Plan overhead deducted",
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
    expect(business).toContain("Annual sell-all planning");
    expect(business).toContain("Recurring business costs");
    expect(calculator).toContain("Annual recurring-cost breakdown");
    expect(calculator).toContain("Annual sell-all scenario");
    expect(calculator).toContain('value="One year"');
    expect(calculator).not.toContain("Full plan-period overhead");
    expect(calculator).not.toContain("Planning horizon");
    expect(calculator).not.toContain("Exclude overhead from this plan");
    expect(calculator).toContain("baseInput={planCalculationInput}");
    expect(calculator).toContain("showOverheadSensitivity={false}");
    expect(actions).toContain("deleteMonthlyOverheadAction");
    expect(actions).toContain("createRecurringBusinessCostAction");
    expect(actions).toContain("updateRecurringBusinessCostAction");
    expect(actions).toContain("deleteRecurringBusinessCostAction");
    expect(actions).toContain("economicHourlyRateTry");
  });
});

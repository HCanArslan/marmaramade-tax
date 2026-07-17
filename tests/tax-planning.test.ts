import { describe, expect, it } from "vitest";
import {
  calculateFlatTax,
  calculateProgressiveTax,
} from "@/lib/domain/tax-planning";

describe("tax planning", () => {
  it("calculates the supplied first two 2026 annual brackets progressively", () => {
    const result = calculateProgressiveTax("300000", [
      { lowerBound: 0, upperBound: 190000, rate: 15 },
      { lowerBound: 190000, upperBound: 400000, rate: 20 },
    ]);

    expect(result.tax.toFixed(2)).toBe("50500.00");
    expect(result.fullyCovered).toBe(true);
    expect(result.lines[1].taxableAmount.toFixed(2)).toBe("110000.00");
  });

  it("does not silently extrapolate beyond configured brackets", () => {
    const result = calculateProgressiveTax("450000", [
      { lowerBound: 0, upperBound: 190000, rate: 15 },
      { lowerBound: 190000, upperBound: 400000, rate: 20 },
    ]);

    expect(result.fullyCovered).toBe(false);
    expect(result.uncoveredBase.toFixed(2)).toBe("50000.00");
  });

  it("uses 15% for the supplied provisional-tax example", () => {
    expect(calculateFlatTax("30000", 15).toFixed(2)).toBe("4500.00");
  });
});

import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { convertWithExchangeRate } from "@/lib/domain/currency-conversion";
import { genericMoney, SUPPORTED_CURRENCY_CODES } from "@/lib/domain/currency-money";
import { exchangeRate } from "@/lib/domain/exchange-rate";

describe("generic Decimal currency foundation", () => {
  const capturedAt = new Date("2026-07-01T00:00:00.000Z");
  const usdTry = exchangeRate({ baseCurrency: "USD", quoteCurrency: "TRY", rate: "40.25", capturedAt, source: "fixture" });

  it("supports the initial six SaaS currencies at the data boundary", () => {
    expect(SUPPORTED_CURRENCY_CODES).toEqual(["TRY", "USD", "EUR", "GBP", "CAD", "AUD"]);
  });

  it("converts USD to TRY and TRY to USD with explicit direction", () => {
    const forward = convertWithExchangeRate(genericMoney("10.10", "USD"), usdTry, "TRY");
    const reverse = convertWithExchangeRate(genericMoney("406.525", "TRY"), usdTry, "USD");
    expect(forward.direction).toBe("BASE_TO_QUOTE");
    expect(forward.reporting.amount.toFixed(3)).toBe("406.525");
    expect(reverse.direction).toBe("QUOTE_TO_BASE");
    expect(reverse.reporting.amount.toFixed(2)).toBe("10.10");
  });

  it("converts EUR to TRY using its captured historical snapshot", () => {
    const historical = exchangeRate({ baseCurrency: "EUR", quoteCurrency: "TRY", rate: "47.125", capturedAt, source: "historical" });
    const result = convertWithExchangeRate(genericMoney("3.2", "EUR"), historical, "TRY");
    expect(result.reporting.amount.toString()).toBe("150.8");
    expect(result.rate.capturedAt).toEqual(capturedAt);
  });

  it.each(["0", "-1"])("rejects the invalid rate %s", (rate) => {
    expect(() => exchangeRate({ baseCurrency: "USD", quoteCurrency: "TRY", rate, capturedAt })).toThrow("positive");
  });

  it("retains the historical rate object when a newer rate exists", () => {
    const original = genericMoney("19.99", "USD");
    const historical = convertWithExchangeRate(original, usdTry, "TRY");
    const current = exchangeRate({ baseCurrency: "USD", quoteCurrency: "TRY", rate: "55", capturedAt: new Date("2026-08-01T00:00:00.000Z") });
    expect(convertWithExchangeRate(original, current, "TRY").reporting.amount.toString()).not.toBe(historical.reporting.amount.toString());
    expect(historical.reporting.amount.toString()).toBe(new Decimal("19.99").mul("40.25").toString());
  });
});

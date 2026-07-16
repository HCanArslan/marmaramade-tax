import { describe, expect, it } from "vitest";
import {
  calculate,
  customsTotal,
  quoteWarnings,
  resolveEffectiveVersion,
  solvePrice,
  volumetricWeight,
} from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { convert, money } from "@/lib/domain/money";
import { parseTcmbUsdTryRate } from "@/lib/exchange-rate";

const calc = (overrides = {}) =>
  calculate({ ...defaultCalculatorInput, ...overrides });
const n = (value: { toNumber(): number }) => value.toNumber();

describe("MarmaraMade calculation engine", () => {
  it("calculates a 150 USD sale without Offsite Ads", () =>
    expect(n(calc().totals.grossRevenue)).toBe(150));
  it("calculates a 150 USD sale with 15% Offsite Ads", () =>
    expect(
      calc({ offsiteAdAttributed: true, offsiteAdsRate: "15" }).lines.find(
        (l) => l.name === "Offsite Ads",
      )?.nativeAmount,
    ).toBe("22.5"));
  it("calculates a 150 USD sale with 12% Offsite Ads", () =>
    expect(
      calc({ offsiteAdAttributed: true, offsiteAdsRate: "12" }).lines.find(
        (l) => l.name === "Offsite Ads",
      )?.nativeAmount,
    ).toBe("18"));
  it("calculates the 6.5% transaction fee", () =>
    expect(
      calc().lines.find((l) => l.name === "Transaction fee")?.nativeAmount,
    ).toBe("9.75"));
  it("keeps 6.5% Türkiye processing and 14 TRY separate", () => {
    const r = calc();
    expect(
      r.lines.find((l) => l.name === "Payment processing percentage")
        ?.nativeAmount,
    ).toBe("9.75");
    expect(
      r.lines.find((l) => l.name === "Payment processing fixed")?.nativeAmount,
    ).toBe("14");
  });
  it("calculates the 1.67% regulatory fee", () =>
    expect(
      calc().lines.find((l) => l.name === "Regulatory operating fee")
        ?.nativeAmount,
    ).toBe("2.505"));
  it("calculates the 2.5% conversion fee", () =>
    expect(
      calc().lines.find((l) => l.name === "Currency conversion fee")
        ?.nativeAmount,
    ).toBe("3.75"));
  it("can disable conversion fee", () =>
    expect(
      calc({ currencyConversionRequired: false }).lines.find(
        (l) => l.name === "Currency conversion fee",
      )?.nativeAmount,
    ).toBe("0"));
  it("charges or omits seller-fee VAT by treatment", () =>
    expect(
      n(calc({ vatTreatment: "NOT_CHARGED_BY_ETSY" }).totals.etsyFeeVatUsd),
    ).toBe(0));
  it("honors fee-level VAT applicability", () => {
    const all = calc().totals.etsyFeeVatUsd;
    const none = calc({ vatApplicable: {} }).totals.etsyFeeVatUsd;
    expect(all.gt(none)).toBe(true);
  });
  it("enables and disables deposit fee", () => {
    expect(
      calc().lines.find((l) => l.name === "Deposit fee")?.nativeAmount,
    ).toBe("0");
    expect(
      calc({ depositFeeApplies: true }).lines.find(
        (l) => l.name === "Deposit fee",
      )?.nativeAmount,
    ).toBe("42");
  });
  it("converts fixed TRY fee to USD with snapshot rate", () =>
    expect(convert(money(14, "TRY"), 40, "USD").amount.toNumber()).toBe(0.35));
  it("preserves native TRY values", () =>
    expect(
      calc({ materialCostTry: "250" }).lines.find((l) => l.name === "Material"),
    ).toMatchObject({ nativeAmount: "250", nativeCurrency: "TRY" }));
  it("preserves native USD values", () =>
    expect(
      calc({ internationalShippingUsd: "34.21" }).lines.find(
        (l) => l.name === "International shipping",
      ),
    ).toMatchObject({ nativeAmount: "34.21", nativeCurrency: "USD" }));
  it("verifies the US customs example as 28.95 USD", () => {
    const q = customsTotal({
      declaredValue: 150,
      dutyRate: 6.3,
      tariffRate: 10,
      processingFee: 4.5,
    });
    expect(q.duty.toNumber()).toBe(9.45);
    expect(q.tariff.toNumber()).toBe(15);
    expect(q.total.toNumber()).toBe(28.95);
  });
  it("preserves a supplied 34.21 USD shipping quote", () =>
    expect(
      n(
        calc({ internationalShippingUsd: "34.21" }).totals
          .internationalShippingUsd,
      ),
    ).toBe(34.21));
  it("calculates volumetric and billable weight", () =>
    expect(volumetricWeight(40, 30, 7, 5000).toNumber()).toBe(1.68));
  it("solves reverse price for desired profit", () => {
    const price = solvePrice(defaultCalculatorInput, {
      kind: "profitUsd",
      value: 50,
    });
    expect(price.gt(0)).toBe(true);
    expect(
      calculate({
        ...defaultCalculatorInput,
        itemSubtotalUsd: price,
      }).totals.estimatedAfterReserveProfit.gte(49.99),
    ).toBe(true);
  });
  it("solves price for desired margin", () => {
    const price = solvePrice(defaultCalculatorInput, {
      kind: "margin",
      value: 30,
    });
    expect(
      calculate({
        ...defaultCalculatorInput,
        itemSubtotalUsd: price,
      }).totals.afterReserveMargin.gte(29.99),
    ).toBe(true);
  });
  it("keeps a serialized order snapshot unchanged after fee updates", () => {
    const snapshot = JSON.stringify(calc().lines);
    calc({ transactionRate: 9 });
    expect(JSON.stringify(calc().lines)).toBe(snapshot);
  });
  it("keeps a serialized order snapshot unchanged after business changes", () => {
    const snapshot = JSON.stringify(calc().totals);
    calc({ monthlyOverheadTry: 10000 });
    expect(JSON.stringify(calc().totals)).toBe(snapshot);
  });
  it("selects BusinessProfileVersion by order date", () => {
    const versions = [
      {
        name: "old",
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: new Date("2026-01-01"),
      },
      { name: "new", effectiveFrom: new Date("2026-01-01"), effectiveTo: null },
    ];
    expect(
      resolveEffectiveVersion(versions, new Date("2026-07-14"))?.name,
    ).toBe("new");
  });
  it("selects FeeProfile by order date", () => {
    const versions = [
      {
        name: "2025",
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: new Date("2026-01-01"),
      },
      { name: "2026", effectiveFrom: new Date("2026-01-01") },
    ];
    expect(
      resolveEffectiveVersion(versions, new Date("2026-03-01"))?.name,
    ).toBe("2026");
  });
  it("caps Offsite Ads at 100 USD", () =>
    expect(
      calc({ itemSubtotalUsd: "1000", offsiteAdAttributed: true }).lines.find(
        (l) => l.name === "Offsite Ads",
      )?.nativeAmount,
    ).toBe("100"));
  it("compares individual and sole-proprietorship assumptions", () => {
    const individual = calc();
    const company = calc({
      vatTreatment: "NOT_CHARGED_BY_ETSY",
      monthlyOverheadTry: "8000",
      businessStatus: "SOLE_PROPRIETORSHIP",
    });
    expect(
      individual.totals.etsyFeeVatUsd.gt(company.totals.etsyFeeVatUsd),
    ).toBe(true);
    expect(
      company.totals.allocatedBusinessOverheadUsd.gt(
        individual.totals.allocatedBusinessOverheadUsd,
      ),
    ).toBe(true);
  });
  it("matches consolidated TRY and USD summaries", () => {
    const r = calc();
    expect(
      r.totals.totalCostUsd
        .mul(defaultCalculatorInput.usdTryRate)
        .equals(r.totals.totalCostTry),
    ).toBe(true);
  });
  it("warns when DDP customs is zero", () =>
    expect(
      quoteWarnings({
        destination: "US",
        quoteDestination: "US",
        incoterm: "DDP",
        importCost: 0,
      }),
    ).toContain("DDP shipment has no import costs entered."));
  it("warns for an expired quote", () =>
    expect(
      quoteWarnings({
        destination: "US",
        quoteDestination: "US",
        incoterm: "DDP",
        importCost: 1,
        expirationDate: new Date("2025-01-01"),
        now: new Date("2026-01-01"),
      }),
    ).toContain("Quote has expired."));
  it("warns for an HS-code mismatch", () =>
    expect(
      quoteWarnings({
        destination: "US",
        quoteDestination: "US",
        incoterm: "DDP",
        importCost: 1,
        productHsCode: "4202",
        quoteHsCode: "9999",
      }),
    ).toContain("Product HS code does not match the customs quote."));
});

describe("USD/TRY reference rate", () => {
  it("parses TCMB's USD indicative buying rate and publication date", () => {
    const xml =
      '<Tarih_Date Date="07/15/2026"><Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><ForexBuying>47.0300</ForexBuying><ForexSelling>47.1147</ForexSelling></Currency></Tarih_Date>';
    expect(parseTcmbUsdTryRate(xml)).toEqual({
      rate: "47.0300",
      asOf: "2026-07-15",
    });
  });
});

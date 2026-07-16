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
  it("keeps material, labour, packaging, and other direct costs separate", () => {
    const totals = calc({
      materialCostTry: "100",
      laborHours: "2",
      laborHourlyRateTry: "50",
      packagingCostTry: "25",
      additionalDirectCostTry: "10",
      usdTryRate: "50",
    }).totals;
    expect(totals.materialCostUsd.toNumber()).toBe(2);
    expect(totals.laborUsd.toNumber()).toBe(2);
    expect(totals.packagingCostUsd.toNumber()).toBe(0.5);
    expect(totals.additionalDirectCostUsd.toNumber()).toBe(0.2);
    expect(totals.directProductCostUsd.toNumber()).toBe(4.7);
  });
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
  it("verifies the editable 149 USD customs estimate as 28.79 USD", () => {
    const q = customsTotal({
      declaredValue: 149,
      dutyRate: 6.3,
      tariffRate: 10,
      processingFee: 4.5,
    });
    expect(q.duty.toFixed(2)).toBe("9.39");
    expect(q.tariff.toFixed(2)).toBe("14.90");
    expect(q.total.toFixed(2)).toBe("28.79");
  });
  it("keeps customs visible but out of profit while payer is unknown", () => {
    const result = calc({
      internationalShippingUsd: "50.83",
      customsDutyUsd: "9.39",
      additionalTariffUsd: "14.90",
      carrierProcessingFeeUsd: "4.50",
      includeCustomsInSellerProfit: false,
    });
    expect(result.totals.internationalShippingUsd.toFixed(2)).toBe("50.83");
    expect(result.totals.customsExposureUsd.toFixed(2)).toBe("28.79");
    expect(result.totals.customsAndTariffUsd.toFixed(2)).toBe("0.00");
  });
  it("deducts 79.62 USD logistics when the seller pays customs", () => {
    const result = calc({
      internationalShippingUsd: "50.83",
      customsDutyUsd: "9.39",
      additionalTariffUsd: "14.90",
      carrierProcessingFeeUsd: "4.50",
      includeCustomsInSellerProfit: true,
    });
    expect(
      result.totals.internationalShippingUsd
        .plus(result.totals.customsAndTariffUsd)
        .toFixed(2),
    ).toBe("79.62");
  });
  it("does not invent an ETGB deduction while its cost is unknown", () => {
    const unknown = calc({
      etgbCostUsd: "0",
      includeEtgbInSellerProfit: false,
    });
    expect(unknown.totals.etgbCostUsd.toFixed(2)).toBe("0.00");
    expect(unknown.warnings.some((warning) => warning.includes("ETGB"))).toBe(
      true,
    );
  });
  it("deducts a confirmed ETGB charge only when explicitly enabled", () => {
    const excluded = calc({
      etgbCostUsd: "8",
      includeEtgbInSellerProfit: false,
    });
    const included = calc({
      etgbCostUsd: "8",
      includeEtgbInSellerProfit: true,
    });
    expect(excluded.totals.etgbCostUsd.toNumber()).toBe(0);
    expect(included.totals.etgbCostUsd.toNumber()).toBe(8);
    expect(
      excluded.totals.estimatedAfterReserveProfit
        .minus(included.totals.estimatedAfterReserveProfit)
        .toNumber(),
    ).toBe(8);
  });
  it("allocates the 4,500 TRY company package plus 500 TRY Etsy Plus", () => {
    const expected = calc({
      monthlyOverheadTry: "5000",
      expectedMonthlyOrders: "10",
      overheadAllocationMethod: "EXPECTED_SALES",
      usdTryRate: "50",
    });
    const actual = calc({
      monthlyOverheadTry: "5000",
      actualMonthlyOrders: "5",
      overheadAllocationMethod: "ACTUAL_SALES",
      usdTryRate: "50",
    });
    expect(expected.totals.allocatedBusinessOverheadUsd.toNumber()).toBe(10);
    expect(actual.totals.allocatedBusinessOverheadUsd.toNumber()).toBe(20);
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

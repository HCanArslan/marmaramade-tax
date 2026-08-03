import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { analyzeProfitability } from "@/lib/domain/profitability";
import { calculateSalesProjection } from "@/lib/domain/sales-plan";
import type { CalculatorInput } from "@/lib/domain/types";

const calculationTotalKeys = [
  "grossRevenue",
  "etsyBaseFees",
  "etsyFeeVatUsd",
  "totalEtsyFees",
  "directProductCostUsd",
  "domesticLogisticsUsd",
  "internationalShippingUsd",
  "customsExposureUsd",
  "customsAndTariffUsd",
  "allocatedBusinessOverheadUsd",
  "estimatedPreTaxProfit",
  "taxReserve",
  "estimatedAfterReserveProfit",
  "totalCostUsd",
  "afterReserveMargin",
] as const;

const snapshotCalculation = (input: CalculatorInput) => {
  const result = calculate(input);
  return Object.fromEntries(
    calculationTotalKeys.map((key) => [key, result.totals[key].toString()]),
  );
};

// Representative current Turkey-to-USA Etsy economics. Destination is not a
// calculator input yet, so the route is represented by TRY costs, USD revenue,
// USD international shipping, and the existing US customs estimate.
const turkeyToUsaEtsySaleInput: CalculatorInput = {
  ...defaultCalculatorInput,
  itemSubtotalUsd: "150",
  materialCostTry: "500",
  laborHours: "4",
  laborHourlyRateTry: "200",
  packagingCostTry: "100",
  additionalDirectCostTry: "50",
  domesticTransferCostTry: "80",
  internationalShippingUsd: "34.21",
  customsDutyUsd: "9.45",
  additionalTariffUsd: "15",
  carrierProcessingFeeUsd: "4.5",
  includeCustomsInSellerProfit: false,
  monthlyOverheadTry: "5000",
  expectedMonthlyOrders: "10",
  returnReserveRate: "2",
  damageReserveRate: "1",
  exchangeLossReserveRate: "1",
  taxReserveRate: "0",
  usdTryRate: "47.03",
};

const standardSaleExpected = {
  grossRevenue: "150",
  etsyBaseFees: "26.25268233042738677439931958",
  etsyFeeVatUsd: "5.250536466085477354879863917",
  totalEtsyFees: "31.5032187965128641292791835",
  directProductCostUsd: "30.83138422283648734850095684",
  domesticLogisticsUsd: "1.701041888156495853710397619",
  internationalShippingUsd: "34.21",
  customsExposureUsd: "28.95",
  customsAndTariffUsd: "0",
  allocatedBusinessOverheadUsd: "10.63151180097809908568998512",
  estimatedPreTaxProfit: "35.12284329151605358281947699",
  taxReserve: "0",
  estimatedAfterReserveProfit: "35.12284329151605358281947699",
  totalCostUsd: "114.877156708483946417180523",
  afterReserveMargin: "23.41522886101070238854631799",
};

describe("SaaS conversion calculation parity", () => {
  it("preserves a standard Turkey-to-USA Etsy sale", () => {
    expect(snapshotCalculation(turkeyToUsaEtsySaleInput)).toEqual(
      standardSaleExpected,
    );
  });

  it("preserves seller-paid customs treatment", () => {
    expect(
      snapshotCalculation({
        ...turkeyToUsaEtsySaleInput,
        includeCustomsInSellerProfit: true,
      }),
    ).toEqual({
      ...standardSaleExpected,
      customsAndTariffUsd: "28.95",
      estimatedPreTaxProfit: "6.17284329151605358281947699",
      estimatedAfterReserveProfit: "6.17284329151605358281947699",
      totalCostUsd: "143.827156708483946417180523",
      afterReserveMargin: "4.115228861010702388546317993",
    });
  });

  it("preserves a 15% Offsite Ads sale", () => {
    expect(
      snapshotCalculation({
        ...turkeyToUsaEtsySaleInput,
        offsiteAdAttributed: true,
      }),
    ).toEqual({
      ...standardSaleExpected,
      etsyBaseFees: "48.75268233042738677439931958",
      etsyFeeVatUsd: "9.750536466085477354879863917",
      totalEtsyFees: "58.5032187965128641292791835",
      estimatedPreTaxProfit: "8.12284329151605358281947692",
      estimatedAfterReserveProfit: "8.12284329151605358281947692",
      totalCostUsd: "141.8771567084839464171805231",
      afterReserveMargin: "5.415228861010702388546317947",
    });
  });

  it("preserves a sale with a 20% tax-planning reserve", () => {
    expect(
      snapshotCalculation({
        ...turkeyToUsaEtsySaleInput,
        taxReserveRate: "20",
        useMicroExportIncomeTaxBenefit: false,
      }),
    ).toEqual({
      ...standardSaleExpected,
      taxReserve: "7.024568658303210716563895398",
      estimatedAfterReserveProfit: "28.09827463321284286625558159",
      totalCostUsd: "121.9017253667871571337444184",
      afterReserveMargin: "18.73218308880856191083705439",
    });
  });

  it("preserves the nearest existing 100-product sales-plan equivalent", () => {
    const result = calculateSalesProjection({
      salesQuantity: "100",
      averageSellerRevenue: "150",
      averageVariableCost: "100",
      annualFixedBusinessCosts: "1000",
      taxReserveRate: "20",
      useMicroExportIncomeTaxBenefit: false,
      averageProductionHours: "4",
      averageEconomicLabourCost: "25",
    });

    expect({
      salesQuantity: result.salesQuantity.toString(),
      projectedRevenue: result.projectedRevenue.toString(),
      projectedVariableCosts: result.projectedVariableCosts.toString(),
      averageContribution: result.averageContribution.toString(),
      projectedContribution: result.projectedContribution.toString(),
      fixedBusinessCosts: result.fixedBusinessCosts.toString(),
      aggregatePreTaxProfit: result.aggregatePreTaxProfit.toString(),
      taxablePlanningProfit: result.taxablePlanningProfit.toString(),
      taxReserve: result.taxReserve.toString(),
      finalCashProfit: result.finalCashProfit.toString(),
      economicProfit: result.economicProfit?.toString(),
      productionHours: result.productionHours?.toString(),
      cashMargin: result.cashMargin?.toString(),
      breakEvenSales: result.breakEvenSales?.toString(),
      salesRemainingToBreakEven:
        result.salesRemainingToBreakEven?.toString(),
      breakEvenMonthlySales: result.breakEvenMonthlySales?.toString(),
    }).toEqual({
      salesQuantity: "100",
      projectedRevenue: "15000",
      projectedVariableCosts: "10000",
      averageContribution: "50",
      projectedContribution: "5000",
      fixedBusinessCosts: "1000",
      aggregatePreTaxProfit: "4000",
      taxablePlanningProfit: "4000",
      taxReserve: "800",
      finalCashProfit: "3200",
      economicProfit: "700",
      productionHours: "400",
      cashMargin: "21.33333333333333333333333333",
      breakEvenSales: "20",
      salesRemainingToBreakEven: "0",
      breakEvenMonthlySales: "1.666666666666666666666666667",
    });
  });

  it("preserves cash profit versus imputed economic profit", () => {
    const result = analyzeProfitability({
      calculatorInput: {
        ...turkeyToUsaEtsySaleInput,
        laborHourlyRateTry: "0",
      },
      economicHourlyRateTry: "250",
    });

    expect({
      cashProfit: result.cashProfit.toString(),
      economicLabourCostUsd: result.economicLabourCostUsd?.toString(),
      economicProfit: result.economicProfit?.toString(),
      cashMarginPercent: result.cashMarginPercent?.toString(),
      economicMarginPercent: result.economicMarginPercent?.toString(),
      cashProfitPerHour: result.cashProfitPerHour?.toString(),
      economicProfitPerHour: result.economicProfitPerHour?.toString(),
    }).toEqual({
      cashProfit: "52.13326217308101211992345318",
      economicLabourCostUsd: "21.26302360195619817137997023",
      economicProfit: "30.87023857112481394854348295",
      cashMarginPercent: "34.75550811538734141328230212",
      economicMarginPercent: "20.58015904741654263236232197",
      cashProfitPerHour: "13.0333155432702530299808633",
      economicProfitPerHour: "7.717559642781203487135870738",
    });
  });
});

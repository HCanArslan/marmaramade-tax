"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { AlertTriangle, ChevronDown, Info, RotateCcw } from "lucide-react";
import { calculate, solvePrice } from "@/lib/domain/calculator";
import {
  analyzeProfitability,
  defaultProfitabilityThresholds,
  type ProfitabilityThresholds,
} from "@/lib/domain/profitability";
import { ProfitabilitySimulator } from "@/components/profitability-simulator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { formatMoney, type CurrencyCode } from "@/lib/domain/money";
import {
  ANNUAL_BUSINESS_BUDGET_IDS,
  resolveAnnualPlanOverhead,
} from "@/lib/domain/overhead";
import type { CalculatorInput } from "@/lib/domain/types";
import {
  calculateAggregateTaxReserve,
  calculateSalesProjection,
} from "@/lib/domain/sales-plan";
import { tr } from "@/lib/i18n/tr";

type Tab = "quick" | "reverse" | "plan";

export interface CalculatorProductPreset {
  id: string;
  productId: string;
  sku: string;
  title: string;
  listingTitle: string;
  currency: string;
  originalPrice: string;
  discountedPrice: string;
  discountAmount: string;
  discountPercentage: string;
  discountSource: "ETSY" | "MANUAL" | "NONE";
  availableQuantity: number;
  state: string;
  materialCostTry: string;
  laborHours: string;
  laborHourlyRateTry: string;
  economicHourlyRateTry: string | null;
  economicHourlyRateSource: string;
  productionHoursSource: string;
  paidLaborRateSource: string;
  packagingCostTry: string;
  additionalDirectCostTry: string;
  internationalShippingUsd: string;
  shippingInsuranceUsd: string;
  customsDutyUsd: string;
  additionalTariffUsd: string;
  carrierProcessingFeeUsd: string;
  brokerageFeeUsd: string;
  customsClearanceFeeUsd: string;
  destinationFeesUsd: string;
  includeCustomsInSellerProfit: boolean;
  etgbCostUsd: string;
  includeEtgbInSellerProfit: boolean;
  etgbStatus: string;
}

interface CalculatorExchangeRate {
  rate: string;
  asOf: string;
  source: string;
  fallback: boolean;
}

interface PlanningSources {
  products: string;
  shipping: string;
  customs: string;
  overhead: string;
  fees: string;
  tax: string;
  reserves: string;
}

interface ExternalComparison {
  provider: string;
  marketplaceCommissionUsd: string;
  paymentCommissionUsd: string;
  otherCommissionUsd: string;
}

interface AnnualOverheadEvidence {
  annualTotalTry: string;
  usdTryRate: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    amount: string;
    currency: CurrencyCode;
    billingFrequency: string;
    vatRate: string;
    annualGrossNative: string;
    annualGrossTry: string;
    notes: string | null;
  }>;
}

export function CalculatorWorkspace({
  products,
  exchangeRate,
  planningDefaults,
  planningSources,
  externalComparison,
  annualOverheadEvidence,
  profitabilityThresholds = defaultProfitabilityThresholds,
  profitabilityTargetsSource,
}: {
  products: CalculatorProductPreset[];
  exchangeRate: CalculatorExchangeRate;
  planningDefaults: Partial<CalculatorInput>;
  planningSources: PlanningSources;
  externalComparison: ExternalComparison | null;
  annualOverheadEvidence: AnnualOverheadEvidence | null;
  profitabilityThresholds?: ProfitabilityThresholds;
  profitabilityTargetsSource: string;
}) {
  const [input, setInput] = useState<CalculatorInput>({
    ...defaultCalculatorInput,
    ...planningDefaults,
    usdTryRate: exchangeRate.rate,
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [planQuantities, setPlanQuantities] = useState<Record<string, string>>(
    {},
  );
  const [tab, setTab] = useState<Tab>("quick");
  const [targetProfit, setTargetProfit] = useState("50");
  const [targetMargin, setTargetMargin] = useState("30");
  const [projectedSalesQuantity, setProjectedSalesQuantity] = useState("30");
  const [projectionMixMode, setProjectionMixMode] = useState<
    "CURRENT_MIX" | "REPRESENTATIVE_PRODUCT"
  >("CURRENT_MIX");
  const [representativeProductId, setRepresentativeProductId] = useState("");
  const [projectionPeriod, setProjectionPeriod] = useState<
    "MONTHLY" | "ANNUAL"
  >("ANNUAL");
  const [projectionPriceOverride, setProjectionPriceOverride] = useState("");
  const [projectionShippingOverride, setProjectionShippingOverride] =
    useState("");
  const [projectionContributionOverride, setProjectionContributionOverride] =
    useState("");
  const [profitSort, setProfitSort] = useState<
    | "cashProfit"
    | "economicProfit"
    | "cashPerHour"
    | "economicPerHour"
    | "cashMargin"
    | "economicMargin"
  >("cashProfit");
  const calculationInput = input;
  const result = useMemo(() => calculate(calculationInput), [calculationInput]);
  const set = (key: keyof CalculatorInput, value: string | boolean) =>
    setInput((current) => ({ ...current, [key]: value }));
  const reverseProfit = useMemo(
    () =>
      solvePrice(calculationInput, {
        kind: "profitUsd",
        value: targetProfit || 0,
      }),
    [calculationInput, targetProfit],
  );
  const reverseMargin = useMemo(
    () =>
      solvePrice(calculationInput, {
        kind: "margin",
        value: targetMargin || 0,
      }),
    [calculationInput, targetMargin],
  );
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );
  const selectProduct = (id: string) => {
    setSelectedProductId(id);
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setInput((current) => ({
      ...current,
      ...(product.currency === "USD"
        ? {
            itemSubtotalUsd: product.originalPrice,
            sellerFundedDiscountUsd: product.discountAmount,
          }
        : {}),
      materialCostTry: product.materialCostTry,
      laborHours: product.laborHours,
      laborHourlyRateTry: product.laborHourlyRateTry,
      packagingCostTry: product.packagingCostTry,
      additionalDirectCostTry: product.additionalDirectCostTry,
      internationalShippingUsd: product.internationalShippingUsd,
      shippingInsuranceUsd: product.shippingInsuranceUsd,
      customsDutyUsd: product.customsDutyUsd,
      additionalTariffUsd: product.additionalTariffUsd,
      carrierProcessingFeeUsd: product.carrierProcessingFeeUsd,
      brokerageFeeUsd: product.brokerageFeeUsd,
      customsClearanceFeeUsd: product.customsClearanceFeeUsd,
      destinationFeesUsd: product.destinationFeesUsd,
      includeCustomsInSellerProfit: product.includeCustomsInSellerProfit,
      etgbCostUsd: product.etgbCostUsd,
      includeEtgbInSellerProfit: product.includeEtgbInSellerProfit,
    }));
  };
  const reset = () => {
    setInput({
      ...defaultCalculatorInput,
      ...planningDefaults,
      usdTryRate: exchangeRate.rate,
    });
    setSelectedProductId("");
  };
  const plannedUnitCount = useMemo(
    () =>
      products.reduce(
        (total, product) =>
          total +
          Math.max(0, Math.floor(Number(planQuantities[product.id] || 0))),
        0,
      ),
    [planQuantities, products],
  );
  const planOverhead = useMemo(() => {
    return resolveAnnualPlanOverhead(
      annualOverheadEvidence?.annualTotalTry ?? 0,
      plannedUnitCount,
    );
  }, [annualOverheadEvidence?.annualTotalTry, plannedUnitCount]);
  const annualPackagingBudgetIncluded = Boolean(
    annualOverheadEvidence?.items.some(
      (cost) =>
        cost.id === ANNUAL_BUSINESS_BUDGET_IDS.packaging &&
        new Decimal(cost.annualGrossTry).gt(0),
    ),
  );
  const planCalculationInput: CalculatorInput = useMemo(
    () => ({
      ...calculationInput,
      overheadAllocationMethod: planOverhead.allocationMethod,
      manualOverheadPerOrderTry: planOverhead.manualOverheadPerOrderTry,
      taxReserveRate: "0",
    }),
    [calculationInput, planOverhead],
  );
  const planRows = useMemo(
    () =>
      products.map((product) => {
        const quantity = Math.max(
          0,
          Math.floor(Number(planQuantities[product.id] || 0)),
        );
        const productInput: CalculatorInput | null =
          product.currency === "USD"
            ? {
                ...planCalculationInput,
                itemSubtotalUsd: product.originalPrice,
                sellerFundedDiscountUsd: product.discountAmount,
                materialCostTry: product.materialCostTry,
                laborHours: product.laborHours,
                laborHourlyRateTry: product.laborHourlyRateTry,
                packagingCostTry: annualPackagingBudgetIncluded
                  ? "0"
                  : product.packagingCostTry,
                additionalDirectCostTry: product.additionalDirectCostTry,
                internationalShippingUsd: product.internationalShippingUsd,
                shippingInsuranceUsd: product.shippingInsuranceUsd,
                customsDutyUsd: product.customsDutyUsd,
                additionalTariffUsd: product.additionalTariffUsd,
                carrierProcessingFeeUsd: product.carrierProcessingFeeUsd,
                brokerageFeeUsd: product.brokerageFeeUsd,
                customsClearanceFeeUsd: product.customsClearanceFeeUsd,
                destinationFeesUsd: product.destinationFeesUsd,
                includeCustomsInSellerProfit:
                  calculationInput.includeCustomsInSellerProfit,
                etgbCostUsd: product.etgbCostUsd,
                includeEtgbInSellerProfit: product.includeEtgbInSellerProfit,
              }
            : null;
        const scenarioA = productInput
          ? analyzeProfitability({
              calculatorInput: {
                ...productInput,
                includeCustomsInSellerProfit: false,
              },
              economicHourlyRateTry: product.economicHourlyRateTry,
              quantity,
              thresholds: profitabilityThresholds,
            })
          : null;
        const scenarioB = productInput
          ? analyzeProfitability({
              calculatorInput: {
                ...productInput,
                includeCustomsInSellerProfit: true,
              },
              economicHourlyRateTry: product.economicHourlyRateTry,
              quantity,
              thresholds: profitabilityThresholds,
            })
          : null;
        const customsSensitive = Boolean(
          scenarioA?.cashProfit.gt(0) && scenarioB?.cashProfit.lt(0),
        );
        const analysis = productInput
          ? analyzeProfitability({
              calculatorInput: productInput,
              economicHourlyRateTry: product.economicHourlyRateTry,
              quantity,
              thresholds: profitabilityThresholds,
              customsSensitive,
            })
          : null;
        const calculation = analysis?.calculation ?? null;
        const missing: string[] = [];
        const directCostTry = new Decimal(product.materialCostTry)
          .plus(product.packagingCostTry)
          .plus(product.additionalDirectCostTry)
          .plus(
            new Decimal(product.laborHours).mul(product.laborHourlyRateTry),
          );
        if (directCostTry.eq(0)) missing.push("product cost");
        if (
          new Decimal(product.internationalShippingUsd)
            .plus(product.shippingInsuranceUsd)
            .eq(0)
        )
          missing.push("international shipping");
        if (
          new Decimal(product.customsDutyUsd)
            .plus(product.additionalTariffUsd)
            .plus(product.carrierProcessingFeeUsd)
            .plus(product.brokerageFeeUsd)
            .plus(product.customsClearanceFeeUsd)
            .plus(product.destinationFeesUsd)
            .eq(0)
        )
          missing.push("customs / destination charges");
        if (!annualOverheadEvidence) missing.push("annual business costs");
        if (product.etgbStatus === "UNKNOWN_PENDING_CONFIRMATION")
          missing.push("ETGB cost status");
        if (new Decimal(calculationInput.taxReserveRate).eq(0))
          missing.push("tax reserve");
        if (!analysis?.productionHoursPerUnit) missing.push("production time");
        if (analysis?.economicLabourCostUsd === null)
          missing.push("economic labour rate");
        return {
          product,
          quantity,
          calculation,
          analysis,
          scenarioA,
          scenarioB,
          missing,
        };
      }),
    [
      calculationInput.taxReserveRate,
      calculationInput.includeCustomsInSellerProfit,
      planCalculationInput,
      annualOverheadEvidence,
      annualPackagingBudgetIncluded,
      planQuantities,
      products,
      profitabilityThresholds,
    ],
  );
  const planTotalsBeforeTax = useMemo(
    () =>
      planRows.reduce(
        (totals, row) => {
          if (!row.calculation || !row.analysis || row.quantity === 0)
            return totals;
          const quantity = new Decimal(row.quantity);
          return {
            units: totals.units + row.quantity,
            revenue: totals.revenue.plus(
              row.calculation.totals.grossRevenue.mul(quantity),
            ),
            fees: totals.fees.plus(
              row.calculation.totals.totalEtsyFees.mul(quantity),
            ),
            productCosts: totals.productCosts.plus(
              row.calculation.totals.directProductCostUsd.mul(quantity),
            ),
            materials: totals.materials.plus(
              row.calculation.totals.materialCostUsd.mul(quantity),
            ),
            labor: totals.labor.plus(
              row.calculation.totals.laborUsd.mul(quantity),
            ),
            packaging: totals.packaging.plus(
              row.calculation.totals.packagingCostUsd.mul(quantity),
            ),
            otherDirect: totals.otherDirect.plus(
              row.calculation.totals.additionalDirectCostUsd.mul(quantity),
            ),
            shipping: totals.shipping.plus(
              row.calculation.totals.internationalShippingUsd.mul(quantity),
            ),
            customs: totals.customs.plus(
              row.calculation.totals.customsAndTariffUsd.mul(quantity),
            ),
            customsExposure: totals.customsExposure.plus(
              row.calculation.totals.customsExposureUsd.mul(quantity),
            ),
            etgb: totals.etgb.plus(
              row.calculation.totals.etgbCostUsd.mul(quantity),
            ),
            etgbUnknown:
              totals.etgbUnknown +
              (row.product.etgbStatus === "UNKNOWN_PENDING_CONFIRMATION"
                ? 1
                : 0),
            overhead: totals.overhead.plus(
              row.calculation.totals.allocatedBusinessOverheadUsd.mul(quantity),
            ),
            totalCosts: totals.totalCosts.plus(
              row.calculation.totals.grossRevenue
                .minus(row.calculation.totals.estimatedPreTaxProfit)
                .mul(quantity),
            ),
            preTaxProfit: totals.preTaxProfit.plus(
              row.calculation.totals.estimatedPreTaxProfit.mul(quantity),
            ),
            economicProfit: row.analysis.economicProfit
              ? totals.economicProfit.plus(
                  row.analysis.economicProfit.mul(quantity),
                )
              : totals.economicProfit,
            economicMissing:
              totals.economicMissing + (row.analysis.economicProfit ? 0 : 1),
            productionHours: row.analysis.plannedProductionHours
              ? totals.productionHours.plus(row.analysis.plannedProductionHours)
              : totals.productionHours,
            hoursMissing:
              totals.hoursMissing +
              (row.analysis.plannedProductionHours ? 0 : 1),
            belowMinimum:
              totals.belowMinimum +
              (row.analysis.cashProfit.lt(
                profitabilityThresholds.minimumCashProfitUsd,
              )
                ? 1
                : 0),
            gradeA: totals.gradeA + (row.analysis.grade === "A" ? 1 : 0),
            gradeB: totals.gradeB + (row.analysis.grade === "B" ? 1 : 0),
            gradeC: totals.gradeC + (row.analysis.grade === "C" ? 1 : 0),
            gradeD: totals.gradeD + (row.analysis.grade === "D" ? 1 : 0),
            scenarioACash: totals.scenarioACash.plus(
              row.scenarioA!.cashProfit.mul(quantity),
            ),
            scenarioBCash: totals.scenarioBCash.plus(
              row.scenarioB!.cashProfit.mul(quantity),
            ),
            scenarioAEconomic: row.scenarioA!.economicProfit
              ? totals.scenarioAEconomic.plus(
                  row.scenarioA!.economicProfit.mul(quantity),
                )
              : totals.scenarioAEconomic,
            scenarioBEconomic: row.scenarioB!.economicProfit
              ? totals.scenarioBEconomic.plus(
                  row.scenarioB!.economicProfit.mul(quantity),
                )
              : totals.scenarioBEconomic,
            scenarioALosses:
              totals.scenarioALosses +
              (row.scenarioA!.cashProfit.lt(0) ? 1 : 0),
            scenarioBLosses:
              totals.scenarioBLosses +
              (row.scenarioB!.cashProfit.lt(0) ? 1 : 0),
            gradeChanges:
              totals.gradeChanges +
              (row.scenarioA!.grade !== row.scenarioB!.grade ? 1 : 0),
          };
        },
        {
          units: 0,
          revenue: new Decimal(0),
          fees: new Decimal(0),
          productCosts: new Decimal(0),
          materials: new Decimal(0),
          labor: new Decimal(0),
          packaging: new Decimal(0),
          otherDirect: new Decimal(0),
          shipping: new Decimal(0),
          customs: new Decimal(0),
          customsExposure: new Decimal(0),
          etgb: new Decimal(0),
          etgbUnknown: 0,
          overhead: new Decimal(0),
          totalCosts: new Decimal(0),
          preTaxProfit: new Decimal(0),
          economicProfit: new Decimal(0),
          economicMissing: 0,
          productionHours: new Decimal(0),
          hoursMissing: 0,
          belowMinimum: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          gradeD: 0,
          scenarioACash: new Decimal(0),
          scenarioBCash: new Decimal(0),
          scenarioAEconomic: new Decimal(0),
          scenarioBEconomic: new Decimal(0),
          scenarioALosses: 0,
          scenarioBLosses: 0,
          gradeChanges: 0,
        },
      ),
    [planRows, profitabilityThresholds.minimumCashProfitUsd],
  );
  const aggregateTax = useMemo(
    () =>
      calculateAggregateTaxReserve(
        planTotalsBeforeTax.preTaxProfit,
        calculationInput.taxReserveRate,
      ),
    [calculationInput.taxReserveRate, planTotalsBeforeTax.preTaxProfit],
  );
  const planTotals = useMemo(() => {
    const scenarioA = calculateAggregateTaxReserve(
      planTotalsBeforeTax.scenarioACash,
      calculationInput.taxReserveRate,
    );
    const scenarioB = calculateAggregateTaxReserve(
      planTotalsBeforeTax.scenarioBCash,
      calculationInput.taxReserveRate,
    );
    return {
      ...planTotalsBeforeTax,
      tax: aggregateTax.taxReserve,
      profit: aggregateTax.finalProfit,
      totalCosts: planTotalsBeforeTax.totalCosts.plus(aggregateTax.taxReserve),
      economicProfit: planTotalsBeforeTax.economicProfit.minus(
        aggregateTax.taxReserve,
      ),
      scenarioACash: scenarioA.finalProfit,
      scenarioBCash: scenarioB.finalProfit,
      scenarioAEconomic: planTotalsBeforeTax.scenarioAEconomic.minus(
        scenarioA.taxReserve,
      ),
      scenarioBEconomic: planTotalsBeforeTax.scenarioBEconomic.minus(
        scenarioB.taxReserve,
      ),
    };
  }, [aggregateTax, calculationInput.taxReserveRate, planTotalsBeforeTax]);
  const selectedPlanRows = planRows.filter((row) => row.quantity > 0);
  const selectedRepresentativeRow =
    selectedPlanRows.find(
      (row) => row.product.id === representativeProductId,
    ) ?? selectedPlanRows[0];
  const mixEconomics = useMemo(() => {
    if (planTotals.units <= 0) return null;
    const units = new Decimal(planTotals.units);
    const variableCosts = planTotalsBeforeTax.totalCosts.minus(
      planTotalsBeforeTax.overhead,
    );
    return {
      averageSellerRevenue: planTotalsBeforeTax.revenue.div(units),
      averageVariableCost: variableCosts.div(units),
      averageContribution: planTotalsBeforeTax.revenue
        .minus(variableCosts)
        .div(units),
      averageShipping: planTotalsBeforeTax.shipping.div(units),
      averageEtsyFees: planTotalsBeforeTax.fees.div(units),
      averageCustoms: planTotalsBeforeTax.customs.div(units),
      averageProductionHours:
        planTotalsBeforeTax.hoursMissing === 0
          ? planTotalsBeforeTax.productionHours.div(units)
          : null,
      averageEconomicLabourCost:
        planTotalsBeforeTax.economicMissing === 0
          ? planTotalsBeforeTax.preTaxProfit
              .minus(planTotalsBeforeTax.economicProfit)
              .div(units)
          : null,
    };
  }, [planTotals.units, planTotalsBeforeTax]);
  const representativeEconomics = (() => {
    const row = selectedRepresentativeRow;
    if (!row?.calculation || !row.analysis) return null;
    const totals = row.calculation.totals;
    const contribution = totals.estimatedPreTaxProfit.plus(
      totals.allocatedBusinessOverheadUsd,
    );
    return {
      averageSellerRevenue: totals.grossRevenue,
      averageVariableCost: totals.grossRevenue.minus(contribution),
      averageContribution: contribution,
      averageShipping: totals.internationalShippingUsd,
      averageEtsyFees: totals.totalEtsyFees,
      averageCustoms: totals.customsAndTariffUsd,
      averageProductionHours: row.analysis.productionHoursPerUnit,
      averageEconomicLabourCost: row.analysis.economicLabourCostUsd,
    };
  })();
  const projectionEconomics =
    projectionMixMode === "REPRESENTATIVE_PRODUCT"
      ? representativeEconomics
      : mixEconomics;
  const annualFixedBusinessCostsUsd = annualOverheadEvidence
    ? new Decimal(annualOverheadEvidence.annualTotalTry).div(
        annualOverheadEvidence.usdTryRate,
      )
    : new Decimal(0);
  const projectionFixedCosts =
    projectionPeriod === "MONTHLY"
      ? annualFixedBusinessCostsUsd.div(12)
      : annualFixedBusinessCostsUsd;
  const makeProjection = (quantity: string | number) => {
    if (!projectionEconomics) return null;
    const revenue = projectionPriceOverride
      ? new Decimal(projectionPriceOverride)
      : projectionEconomics.averageSellerRevenue;
    let variableCost = projectionEconomics.averageVariableCost;
    if (projectionShippingOverride) {
      variableCost = variableCost
        .minus(projectionEconomics.averageShipping)
        .plus(projectionShippingOverride);
    }
    if (projectionContributionOverride) {
      variableCost = revenue.minus(projectionContributionOverride);
    }
    return calculateSalesProjection({
      salesQuantity: quantity,
      averageSellerRevenue: revenue,
      averageVariableCost: variableCost,
      annualFixedBusinessCosts: projectionFixedCosts,
      taxReserveRate: calculationInput.taxReserveRate,
      averageProductionHours: projectionEconomics.averageProductionHours,
      averageEconomicLabourCost: projectionEconomics.averageEconomicLabourCost,
    });
  };
  const customProjection = makeProjection(projectedSalesQuantity);
  const quickProjectionQuantities = [12, 20, 30, 50, 100];
  const quickProjections = quickProjectionQuantities.map((quantity) => ({
    quantity,
    projection: makeProjection(quantity),
  }));
  const sortedPlanRows = [...planRows].sort((a, b) => {
    const value = (row: (typeof planRows)[number]) => {
      if (!row.analysis) return new Decimal("-1e30");
      switch (profitSort) {
        case "cashProfit":
          return row.analysis.cashProfit;
        case "economicProfit":
          return row.analysis.economicProfit ?? new Decimal("-1e30");
        case "cashPerHour":
          return row.analysis.cashProfitPerHour ?? new Decimal("-1e30");
        case "economicPerHour":
          return row.analysis.economicProfitPerHour ?? new Decimal("-1e30");
        case "cashMargin":
          return row.analysis.cashMarginPercent ?? new Decimal("-1e30");
        case "economicMargin":
          return row.analysis.economicMarginPercent ?? new Decimal("-1e30");
      }
    };
    return value(b).cmp(value(a));
  });
  const cashPlanMargin = planTotals.revenue.gt(0)
    ? planTotals.profit.div(planTotals.revenue).mul(100)
    : null;
  const allocatedOverheadPerOrderTry = planTotals.units
    ? planTotals.overhead.div(planTotals.units).mul(calculationInput.usdTryRate)
    : null;
  const missingPlanInputs = Array.from(
    new Set(selectedPlanRows.flatMap((row) => row.missing)),
  );
  const gradeChangeProducts = selectedPlanRows
    .filter(
      (row) =>
        row.scenarioA &&
        row.scenarioB &&
        row.scenarioA.grade !== row.scenarioB.grade,
    )
    .map(
      (row) =>
        `${row.product.sku} (${row.scenarioA!.grade} → ${row.scenarioB!.grade})`,
    );
  const otherPlanCosts = planTotals.totalCosts
    .minus(planTotals.fees)
    .minus(planTotals.productCosts)
    .minus(planTotals.shipping)
    .minus(planTotals.etgb)
    .minus(planTotals.customs)
    .minus(planTotals.overhead)
    .minus(planTotals.tax);
  const useAllAvailable = () =>
    setPlanQuantities(
      Object.fromEntries(
        products.map((product) => [
          product.id,
          String(product.availableQuantity),
        ]),
      ),
    );
  const clearPlan = () => setPlanQuantities({});

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Hesaplama alanı</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">
            Tüm giderleri görünür fiyat ve satış planlaması
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Etsy fiyatını ve kayıtlı maliyet sürümünü yüklemek için bir ürün
            seçin. Yıllık işletme giderleri yalnızca Satış Planında düşülür ve
            tek ürün hesabında tekrar sayılmaz.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm"
        >
          <RotateCcw size={15} /> Sıfırla
        </button>
      </header>
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border bg-white p-1">
        {(["quick", "reverse", "plan"] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === item ? "bg-[#18342e] text-white" : "text-stone-500 hover:bg-stone-50"}`}
          >
            {item === "quick"
              ? "Hızlı hesap"
              : item === "reverse"
                ? "Ters fiyatlama"
                : "Satış planı"}
          </button>
        ))}
      </div>
      {tab !== "plan" && (
        <section className="card p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)] lg:items-end">
            <label>
              <span className="mb-1.5 block text-xs font-medium text-stone-600">
                Ürün
              </span>
              <select
                className="field"
                value={selectedProductId}
                onChange={(event) => selectProduct(event.target.value)}
              >
                <option value="">Bir Etsy ürünü seçin…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.listingTitle}
                  </option>
                ))}
              </select>
            </label>
            {selectedProduct ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <strong>
                  {selectedProduct.currency}{" "}
                  {new Decimal(selectedProduct.discountedPrice).toFixed(2)}
                </strong>
                {new Decimal(selectedProduct.discountPercentage).gt(0)
                  ? ` after ${new Decimal(selectedProduct.discountPercentage).toDecimalPlaces(2).toString()}% ${selectedProduct.discountSource === "ETSY" ? "Etsy" : "local"} discount`
                  : " · no active discount"}
                <span className="mt-1 block text-emerald-800/70">
                  Etsy pricing and the latest local product cost are loaded.
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
                Select a product to prefill its Etsy price and discount.
              </div>
            )}
          </div>
          {selectedProduct && selectedProduct.currency !== "USD" && (
            <p className="mt-3 text-xs text-amber-700">
              <AlertTriangle className="mr-1 inline" size={14} />
              This calculator currently uses USD revenue, so the{" "}
              {selectedProduct.currency} Etsy price was not copied into the USD
              sale fields.
            </p>
          )}
        </section>
      )}
      {tab === "quick" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-5">
            <InputSection
              title="Sale & marketplace"
              hint="USD revenue and Etsy triggers"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Sale price"
                  value={input.itemSubtotalUsd}
                  suffix="USD"
                  onChange={(v) => set("itemSubtotalUsd", v)}
                />
                <NumberField
                  label="Shipping charged"
                  value={input.shippingChargedToBuyerUsd}
                  suffix="USD"
                  onChange={(v) => set("shippingChargedToBuyerUsd", v)}
                />
                <NumberField
                  label="Seller discount"
                  value={input.sellerFundedDiscountUsd}
                  suffix="USD"
                  onChange={(v) => set("sellerFundedDiscountUsd", v)}
                />
                <div>
                  <NumberField
                    label="USD / TRY rate"
                    value={input.usdTryRate}
                    suffix="TRY"
                    onChange={(v) => set("usdTryRate", v)}
                  />
                  <p
                    className={`mt-1.5 text-[11px] ${exchangeRate.fallback ? "text-amber-700" : "text-stone-400"}`}
                  >
                    {exchangeRate.source} · {exchangeRate.asOf} · refreshed
                    weekly
                  </p>
                </div>
                <Toggle
                  label="Currency conversion"
                  checked={input.currencyConversionRequired}
                  onChange={(v) => set("currencyConversionRequired", v)}
                />
                <Toggle
                  label="Offsite Ads (15%)"
                  checked={input.offsiteAdAttributed}
                  onChange={(v) => set("offsiteAdAttributed", v)}
                />
              </div>
            </InputSection>
            <InputSection
              title="Product costs"
              hint="Selected product costs; annual business spending is applied only in Sales Plan"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Materials"
                  value={input.materialCostTry}
                  suffix="TRY"
                  onChange={(v) => set("materialCostTry", v)}
                />
                <NumberField
                  label="Labor hours"
                  value={input.laborHours}
                  suffix="HRS"
                  onChange={(v) => set("laborHours", v)}
                />
                <NumberField
                  label="Labor hourly value"
                  value={input.laborHourlyRateTry}
                  suffix="TRY"
                  onChange={(v) => set("laborHourlyRateTry", v)}
                />
                <NumberField
                  label="Packaging"
                  value={input.packagingCostTry}
                  suffix="TRY"
                  onChange={(v) => set("packagingCostTry", v)}
                />
                <NumberField
                  label="Other direct cost"
                  value={input.additionalDirectCostTry}
                  suffix="TRY"
                  onChange={(v) => set("additionalDirectCostTry", v)}
                />
                <NumberField
                  label="Income-tax planning reserve"
                  value={input.taxReserveRate}
                  suffix="%"
                  onChange={(v) => set("taxReserveRate", v)}
                />
              </div>
              <p className="mt-3 flex gap-2 text-xs text-stone-500">
                <Info size={14} className="shrink-0" /> Labor is an economic
                planning value. The tax percentage is a reserve, not a filed or
                accountant-confirmed tax calculation.
              </p>
            </InputSection>
            <InputSection
              title="Shipping & DDP customs"
              hint="Latest saved quote or manual input"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="International shipping"
                  value={input.internationalShippingUsd}
                  suffix="USD"
                  onChange={(v) => set("internationalShippingUsd", v)}
                />
                <NumberField
                  label="Customs duty"
                  value={input.customsDutyUsd}
                  suffix="USD"
                  onChange={(v) => set("customsDutyUsd", v)}
                />
                <NumberField
                  label="Additional tariff"
                  value={input.additionalTariffUsd}
                  suffix="USD"
                  onChange={(v) => set("additionalTariffUsd", v)}
                />
                <NumberField
                  label="Carrier processing"
                  value={input.carrierProcessingFeeUsd}
                  suffix="USD"
                  onChange={(v) => set("carrierProcessingFeeUsd", v)}
                />
                <NumberField
                  label="Domestic transfer"
                  value={input.domesticTransferCostTry}
                  suffix="TRY"
                  onChange={(v) => set("domesticTransferCostTry", v)}
                />
                <NumberField
                  label="ETGB / export processing"
                  value={input.etgbCostUsd}
                  suffix="USD"
                  onChange={(v) => set("etgbCostUsd", v)}
                />
                <Toggle
                  label="Seller pays customs"
                  checked={input.includeCustomsInSellerProfit}
                  onChange={(v) => set("includeCustomsInSellerProfit", v)}
                />
                <Toggle
                  label="Deduct confirmed ETGB cost"
                  checked={input.includeEtgbInSellerProfit}
                  onChange={(v) => set("includeEtgbInSellerProfit", v)}
                />
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <span className="pill border-emerald-200 bg-white text-emerald-700">
                    Saved planning inputs
                  </span>
                  <p className="mt-2 text-xs leading-4 text-emerald-800">
                    Zero means no dated quote has been loaded yet.
                  </p>
                </div>
              </div>
              <p className="mt-3 flex gap-2 text-xs text-stone-500">
                <Info size={14} className="shrink-0" /> Carrier processing is a
                destination customs charge, not a ShipEntegra service.
              </p>
            </InputSection>
          </div>
          <ResultPanel
            result={result}
            externalComparison={externalComparison}
          />
        </div>
      )}
      {tab === "reverse" && (
        <ReverseView
          input={input}
          targetProfit={targetProfit}
          targetMargin={targetMargin}
          setTargetProfit={setTargetProfit}
          setTargetMargin={setTargetMargin}
          reverseProfit={reverseProfit}
          reverseMargin={reverseMargin}
        />
      )}
      {tab === "plan" && (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Mevcut planı sat</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Seçili ürünleri ve planlanan adetleri hesapla
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  Mevcut stok adedi ile yıllık beklenen satış adedi birbirinden
                  ayrıdır. Her ürün kendi fiyatını, maliyetini ve lojistik
                  kaydını kullanır.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={useAllAvailable}
                  className="rounded-xl bg-jade px-4 py-2.5 text-xs font-medium text-white"
                >
                  Tüm mevcut adetleri kullan
                </button>
                <button
                  onClick={clearPlan}
                  className="rounded-xl border bg-white px-4 py-2.5 text-xs font-medium"
                >
                  Temizle
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-4">
              <label className="text-xs text-stone-500">
                Gümrük senaryosu
                <select
                  className="field mt-1"
                  value={
                    calculationInput.includeCustomsInSellerProfit
                      ? "SELLER_PAID"
                      : "NOT_SELLER_PAID"
                  }
                  onChange={(event) =>
                    set(
                      "includeCustomsInSellerProfit",
                      event.target.value === "SELLER_PAID",
                    )
                  }
                >
                  <option value="NOT_SELLER_PAID">
                    Gümrük satıcı tarafından düşülmüyor
                  </option>
                  <option value="SELLER_PAID">
                    Gümrük satıcı tarafından ödeniyor
                  </option>
                </select>
              </label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950 md:col-span-2">
                <strong>Tam yıllık işletme gideri</strong>
                <br />
                Bu tutar aya, ürün sayısına veya beklenen satış adedine
                bölünmez. Plan sonucundan bir kez düşülür.
              </div>
              <div className="rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-600 md:col-span-2">
                Bu plana yüklenen yıllık toplam:{" "}
                {formatMoney(
                  annualOverheadEvidence?.annualTotalTry ?? 0,
                  "TRY",
                )}
                <br />
                Mükellef.co + ChatGPT Plus + paketleme bütçesi + Etsy Business.
                Ayrıntılar /business sayfasında düzenlenebilir.
              </div>
            </div>
          </section>
          {selectedPlanRows.length > 0 && missingPlanInputs.length > 0 && (
            <section
              id="data-gaps"
              className="scroll-mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-950"
            >
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <h3 className="font-semibold">
                    Zorunlu maliyetler eksik olduğu için sonuç geçicidir
                  </h3>
                  <p className="mt-1 leading-6">
                    Eksik veya sıfır görünen alanlar:{" "}
                    {missingPlanInputs.join(", ")}. Hızlı hesapta değer girin ya
                    da ilgili ürün, kargo, gümrük, işletme ve vergi planlama
                    kaydını kaydedin. Sıfır değer, doğrulanmış ücretsiz maliyet
                    sayılmaz.
                  </p>
                </div>
              </div>
            </section>
          )}
          <nav
            className="flex gap-2 overflow-x-auto rounded-xl border bg-white p-2 text-sm"
            aria-label="Satış planı bölümleri"
          >
            {[
              ["#plan-summary", "Özet"],
              ["#sales-projection", "Satış Projeksiyonu"],
              ["#product-profitability", "Ürün Bazında Kârlılık"],
              ["#deduction-details", "Gider Detayları"],
              ["#scenario-comparison", "Senaryo Karşılaştırması"],
              ["#data-gaps", "Veri Eksikleri"],
            ].map(([href, label]) => (
              <a
                className="shrink-0 rounded-lg px-3 py-2 hover:bg-stone-100"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>
          <section
            id="plan-summary"
            className="grid scroll-mt-4 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <PlanMetric
              label={tr.finance.plannedUnits}
              value={String(planTotals.units)}
            />
            <PlanMetric
              label="Yüklenen sabit işletme giderleri"
              value={formatMoney(planOverhead.totalPlanOverheadTry, "TRY")}
            />
            <PlanMetric
              label={tr.finance.sellerRevenue}
              value={formatMoney(planTotals.revenue, "USD")}
            />
            <PlanMetric
              label={tr.finance.contributionProfit}
              value={formatMoney(
                planTotals.preTaxProfit.plus(planTotals.overhead),
                "USD",
              )}
            />
            <PlanMetric
              label={tr.finance.cashProfit}
              value={formatMoney(planTotals.profit, "USD")}
            />
            <PlanMetric
              label={tr.finance.profitMargin}
              value={cashPlanMargin ? `${cashPlanMargin.toFixed(1)}%` : "N/A"}
            />
            <PlanMetric
              label="Ürün başına ortalama nakit kâr"
              value={
                planTotals.units
                  ? formatMoney(planTotals.profit.div(planTotals.units), "USD")
                  : "N/A"
              }
            />
            <PlanMetric
              label={tr.finance.breakEven}
              value={
                customProjection?.breakEvenSales?.toString() ?? "Uygulanamaz"
              }
            />
          </section>
          <section
            id="sales-projection"
            className="card scroll-mt-4 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Satış Adedi Projeksiyonu</p>
                <h3 className="mt-1 text-xl font-semibold">
                  Farklı satış adetlerinde sonuç
                </h3>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-stone-500">
                  Bu projeksiyon, gelecekteki satışların mevcut plandaki ürün
                  karması ve ortalama maliyet yapısına benzer olacağını
                  varsayar.
                </p>
              </div>
              {customProjection?.breakEvenSales && (
                <div className="rounded-xl bg-emerald-50 p-3 text-right">
                  <p className="text-xs text-emerald-700">
                    Başabaş satış adedi
                  </p>
                  <p className="text-xl font-semibold text-emerald-950">
                    {customProjection.breakEvenSales.toString()}
                  </p>
                </div>
              )}
            </div>
            {!projectionEconomics ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Projeksiyon için planda en az bir ürün ve bir adet seçin.
              </p>
            ) : (
              <>
                <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-3">
                  <label className="text-xs text-stone-500">
                    Ürün karması
                    <select
                      className="field mt-1"
                      value={projectionMixMode}
                      onChange={(event) =>
                        setProjectionMixMode(
                          event.target.value as typeof projectionMixMode,
                        )
                      }
                    >
                      <option value="CURRENT_MIX">Mevcut ürün karması</option>
                      <option value="REPRESENTATIVE_PRODUCT">
                        Temsilci ürün
                      </option>
                    </select>
                  </label>
                  {projectionMixMode === "REPRESENTATIVE_PRODUCT" && (
                    <label className="text-xs text-stone-500">
                      Temsilci ürün
                      <select
                        className="field mt-1"
                        value={
                          representativeProductId ||
                          selectedRepresentativeRow?.product.id ||
                          ""
                        }
                        onChange={(event) =>
                          setRepresentativeProductId(event.target.value)
                        }
                      >
                        {selectedPlanRows.map((row) => (
                          <option key={row.product.id} value={row.product.id}>
                            {row.product.sku} · {row.product.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="text-xs text-stone-500">
                    Planlama dönemi
                    <select
                      className="field mt-1"
                      value={projectionPeriod}
                      onChange={(event) =>
                        setProjectionPeriod(
                          event.target.value as typeof projectionPeriod,
                        )
                      }
                    >
                      <option value="ANNUAL">Yıllık</option>
                      <option value="MONTHLY">Aylık</option>
                    </select>
                  </label>
                  <NumberField
                    label="Özel satış adedi"
                    value={projectedSalesQuantity}
                    suffix="ADET"
                    onChange={setProjectedSalesQuantity}
                  />
                  <NumberField
                    label="Ortalama satış fiyatı (isteğe bağlı)"
                    value={projectionPriceOverride}
                    suffix="USD"
                    onChange={setProjectionPriceOverride}
                  />
                  <NumberField
                    label="Ortalama kargo (isteğe bağlı)"
                    value={projectionShippingOverride}
                    suffix="USD"
                    onChange={setProjectionShippingOverride}
                  />
                  <NumberField
                    label="Ürün başına katkı (isteğe bağlı)"
                    value={projectionContributionOverride}
                    suffix="USD"
                    onChange={setProjectionContributionOverride}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <PlanMetric
                    label="Satış başına satıcı geliri"
                    value={formatMoney(
                      projectionPriceOverride ||
                        projectionEconomics.averageSellerRevenue,
                      "USD",
                    )}
                  />
                  <PlanMetric
                    label="Satış başına değişken gider"
                    value={formatMoney(
                      projectionEconomics.averageVariableCost,
                      "USD",
                    )}
                  />
                  <PlanMetric
                    label="Ürün başına katkı"
                    value={formatMoney(
                      customProjection?.averageContribution ?? 0,
                      "USD",
                    )}
                  />
                  <PlanMetric
                    label="Sabit işletme giderleri"
                    value={formatMoney(projectionFixedCosts, "USD")}
                  />
                </div>
                {customProjection && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <PlanMetric
                      label="Öngörülen satıcı geliri"
                      value={formatMoney(
                        customProjection.projectedRevenue,
                        "USD",
                      )}
                    />
                    <PlanMetric
                      label="Vergi öncesi sonuç"
                      value={formatMoney(
                        customProjection.aggregatePreTaxProfit,
                        "USD",
                      )}
                    />
                    <PlanMetric
                      label="Vergi planlama rezervi"
                      value={formatMoney(customProjection.taxReserve, "USD")}
                    />
                    <PlanMetric
                      label="Nakit kâr"
                      value={formatMoney(
                        customProjection.finalCashProfit,
                        "USD",
                      )}
                    />
                    <PlanMetric
                      label="Durum"
                      value={projectionStatus(
                        customProjection.finalCashProfit,
                        customProjection.economicProfit,
                      )}
                    />
                  </div>
                )}
                <div className="mt-5 overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[1050px] text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500">
                      <tr>
                        <th className="p-3">Satış adedi</th>
                        <th className="p-3">Satıcı geliri</th>
                        <th className="p-3">Katkı kârı</th>
                        <th className="p-3">Sabit gider</th>
                        <th className="p-3">Vergi öncesi</th>
                        <th className="p-3">Vergi rezervi</th>
                        <th className="p-3">Nakit kâr</th>
                        <th className="p-3">Ekonomik kâr</th>
                        <th className="p-3">Nakit marjı</th>
                        <th className="p-3">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quickProjections.map(({ quantity, projection }) =>
                        projection ? (
                          <tr
                            className="cursor-pointer border-t hover:bg-stone-50"
                            key={quantity}
                            onClick={() =>
                              setProjectedSalesQuantity(String(quantity))
                            }
                          >
                            <td className="p-3 font-semibold">{quantity}</td>
                            <td className="p-3">
                              {formatMoney(projection.projectedRevenue, "USD")}
                            </td>
                            <td className="p-3">
                              {formatMoney(
                                projection.projectedContribution,
                                "USD",
                              )}
                            </td>
                            <td className="p-3">
                              {formatMoney(
                                projection.fixedBusinessCosts,
                                "USD",
                              )}
                            </td>
                            <td className="p-3">
                              {formatMoney(
                                projection.aggregatePreTaxProfit,
                                "USD",
                              )}
                            </td>
                            <td className="p-3">
                              {formatMoney(projection.taxReserve, "USD")}
                            </td>
                            <td className="p-3 font-semibold">
                              {formatMoney(projection.finalCashProfit, "USD")}
                            </td>
                            <td className="p-3">
                              {projection.economicProfit
                                ? formatMoney(projection.economicProfit, "USD")
                                : "Yapılandırılmamış"}
                            </td>
                            <td className="p-3">
                              {projection.cashMargin
                                ? `${projection.cashMargin.toFixed(1)}%`
                                : "Uygulanamaz"}
                            </td>
                            <td className="p-3">
                              {projectionStatus(
                                projection.finalCashProfit,
                                projection.economicProfit,
                              )}
                            </td>
                          </tr>
                        ) : null,
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
          {selectedPlanRows.length > 0 && (
            <details
              id="scenario-comparison"
              className="card scroll-mt-4 overflow-hidden"
            >
              <summary className="cursor-pointer border-b p-5 font-semibold">
                Senaryo Karşılaştırması
              </summary>
              <div className="grid gap-3 p-3 md:grid-cols-2">
                <div className="card p-5">
                  <p className="eyebrow">
                    Senaryo A · gümrük satıcıya ait değil
                  </p>
                  <h3 className="mt-2 font-semibold">
                    Satıcı lojistiği{" "}
                    {formatMoney(
                      planTotals.shipping.plus(planTotals.etgb),
                      "USD",
                    )}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    {formatMoney(planTotals.customsExposure, "USD")} tutarındaki
                    gümrük riski görünür, ancak düşülmez.
                  </p>
                  <ScenarioMetrics
                    cash={planTotals.scenarioACash}
                    economic={planTotals.scenarioAEconomic}
                    economicMissing={planTotals.economicMissing > 0}
                    customsDeducted={new Decimal(0)}
                    revenue={planTotals.revenue}
                    losses={planTotals.scenarioALosses}
                    gradeChanges={planTotals.gradeChanges}
                    difference={planTotals.scenarioACash.minus(
                      planTotals.scenarioBCash,
                    )}
                  />
                </div>
                <div className="card p-5">
                  <p className="eyebrow">Senaryo B · gümrük satıcıya ait</p>
                  <h3 className="mt-2 font-semibold">
                    Satıcı lojistiği{" "}
                    {formatMoney(
                      planTotals.shipping
                        .plus(planTotals.etgb)
                        .plus(planTotals.customsExposure),
                      "USD",
                    )}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Yalnızca karşılaştırmadır; DDP veya yasal sorumluluk
                    hakkında varsayım oluşturmaz.
                  </p>
                  <ScenarioMetrics
                    cash={planTotals.scenarioBCash}
                    economic={planTotals.scenarioBEconomic}
                    economicMissing={planTotals.economicMissing > 0}
                    customsDeducted={planTotals.customsExposure}
                    revenue={planTotals.revenue}
                    losses={planTotals.scenarioBLosses}
                    gradeChanges={planTotals.gradeChanges}
                    difference={planTotals.scenarioBCash.minus(
                      planTotals.scenarioACash,
                    )}
                  />
                </div>
              </div>
            </details>
          )}
          {gradeChangeProducts.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Satıcı tarafından ödenen gümrük düşüldüğünde kârlılık notu değişen
              ürünler: {gradeChangeProducts.join(", ")}.
            </p>
          )}
          {selectedPlanRows.length > 0 && (
            <details
              id="deduction-details"
              className="card scroll-mt-4 overflow-hidden"
            >
              <summary className="cursor-pointer border-b p-5 font-semibold">
                Gider dökümü ve veri kaynakları
              </summary>
              <div className="grid gap-px bg-stone-200 sm:grid-cols-2 xl:grid-cols-4">
                <Deduction
                  label="Malzemeler"
                  value={planTotals.materials}
                  description="Yarn, lining, handles and itemized material components."
                  source={planningSources.products}
                  href="/products"
                />
                <Deduction
                  label="Emek"
                  value={planTotals.labor}
                  description="Saved labour hours multiplied by the planning hourly rate."
                  source={planningSources.products}
                  href="/products"
                />
                <Deduction
                  label="Paketleme"
                  value={planTotals.packaging}
                  displayValue={
                    annualPackagingBudgetIncluded
                      ? "$0.00 · Included in annual budget"
                      : undefined
                  }
                  missingOverride={
                    annualPackagingBudgetIncluded ? false : undefined
                  }
                  description={
                    annualPackagingBudgetIncluded
                      ? "The annual packaging-supplies budget is deducted under Business overhead, so product packaging is not repeated here."
                      : "Per-product packaging recorded in the latest cost version."
                  }
                  source={planningSources.products}
                  href="/products"
                />
                <Deduction
                  label="Diğer doğrudan ürün giderleri"
                  value={planTotals.otherDirect}
                  description="Maker payment, equipment allocation and other direct product costs."
                  source={planningSources.products}
                  href="/products"
                />
                <Deduction
                  label="Uluslararası kargo"
                  value={planTotals.shipping}
                  description="International transport only; customs, ETGB, insurance and marketplace fees remain separate."
                  source={planningSources.shipping}
                  href="/shipping"
                />
                <Deduction
                  label="ETGB / export processing"
                  value={planTotals.etgb}
                  displayValue={
                    planTotals.etgbUnknown > 0
                      ? `${formatMoney(planTotals.etgb, "USD")} · ${planTotals.etgbUnknown} product(s) not configured`
                      : planTotals.etgb.eq(0)
                        ? "$0.00 · Confirmed included/free"
                        : undefined
                  }
                  missingOverride={planTotals.etgbUnknown > 0}
                  description="Deducted only when a separate ETGB charge is confirmed or manually enabled. Unknown never means zero."
                  source="Latest effective ETGB cost record"
                  href="/customs-etgb"
                />
                <Deduction
                  label="Gümrük + varış giderleri"
                  value={planTotals.customs}
                  description="Destination-specific duty, tariff, brokerage, clearance and carrier processing."
                  source={planningSources.customs}
                  href="/customs"
                />
                <Deduction
                  label="Business overhead"
                  value={planTotals.overhead}
                  missingOverride={!annualOverheadEvidence}
                  description="All active recurring business costs annualized and deducted exactly once across the complete sell-all plan."
                  source={planningSources.overhead}
                  href="/business"
                  details={
                    annualOverheadEvidence ? (
                      <div className="mt-3 rounded-lg bg-stone-50 p-3 text-[11px] leading-5 text-stone-600">
                        <p className="font-semibold text-stone-800">
                          Annual recurring-cost breakdown
                        </p>
                        {annualOverheadEvidence.items.map((cost) => (
                          <div
                            className="mt-1 border-t border-stone-200 pt-1 first:border-0"
                            key={cost.id}
                          >
                            <p className="flex justify-between gap-3">
                              <span>{cost.name}</span>
                              <span>
                                {formatMoney(cost.annualGrossTry, "TRY")}
                              </span>
                            </p>
                            <p className="text-stone-500">
                              {formatMoney(cost.amount, cost.currency)} /{" "}
                              {cost.billingFrequency.toLowerCase()} · VAT{" "}
                              {new Decimal(cost.vatRate).toString()}%
                            </p>
                            {cost.notes && <p>Notes: {cost.notes}</p>}
                          </div>
                        ))}
                        <p className="mt-1 flex justify-between gap-3 border-t pt-1 font-semibold">
                          <span>Yıllık toplam</span>
                          <span>
                            {formatMoney(
                              annualOverheadEvidence.annualTotalTry,
                              "TRY",
                            )}
                          </span>
                        </p>
                        <p>USD/TRY rate: {annualOverheadEvidence.usdTryRate}</p>
                        <p>
                          Allocated per planned unit:{" "}
                          {allocatedOverheadPerOrderTry
                            ? formatMoney(allocatedOverheadPerOrderTry, "TRY")
                            : "N/A"}
                        </p>
                        <p>
                          One-year plan: {planTotals.units} units · deducted{" "}
                          {formatMoney(planTotals.overhead, "USD")}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-red-600">
                        No active annual recurring business costs are
                        configured. Sales Plan deducts zero; it never invents a
                        fallback.
                      </p>
                    )
                  }
                />
                <Deduction
                  label="Etsy ücretleri + ücret KDV'si"
                  value={planTotals.fees}
                  description="Listing, transaction, payment processing, regulatory, conversion and applicable fee VAT."
                  source={planningSources.fees}
                  href="/fees"
                />
                <Deduction
                  label="Vergi planlama rezervi"
                  value={planTotals.tax}
                  displayValue={
                    planTotals.preTaxProfit.lte(0)
                      ? "$0.00 · No reserve because aggregate pre-tax planning profit is not positive."
                      : undefined
                  }
                  missingOverride={false}
                  description={
                    planTotals.preTaxProfit.gt(0)
                      ? `${new Decimal(calculationInput.taxReserveRate).toString()}% reserve on positive aggregate pre-tax planning profit.`
                      : "The aggregate result after every non-tax deduction is zero or negative."
                  }
                  source={planningSources.tax}
                  href="/business"
                />
                <Deduction
                  label="Diğer lojistik + rezervler"
                  value={otherPlanCosts}
                  description="Domestic transfer, pickup, returns, damage, exchange-loss and other operating assumptions."
                  source={planningSources.reserves}
                  href="/calculator"
                />
                <Deduction
                  label="Toplam vergi öncesi sonuç"
                  value={planTotals.preTaxProfit}
                />
                <Deduction label="Tüm giderler" value={planTotals.totalCosts} />
                <Deduction
                  label="Nihai geçici sonuç"
                  value={planTotals.profit}
                  description="Aggregate pre-tax result minus the aggregate tax planning reserve."
                />
              </div>
            </details>
          )}
          <details
            id="product-profitability"
            className="card scroll-mt-4 overflow-hidden"
          >
            <summary className="cursor-pointer border-b p-5 font-semibold">
              Ürün Bazında Kârlılık
            </summary>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h3 className="font-semibold">Ürün Bazında Kârlılık</h3>
                <p className="mt-1 text-xs text-stone-500">
                  Ürün satırları vergi öncesi sonucu gösterir; vergi rezervi
                  yalnızca toplam plan sonucuna bir kez uygulanır.
                </p>
              </div>
              <label className="text-xs text-stone-500">
                Sırala
                <select
                  className="field mt-1 py-2"
                  value={profitSort}
                  onChange={(event) =>
                    setProfitSort(event.target.value as typeof profitSort)
                  }
                >
                  <option value="cashProfit">Vergi öncesi sonuç / adet</option>
                  <option value="economicProfit">Ekonomik sonuç / adet</option>
                  <option value="cashPerHour">Vergi öncesi sonuç / saat</option>
                  <option value="economicPerHour">Ekonomik sonuç / saat</option>
                  <option value="cashMargin">Vergi öncesi marj</option>
                  <option value="economicMargin">Ekonomik marj</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-400">
                  <tr>
                    <th className="px-5 py-3">Ürün</th>
                    <th>Durum / mevcut</th>
                    <th>Planlanan adet</th>
                    <th>Müşteri satış fiyatı</th>
                    <th>Vergi öncesi / ekonomik sonuç</th>
                    <th>Marjlar</th>
                    <th>Üretim verimliliği</th>
                    <th>Not / riskler</th>
                    <th>Planlanan vergi öncesi sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanRows.map(
                    ({ product, quantity, calculation, analysis, missing }) => (
                      <tr className="border-t" key={product.id}>
                        <td className="px-5 py-4">
                          <strong className="block">{product.sku}</strong>
                          <span className="mt-1 block max-w-md text-xs text-stone-500">
                            {product.listingTitle}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${product.state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"}`}
                          >
                            {product.state}
                          </span>
                          <span className="ml-2 text-xs text-stone-500">
                            {product.availableQuantity}
                          </span>
                        </td>
                        <td>
                          <input
                            aria-label={`Planned quantity for ${product.sku}`}
                            className="field w-28"
                            type="number"
                            min="0"
                            step="1"
                            value={planQuantities[product.id] || ""}
                            placeholder="0"
                            onChange={(event) =>
                              setPlanQuantities((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          {product.currency}{" "}
                          {new Decimal(product.discountedPrice).toFixed(2)}
                        </td>
                        <td>
                          {analysis ? (
                            <>
                              <strong>
                                {formatMoney(analysis.cashProfitPerUnit, "USD")}{" "}
                                vergi öncesi
                              </strong>
                              <span className="block text-xs text-stone-500">
                                {analysis.economicProfitPerUnit
                                  ? `${formatMoney(analysis.economicProfitPerUnit, "USD")} ekonomik`
                                  : "Ekonomik emek maliyeti yapılandırılmamış"}
                              </span>
                            </>
                          ) : (
                            "USD only"
                          )}
                          {calculation && (
                            <span className="mt-1 block max-w-52 text-[11px] leading-4 text-stone-500">
                              Materials{" "}
                              {formatMoney(
                                calculation.totals.materialCostUsd,
                                "USD",
                              )}{" "}
                              · Labour{" "}
                              {formatMoney(calculation.totals.laborUsd, "USD")}{" "}
                              · Packaging/other{" "}
                              {formatMoney(
                                calculation.totals.packagingCostUsd.plus(
                                  calculation.totals.additionalDirectCostUsd,
                                ),
                                "USD",
                              )}
                            </span>
                          )}
                          {quantity > 0 && missing.length > 0 && (
                            <span className="mt-1 block max-w-48 text-[11px] leading-4 text-red-700">
                              Missing: {missing.join(", ")}
                            </span>
                          )}
                        </td>
                        <td>
                          {analysis ? (
                            <>
                              <span>
                                {analysis.cashMarginPercent
                                  ? `${analysis.cashMarginPercent.toFixed(1)}% cash`
                                  : "N/A"}
                              </span>
                              <span className="block text-xs text-stone-500">
                                {analysis.economicMarginPercent
                                  ? `${analysis.economicMarginPercent.toFixed(1)}% economic`
                                  : "Not configured"}
                              </span>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          {analysis ? (
                            <>
                              <span>
                                {analysis.productionHoursPerUnit
                                  ? `${analysis.productionHoursPerUnit.toFixed(2)} h/unit`
                                  : "Production time not configured."}
                              </span>
                              <span className="block text-xs text-stone-500">
                                {analysis.cashProfitPerHour
                                  ? `${formatMoney(analysis.cashProfitPerHour, "USD")}/h cash`
                                  : "N/A"}{" "}
                                ·{" "}
                                {analysis.economicProfitPerHour
                                  ? `${formatMoney(analysis.economicProfitPerHour, "USD")}/h economic`
                                  : "not configured"}
                              </span>
                              <span className="block text-[11px] text-stone-400">
                                Planned:{" "}
                                {analysis.plannedProductionHours?.toFixed(2) ??
                                  "N/A"}{" "}
                                hours
                              </span>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          {analysis ? (
                            <>
                              <span className="pill border-jade/30 bg-jade/5 text-jade">
                                Grade {analysis.grade}
                              </span>
                              <div className="mt-1 flex max-w-56 flex-wrap gap-1">
                                {analysis.riskFlags.map((flag) => (
                                  <span
                                    className="pill border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-900"
                                    key={flag}
                                  >
                                    {flag.replaceAll("_", " ")}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="font-semibold">
                          {calculation
                            ? formatMoney(
                                calculation.totals.estimatedAfterReserveProfit.mul(
                                  quantity,
                                ),
                                "USD",
                              )
                            : "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </details>
          <details className="card overflow-hidden">
            <summary className="cursor-pointer border-b p-5 font-semibold">
              Kârlılık duyarlılık analizi
            </summary>
            <div className="p-3">
              <ProfitabilitySimulator
                products={products
                  .filter((product) => product.currency === "USD")
                  .map((product) => ({
                    ...product,
                    packagingCostTry: annualPackagingBudgetIncluded
                      ? "0"
                      : product.packagingCostTry,
                  }))}
                baseInput={planCalculationInput}
                thresholds={profitabilityThresholds}
                targetsSource={profitabilityTargetsSource}
                overheadContextLabel={`Vergi öncesi analiz · ${plannedUnitCount} planlanan adet`}
                showOverheadSensitivity={false}
              />
            </div>
          </details>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <AlertTriangle className="mr-1.5 inline" size={14} />
            This is a planning scenario, not a filed tax calculation. Each row
            uses its own saved product cost. Active recurring business costs are
            annualized and deducted once; tax reserve, shipping, and customs use
            the current Quick calculator values. ETGB is an export process, not
            automatically a separate fee; any carrier or declaration charge must
            be included in the saved shipping quote.
          </div>
        </div>
      )}
    </div>
  );
}

function InputSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-stone-400">{hint}</span>
      </div>
      {children}
    </section>
  );
}

function projectionStatus(
  finalCashProfit: Decimal,
  economicProfit: Decimal | null,
) {
  if (economicProfit === null) return "İşçilik verisi eksik";
  if (finalCashProfit.gt(0) && economicProfit.lt(0)) return "Ekonomik zarar";
  if (finalCashProfit.gt(0)) return "Kârlı";
  if (finalCashProfit.eq(0)) return "Başabaş";
  return "Zarar";
}
function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ScenarioMetrics({
  cash,
  economic,
  economicMissing,
  customsDeducted,
  revenue,
  losses,
  gradeChanges,
  difference,
}: {
  cash: Decimal;
  economic: Decimal;
  economicMissing: boolean;
  customsDeducted: Decimal;
  revenue: Decimal;
  losses: number;
  gradeChanges: number;
  difference: Decimal;
}) {
  const cashMargin = revenue.gt(0) ? cash.div(revenue).mul(100) : null;
  const economicMargin =
    revenue.gt(0) && !economicMissing ? economic.div(revenue).mul(100) : null;
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <div>
        <dt className="text-stone-400">Nakit kâr</dt>
        <dd className="font-semibold">{formatMoney(cash, "USD")}</dd>
      </div>
      <div>
        <dt className="text-stone-400">Ekonomik kâr</dt>
        <dd className="font-semibold">
          {economicMissing ? "Not configured" : formatMoney(economic, "USD")}
        </dd>
      </div>
      <div>
        <dt className="text-stone-400">Düşülen gümrük</dt>
        <dd className="font-semibold">
          {customsDeducted.eq(0)
            ? "Not deducted"
            : formatMoney(customsDeducted, "USD")}
        </dd>
      </div>
      <div>
        <dt className="text-stone-400">Marjlar</dt>
        <dd>
          {cashMargin ? `${cashMargin.toFixed(1)}%` : "N/A"} cash ·{" "}
          {economicMargin ? `${economicMargin.toFixed(1)}%` : "N/A"} economic
        </dd>
      </div>
      <div>
        <dt className="text-stone-400">Fark</dt>
        <dd>{formatMoney(difference, "USD")}</dd>
      </div>
      <div>
        <dt className="text-stone-400">Zarar eden ürünler</dt>
        <dd>{losses}</dd>
      </div>
      <div>
        <dt className="text-stone-400">Notu değişen ürünler</dt>
        <dd>{gradeChanges}</dd>
      </div>
    </dl>
  );
}

function Deduction({
  label,
  value,
  displayValue,
  missingOverride,
  description,
  source,
  href,
  details,
}: {
  label: string;
  value: Decimal;
  displayValue?: string;
  missingOverride?: boolean;
  description?: string;
  source?: string;
  href?: string;
  details?: ReactNode;
}) {
  const missing = missingOverride ?? value.eq(0);
  return (
    <div className="bg-white p-5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-2 font-semibold ${missing ? "text-red-700" : ""}`}>
        {displayValue ?? formatMoney(value, "USD")}
      </p>
      {missing && (
        <p className="mt-1 text-[11px] text-red-600">Yapılandırılmamış</p>
      )}
      {description && (
        <p className="mt-2 text-[11px] leading-4 text-stone-500">
          {description}
        </p>
      )}
      {source && (
        <p className="mt-2 text-[11px] leading-4 text-stone-600">
          <span className="font-medium">Kaynak:</span> {source}
        </p>
      )}
      {details}
      {href && (
        <Link
          className="mt-2 inline-block text-[11px] font-medium text-jade underline"
          href={href}
        >
          Open source page →
        </Link>
      )}
    </div>
  );
}
function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: Decimal.Value;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone-600">
        {label}
      </span>
      <div className="relative">
        <input
          className="field pr-14"
          type="number"
          min="0"
          step="0.01"
          value={String(value)}
          onChange={(e) => onChange(e.target.value || "0")}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border bg-stone-50/50 px-3 py-2.5 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-jade"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ResultPanel({
  result,
  externalComparison,
}: {
  result: ReturnType<typeof calculate>;
  externalComparison: ExternalComparison | null;
}) {
  const t = result.totals;
  const lineUsd = (name: string) =>
    new Decimal(result.lines.find((line) => line.name === name)?.usd ?? 0);
  const marketplaceCommission = lineUsd("Transaction fee");
  const paymentCommission = lineUsd("Payment processing percentage").plus(
    lineUsd("Payment processing fixed"),
  );
  const otherMarketplaceFees = lineUsd("Listing fee")
    .plus(lineUsd("Regulatory operating fee"))
    .plus(lineUsd("Currency conversion fee"));
  return (
    <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
      <div className="overflow-hidden rounded-2xl bg-[#18342e] text-white shadow-soft">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-medium text-white/50">
            Estimated profit after saved costs and reserve
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {formatMoney(t.estimatedAfterReserveProfit, "USD")}
          </p>
          <p className="mt-2 text-sm text-[#dbe8b6]">
            {formatMoney(t.estimatedAfterReserveProfitTry, "TRY")} ·{" "}
            {t.afterReserveMargin.toFixed(1)}% margin
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/10">
          <ResultStat
            label="Seller revenue"
            value={formatMoney(t.grossRevenue, "USD")}
          />
          <ResultStat
            label="Etsy fees + VAT"
            value={formatMoney(t.totalEtsyFees, "USD")}
          />
          <ResultStat
            label="Shipping + customs"
            value={formatMoney(
              t.internationalShippingUsd.plus(t.customsAndTariffUsd),
              "USD",
            )}
          />
          <ResultStat
            label="Profit · TRY"
            value={formatMoney(t.estimatedAfterReserveProfitTry, "TRY")}
          />
        </div>
      </div>
      <div className="card p-5">
        <p className="eyebrow">Profit layers</p>
        <div className="mt-3">
          <Waterfall
            label="Gross seller revenue"
            value={t.grossRevenue}
            positive
          />
          <Waterfall label="Etsy base fees" value={t.etsyBaseFees} />
          <Waterfall label="Seller-fee VAT" value={t.etsyFeeVatUsd} />
          <Waterfall
            label="International shipping"
            value={t.internationalShippingUsd}
          />
          <Waterfall label="Customs & tariffs" value={t.customsAndTariffUsd} />
          <Layer
            label="1. Revenue after Etsy fees"
            value={t.revenueAfterEtsyFees}
          />
          <Layer
            label="2. Before international logistics"
            value={t.contributionBeforeInternationalLogistics}
          />
          <Layer
            label="3. After shipping"
            value={t.contributionAfterShipping}
          />
          <Layer
            label="4. After optional seller-paid customs"
            value={t.contributionAfterOptionalCustoms}
          />
          <Layer
            label="5. Before monthly overhead"
            value={t.profitBeforeMonthlyOverhead}
          />
          <Layer
            label="6. After allocated overhead"
            value={t.operatingProfit}
          />
          <Layer
            label="7. After tax and risk reserves"
            value={t.estimatedAfterReserveProfit}
          />
          <div className="mt-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            8. Actual reconciled cash profit: not available until actual
            shipping, customs, ETGB and adjustments are recorded.
          </div>
        </div>
      </div>
      {externalComparison && (
        <div className="card p-5">
          <p className="eyebrow">External calculator comparison</p>
          <h3 className="mt-1 font-semibold">
            MarmaraMade vs {externalComparison.provider}
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <Compare
              label="Transparent MarmaraMade Etsy fees"
              ours={t.totalEtsyFees}
              external={new Decimal(externalComparison.marketplaceCommissionUsd)
                .plus(externalComparison.paymentCommissionUsd)
                .plus(externalComparison.otherCommissionUsd)}
            />
            <Compare
              label="Marketplace commission comparison"
              ours={marketplaceCommission}
              external={
                new Decimal(externalComparison.marketplaceCommissionUsd)
              }
            />
            <Compare
              label="Payment commission comparison"
              ours={paymentCommission}
              external={new Decimal(externalComparison.paymentCommissionUsd)}
            />
            <Compare
              label="Other fee comparison"
              ours={otherMarketplaceFees}
              external={new Decimal(externalComparison.otherCommissionUsd)}
            />
          </div>
          <p className="mt-3 text-[11px] leading-4 text-amber-700">
            Comparison only. External values never replace MarmaraMade fee
            rules.
          </p>
        </div>
      )}
      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <div>
            <p className="font-semibold">Calculation inspector</p>
            <p className="mt-1 text-xs text-stone-400">
              {result.lines.length} auditable lines
            </p>
          </div>
          <ChevronDown className="transition group-open:rotate-180" size={17} />
        </summary>
        <div className="max-h-[420px] overflow-auto border-t px-5 pb-3">
          {result.lines.map((line, i) => (
            <div
              key={`${line.name}-${i}`}
              className="border-b py-3 last:border-0"
            >
              <div className="flex justify-between gap-3 text-sm">
                <span>{line.name}</span>
                <strong>
                  {line.nativeCurrency === "USD" ? "$" : "₺"}
                  {new Decimal(line.nativeAmount).toFixed(2)}
                </strong>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-stone-400">
                {line.formula}
                {line.base ? ` · Base ${line.base}` : ""}
                {line.rate ? ` · Rate ${line.rate}%` : ""} · @{" "}
                {result.assumptions[0].replace("USD/TRY snapshot: ", "")}
              </p>
            </div>
          ))}
        </div>
      </details>
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-semibold text-sky-900">Assumptions used</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-sky-800/80">
          {result.assumptions.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#18342e] p-4">
      <p className="text-[10px] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function Waterfall({
  label,
  value,
  positive,
}: {
  label: string;
  value: Decimal;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center border-b py-2.5 text-sm last:border-0">
      <span
        className={`mr-2 h-1.5 w-1.5 rounded-full ${positive ? "bg-jade" : "bg-coral"}`}
      />
      <span className="flex-1 text-stone-600">{label}</span>
      <span className="font-medium">
        {positive ? "" : "−"}${value.toFixed(2)}
      </span>
    </div>
  );
}

function Layer({ label, value }: { label: string; value: Decimal }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 text-sm">
      <span className="text-stone-600">{label}</span>
      <strong>{formatMoney(value, "USD")}</strong>
    </div>
  );
}

function Compare({
  label,
  ours,
  external,
}: {
  label: string;
  ours: Decimal;
  external: Decimal;
}) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-medium">
        {formatMoney(ours, "USD")} vs {formatMoney(external, "USD")} ·
        difference {formatMoney(ours.minus(external), "USD")}
      </p>
    </div>
  );
}

function ReverseView({
  input,
  targetProfit,
  targetMargin,
  setTargetProfit,
  setTargetMargin,
  reverseProfit,
  reverseMargin,
}: {
  input: CalculatorInput;
  targetProfit: string;
  targetMargin: string;
  setTargetProfit: (v: string) => void;
  setTargetMargin: (v: string) => void;
  reverseProfit: Decimal;
  reverseMargin: Decimal;
}) {
  const psychological = (v: Decimal) => v.ceil().minus("0.01");
  const scenarios = [
    ["No Offsite Ads", false, "0"],
    ["Offsite Ads · 15%", true, "15"],
    ["Offsite Ads · 12%", true, "12"],
  ] as const;
  return (
    <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
      <div className="card p-6">
        <p className="eyebrow">Your target</p>
        <h2 className="mt-1 text-xl font-semibold">Solve backwards</h2>
        <div className="mt-6 space-y-5">
          <NumberField
            label="Desired after-reserve profit"
            value={targetProfit}
            suffix="USD"
            onChange={setTargetProfit}
          />
          <NumberField
            label="Desired margin"
            value={targetMargin}
            suffix="%"
            onChange={setTargetMargin}
          />
        </div>
        <p className="mt-6 text-xs leading-5 text-stone-500">
          Binary search range $0.01–$10,000 · $0.01 tolerance · up to 200
          iterations.
        </p>
      </div>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceCard
            title="Target profit price"
            exact={reverseProfit}
            rounded={psychological(reverseProfit)}
          />
          <PriceCard
            title="Target margin price"
            exact={reverseMargin}
            rounded={psychological(reverseMargin)}
          />
        </div>
        <div className="card overflow-hidden">
          <div className="border-b p-5">
            <p className="eyebrow">Recommended-price scenarios</p>
            <h3 className="mt-1 font-semibold">Offsite Ads impact</h3>
          </div>
          {scenarios.map(([label, on, rate]) => {
            const price = solvePrice(
              {
                ...input,
                offsiteAdAttributed: on,
                offsiteAdsRate: rate,
              },
              { kind: "profitUsd", value: targetProfit || 0 },
            );
            return (
              <div
                key={label}
                className="flex items-center justify-between border-b px-5 py-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    Exact {formatMoney(price, "USD")}
                  </p>
                </div>
                <strong className="text-lg">
                  {formatMoney(psychological(price), "USD")}
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function PriceCard({
  title,
  exact,
  rounded,
}: {
  title: string;
  exact: Decimal;
  rounded: Decimal;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{formatMoney(exact, "USD")}</p>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-cream p-3 text-sm">
        <span>Psychological</span>
        <strong>{formatMoney(rounded, "USD")}</strong>
      </div>
    </div>
  );
}

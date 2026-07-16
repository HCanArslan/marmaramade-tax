import Decimal from "decimal.js";
import { convert, d, money, pct, roundMoney, sum } from "./money";
import type { CalculationLine, CalculatorInput } from "./types";

export interface CalculationResult {
  lines: CalculationLine[];
  totals: Record<string, Decimal>;
  warnings: string[];
  assumptions: string[];
}

export function volumetricWeight(lengthCm: Decimal.Value, widthCm: Decimal.Value, heightCm: Decimal.Value, divisor: Decimal.Value) {
  return d(lengthCm).mul(widthCm).mul(heightCm).div(divisor);
}

export function customsTotal(input: { declaredValue: Decimal.Value; dutyRate: Decimal.Value; dutyAmount?: Decimal.Value; tariffRate: Decimal.Value; tariffAmount?: Decimal.Value; processingFee: Decimal.Value; brokerageFee?: Decimal.Value; clearanceFee?: Decimal.Value; insuranceFee?: Decimal.Value; otherFee?: Decimal.Value }) {
  const duty = input.dutyAmount === undefined ? pct(input.declaredValue, input.dutyRate) : d(input.dutyAmount);
  const tariff = input.tariffAmount === undefined ? pct(input.declaredValue, input.tariffRate) : d(input.tariffAmount);
  return { duty, tariff, total: sum([duty, tariff, input.processingFee, input.brokerageFee ?? 0, input.clearanceFee ?? 0, input.insuranceFee ?? 0, input.otherFee ?? 0]) };
}

export function calculate(input: CalculatorInput): CalculationResult {
  const rate = d(input.usdTryRate);
  if (rate.lte(0)) throw new Error("Exchange rate must be positive");
  const lines: CalculationLine[] = [];
  const addUsd = (name: string, category: string, amount: Decimal.Value, formula: string, base?: Decimal.Value, feeRate?: Decimal.Value) => {
    const value = d(amount);
    lines.push({ name, category, nativeAmount: value.toString(), nativeCurrency: "USD", usd: value.toString(), try: convert(money(value, "USD"), rate, "TRY").amount.toString(), formula, base: base === undefined ? undefined : d(base).toString(), rate: feeRate === undefined ? undefined : d(feeRate).toString() });
    return value;
  };
  const addTry = (name: string, category: string, amount: Decimal.Value, formula: string, base?: Decimal.Value, feeRate?: Decimal.Value) => {
    const value = d(amount);
    lines.push({ name, category, nativeAmount: value.toString(), nativeCurrency: "TRY", usd: convert(money(value, "TRY"), rate, "USD").amount.toString(), try: value.toString(), formula, base: base === undefined ? undefined : d(base).toString(), rate: feeRate === undefined ? undefined : d(feeRate).toString() });
    return value;
  };

  const grossRevenue = sum([input.itemSubtotalUsd, input.shippingChargedToBuyerUsd, input.giftWrapChargedToBuyerUsd]).minus(input.sellerFundedDiscountUsd);
  addUsd("Item revenue", "Revenue", input.itemSubtotalUsd, "Item subtotal");
  addUsd("Shipping charged to buyer", "Revenue", input.shippingChargedToBuyerUsd, "Buyer-paid shipping");
  addUsd("Seller-funded discount", "Revenue", d(input.sellerFundedDiscountUsd).neg(), "Reduces seller revenue");

  const transaction = pct(grossRevenue, input.transactionRate);
  const processingPct = pct(grossRevenue, input.processingRate);
  const regulatory = pct(grossRevenue, input.regulatoryRate);
  const conversionFee = input.currencyConversionRequired ? pct(grossRevenue, input.conversionRate) : d(0);
  const listing = d(input.listingFeeUsd).mul(input.numberOfListingCharges);
  const offsite = input.offsiteAdAttributed ? Decimal.min(pct(grossRevenue, input.offsiteAdsRate), input.offsiteAdsMaximumUsd) : d(0);
  const processingFixedTry = d(input.processingFixedTry);
  const depositTry = input.depositFeeApplies ? d(input.depositFeeTry) : d(0);

  const feeUsd: Record<string, Decimal> = { listing, transaction, processingPercentage: processingPct, regulatory, conversion: conversionFee, offsiteAds: offsite, etsyAds: d(input.etsyAdsUsd) };
  addUsd("Listing fee", "Etsy fees", listing, "Listing fee × listing charges", input.numberOfListingCharges, input.listingFeeUsd);
  addUsd("Transaction fee", "Etsy fees", transaction, "Gross seller revenue × rate", grossRevenue, input.transactionRate);
  addUsd("Payment processing percentage", "Etsy fees", processingPct, "Processing base × rate", grossRevenue, input.processingRate);
  addTry("Payment processing fixed", "Etsy fees", processingFixedTry, "Fixed TRY amount");
  addUsd("Regulatory operating fee", "Etsy fees", regulatory, "Gross seller revenue × rate", grossRevenue, input.regulatoryRate);
  addUsd("Currency conversion fee", "Etsy fees", conversionFee, "Conversion base × rate when enabled", grossRevenue, input.conversionRate);
  addUsd("Offsite Ads", "Advertising", offsite, "min(base × rate, 100 USD)", grossRevenue, input.offsiteAdsRate);
  addUsd("Etsy Ads", "Advertising", input.etsyAdsUsd, "Actual entered spend");
  addTry("Deposit fee", "Etsy fees", depositTry, "Conditional fixed TRY amount");

  const vatCharged = input.vatTreatment === "CHARGED_BY_ETSY";
  const vatUsd = Object.entries(feeUsd).reduce((total, [key, fee]) => {
    if (!vatCharged || !input.vatApplicable[key]) return total;
    const value = pct(fee, input.sellerFeeVatRate);
    addUsd(`VAT on ${key}`, "Seller-fee VAT", value, "Eligible fee × seller-fee VAT rate", fee, input.sellerFeeVatRate);
    return total.plus(value);
  }, d(0));
  const vatTry = vatCharged && input.vatApplicable.processingFixed ? pct(processingFixedTry, input.sellerFeeVatRate) : d(0);
  if (vatTry.gt(0)) addTry("VAT on processing fixed", "Seller-fee VAT", vatTry, "Eligible fee × seller-fee VAT rate", processingFixedTry, input.sellerFeeVatRate);

  const materialTry = addTry("Material", "Product", input.materialCostTry, "Native TRY direct cost");
  const laborTry = addTry("Labor", "Labor", d(input.laborHours).mul(input.laborHourlyRateTry), "Labor hours × hourly TRY rate", input.laborHours, input.laborHourlyRateTry);
  const packagingTry = addTry("Packaging", "Product", input.packagingCostTry, "Native TRY direct cost");
  const additionalTry = addTry("Other direct cost", "Product", input.additionalDirectCostTry, "Native TRY direct cost");
  const domesticTry = sum([input.domesticTransferCostTry, input.transportToCarrierBranchTry, input.pickupFeeTry, input.nonPartnerShipmentCostTry]);
  addTry("Domestic logistics", "Logistics", domesticTry, "Transfer + branch transport + pickup + non-partner cost");
  const shippingUsd = sum([input.internationalShippingUsd, input.shippingInsuranceUsd]);
  addUsd("International shipping", "Logistics", input.internationalShippingUsd, "Saved shipping quote");
  if (d(input.shippingInsuranceUsd).gt(0)) addUsd("Shipping insurance", "Logistics", input.shippingInsuranceUsd, "Saved shipping quote");
  const customsUsd = sum([input.customsDutyUsd, input.additionalTariffUsd, input.carrierProcessingFeeUsd, input.brokerageFeeUsd, input.customsClearanceFeeUsd, input.destinationFeesUsd]);
  addUsd("Customs duty", "Customs", input.customsDutyUsd, "Dated customs quote");
  addUsd("Additional tariff", "Customs", input.additionalTariffUsd, "Dated customs quote");
  addUsd("Carrier customs-processing charge", "Customs", input.carrierProcessingFeeUsd, "Destination carrier charge; not a ShipEntegra service");
  if (d(input.brokerageFeeUsd).gt(0)) addUsd("Brokerage", "Customs", input.brokerageFeeUsd, "Dated customs quote");
  const overheadTry = d(input.expectedMonthlyOrders).gt(0) ? d(input.monthlyOverheadTry).div(input.expectedMonthlyOrders) : d(0);
  addTry("Allocated business overhead", "Business overhead", overheadTry, "Monthly overhead ÷ expected monthly orders", input.monthlyOverheadTry, input.expectedMonthlyOrders);
  const returnReserve = pct(grossRevenue, input.returnReserveRate);
  const damageReserve = pct(grossRevenue, input.damageReserveRate);
  const exchangeLoss = pct(grossRevenue, input.exchangeLossReserveRate);
  addUsd("Return reserve", "Reserves", returnReserve, "Gross revenue × expected return rate", grossRevenue, input.returnReserveRate);
  addUsd("Damage reserve", "Reserves", damageReserve, "Gross revenue × expected damage rate", grossRevenue, input.damageReserveRate);

  const etsyFeesUsd = sum([...Object.values(feeUsd), vatUsd, convert(money(sum([processingFixedTry, depositTry, vatTry]), "TRY"), rate, "USD").amount]);
  const materialCostUsd = convert(money(materialTry, "TRY"), rate, "USD").amount;
  const packagingCostUsd = convert(money(packagingTry, "TRY"), rate, "USD").amount;
  const additionalDirectCostUsd = convert(money(additionalTry, "TRY"), rate, "USD").amount;
  const productExLaborUsd = sum([materialCostUsd, packagingCostUsd, additionalDirectCostUsd]);
  const laborUsd = convert(money(laborTry, "TRY"), rate, "USD").amount;
  const domesticUsd = convert(money(domesticTry, "TRY"), rate, "USD").amount;
  const overheadUsd = convert(money(overheadTry, "TRY"), rate, "USD").amount;
  const advertisingUsd = offsite.plus(input.etsyAdsUsd);
  const contributionProfit = grossRevenue.minus(etsyFeesUsd).minus(productExLaborUsd).minus(domesticUsd).minus(shippingUsd).minus(customsUsd).minus(returnReserve).minus(damageReserve);
  const profitAfterLabor = contributionProfit.minus(laborUsd);
  const operatingProfit = profitAfterLabor.minus(overheadUsd);
  const estimatedPreTaxProfit = operatingProfit.minus(exchangeLoss).minus(input.otherOperatingExpensesUsd);
  const taxReserve = Decimal.max(estimatedPreTaxProfit, 0).mul(d(input.taxReserveRate).div(100));
  const estimatedAfterReserveProfit = estimatedPreTaxProfit.minus(taxReserve);
  addUsd("Exchange-loss reserve", "Reserves", exchangeLoss, "Gross revenue × exchange-loss rate", grossRevenue, input.exchangeLossReserveRate);
  addUsd("Tax reserve", "Reserves", taxReserve, "Positive estimated pre-tax profit × reserve rate", estimatedPreTaxProfit, input.taxReserveRate);

  const totalCostUsd = grossRevenue.minus(estimatedAfterReserveProfit);
  const margin = (value: Decimal) => grossRevenue.eq(0) ? d(0) : value.div(grossRevenue).mul(100);
  const warnings: string[] = [];
  if (shippingUsd.gt(0) && customsUsd.eq(0)) warnings.push("DDP shipment has no import costs entered.");
  if (input.vatTreatment !== "CHARGED_BY_ETSY") warnings.push("Local VAT, reverse-charge, income-tax, invoicing, or accounting obligations may still apply. Enter accountant-confirmed amounts separately.");
  return {
    lines,
    totals: {
      grossRevenue, etsyBaseFees: etsyFeesUsd.minus(vatUsd).minus(convert(money(vatTry, "TRY"), rate, "USD").amount), etsyFeeVatUsd: vatUsd.plus(convert(money(vatTry, "TRY"), rate, "USD").amount),
      totalEtsyFees: etsyFeesUsd, directProductCostUsd: productExLaborUsd.plus(laborUsd), materialCostUsd, laborUsd, packagingCostUsd, additionalDirectCostUsd, domesticLogisticsUsd: domesticUsd,
      internationalShippingUsd: shippingUsd, customsAndTariffUsd: customsUsd, allocatedBusinessOverheadUsd: overheadUsd, advertisingUsd,
      contributionProfit, profitAfterLabor, operatingProfit, estimatedPreTaxProfit, taxReserve, estimatedAfterReserveProfit,
      totalCostUsd, totalCostTry: totalCostUsd.mul(rate), estimatedAfterReserveProfitTry: estimatedAfterReserveProfit.mul(rate),
      contributionMargin: margin(contributionProfit), operatingMargin: margin(operatingProfit), afterReserveMargin: margin(estimatedAfterReserveProfit),
    },
    warnings,
    assumptions: [`USD/TRY snapshot: ${rate.toString()}`, "Etsy Türkiye fee profile: 2026 assumptions", `Business status: ${input.businessStatus}`, "Shipping and customs figures are manually entered quotes"],
  };
}

export function solvePrice(baseInput: CalculatorInput, target: { kind: "profitUsd" | "margin" | "payoutTry"; value: Decimal.Value }) {
  let low = d("0.01");
  let high = d("10000");
  const targetValue = d(target.value);
  let result = high;
  for (let i = 0; i < 200 && high.minus(low).gt("0.01"); i += 1) {
    const mid = low.plus(high).div(2);
    const calc = calculate({ ...baseInput, itemSubtotalUsd: mid });
    const actual = target.kind === "margin" ? calc.totals.afterReserveMargin : target.kind === "payoutTry" ? calc.totals.estimatedAfterReserveProfitTry : calc.totals.estimatedAfterReserveProfit;
    if (actual.gte(targetValue)) { result = mid; high = mid; } else low = mid;
  }
  return roundMoney(result);
}

export function resolveEffectiveVersion<T extends { effectiveFrom: Date; effectiveTo?: Date | null }>(versions: T[], date: Date): T | undefined {
  return versions.find((version) => version.effectiveFrom <= date && (!version.effectiveTo || version.effectiveTo > date));
}

export function quoteWarnings(input: { destination: string; quoteDestination: string; incoterm: string; importCost: Decimal.Value; expirationDate?: Date; now?: Date; productHsCode?: string; quoteHsCode?: string }) {
  const warnings: string[] = [];
  const now = input.now ?? new Date();
  if (input.destination === "US" && input.incoterm !== "DDP") warnings.push("US shipment is not marked DDP.");
  if (input.incoterm === "DDP" && d(input.importCost).eq(0)) warnings.push("DDP shipment has no import costs entered.");
  if (input.destination !== input.quoteDestination) warnings.push("Quote destination does not match the order destination.");
  if (input.expirationDate && input.expirationDate < now) warnings.push("Quote has expired.");
  if (input.productHsCode && input.quoteHsCode && input.productHsCode !== input.quoteHsCode) warnings.push("Product HS code does not match the customs quote.");
  return warnings;
}

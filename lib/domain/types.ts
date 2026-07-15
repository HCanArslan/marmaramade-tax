import type { DecimalInput } from "./money";

export type BusinessStatus = "INDIVIDUAL_UNREGISTERED" | "SOLE_PROPRIETORSHIP" | "LIMITED_COMPANY";
export type VatTreatment = "CHARGED_BY_ETSY" | "NOT_CHARGED_BY_ETSY" | "ACCOUNTANT_MANAGED" | "MANUAL";

export interface CalculatorInput {
  itemSubtotalUsd: DecimalInput;
  shippingChargedToBuyerUsd: DecimalInput;
  giftWrapChargedToBuyerUsd: DecimalInput;
  sellerFundedDiscountUsd: DecimalInput;
  etsyFundedDiscountUsd: DecimalInput;
  taxCollectedFromBuyerUsd: DecimalInput;
  numberOfListingCharges: DecimalInput;
  transactionRate: DecimalInput;
  processingRate: DecimalInput;
  processingFixedTry: DecimalInput;
  regulatoryRate: DecimalInput;
  conversionRate: DecimalInput;
  currencyConversionRequired: boolean;
  offsiteAdAttributed: boolean;
  offsiteAdsRate: DecimalInput;
  offsiteAdsMaximumUsd: DecimalInput;
  listingFeeUsd: DecimalInput;
  etsyAdsUsd: DecimalInput;
  depositFeeApplies: boolean;
  depositFeeTry: DecimalInput;
  vatTreatment: VatTreatment;
  sellerFeeVatRate: DecimalInput;
  vatApplicable: Record<string, boolean>;
  materialCostTry: DecimalInput;
  laborHours: DecimalInput;
  laborHourlyRateTry: DecimalInput;
  packagingCostTry: DecimalInput;
  additionalDirectCostTry: DecimalInput;
  domesticTransferCostTry: DecimalInput;
  transportToCarrierBranchTry: DecimalInput;
  pickupFeeTry: DecimalInput;
  nonPartnerShipmentCostTry: DecimalInput;
  internationalShippingUsd: DecimalInput;
  shippingInsuranceUsd: DecimalInput;
  customsDutyUsd: DecimalInput;
  additionalTariffUsd: DecimalInput;
  carrierProcessingFeeUsd: DecimalInput;
  brokerageFeeUsd: DecimalInput;
  customsClearanceFeeUsd: DecimalInput;
  destinationFeesUsd: DecimalInput;
  monthlyOverheadTry: DecimalInput;
  expectedMonthlyOrders: DecimalInput;
  returnReserveRate: DecimalInput;
  damageReserveRate: DecimalInput;
  exchangeLossReserveRate: DecimalInput;
  taxReserveRate: DecimalInput;
  otherOperatingExpensesUsd: DecimalInput;
  usdTryRate: DecimalInput;
  businessStatus: BusinessStatus;
}

export interface CalculationLine {
  name: string;
  category: string;
  nativeAmount: string;
  nativeCurrency: "USD" | "TRY";
  usd: string;
  try: string;
  base?: string;
  rate?: string;
  formula: string;
}

import type { CalculatorInput } from "./types";

const vatLines = ["listing", "transaction", "processingPercentage", "processingFixed", "regulatory", "conversion", "offsiteAds", "etsyAds"];

export const defaultCalculatorInput: CalculatorInput = {
  itemSubtotalUsd: "150", shippingChargedToBuyerUsd: "0", giftWrapChargedToBuyerUsd: "0", sellerFundedDiscountUsd: "0",
  etsyFundedDiscountUsd: "0", taxCollectedFromBuyerUsd: "0", numberOfListingCharges: "1", transactionRate: "6.5",
  processingRate: "7", processingFixedTry: "14", regulatoryRate: "1.67", conversionRate: "2.5", currencyConversionRequired: true,
  offsiteAdAttributed: false, offsiteAdsRate: "15", offsiteAdsMaximumUsd: "100", listingFeeUsd: "0.20", etsyAdsUsd: "0",
  depositFeeApplies: false, depositFeeTry: "42", vatTreatment: "CHARGED_BY_ETSY", sellerFeeVatRate: "20",
  vatApplicable: Object.fromEntries(vatLines.map((line) => [line, true])),
  materialCostTry: "0", laborHours: "0", laborHourlyRateTry: "0", packagingCostTry: "0", additionalDirectCostTry: "0",
  domesticTransferCostTry: "0", transportToCarrierBranchTry: "0", pickupFeeTry: "0", nonPartnerShipmentCostTry: "0",
  internationalShippingUsd: "34.21", shippingInsuranceUsd: "0", customsDutyUsd: "9.45", additionalTariffUsd: "15",
  carrierProcessingFeeUsd: "4.50", brokerageFeeUsd: "0", customsClearanceFeeUsd: "0", destinationFeesUsd: "0",
  monthlyOverheadTry: "0", expectedMonthlyOrders: "10", returnReserveRate: "0", damageReserveRate: "0",
  exchangeLossReserveRate: "0", taxReserveRate: "0", otherOperatingExpensesUsd: "0", usdTryRate: "40",
  businessStatus: "INDIVIDUAL_UNREGISTERED",
};

import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
const dec = (value: string | number) => new Prisma.Decimal(value);

async function main() {
  if (process.env.VERCEL_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to replace production data. Set ALLOW_PRODUCTION_SEED=true only for an intentional first-time demo seed.");
  }
  await prisma.etsyListingProductLink.deleteMany();
  await prisma.etsyListingImage.deleteMany();
  await prisma.etsyReceiptItem.deleteMany();
  await prisma.etsyPayment.deleteMany();
  await prisma.etsyLedgerEntry.deleteMany();
  await prisma.etsyReceipt.deleteMany();
  await prisma.etsyListing.deleteMany();
  await prisma.etsySyncError.deleteMany();
  await prisma.etsySyncRun.deleteMany();
  await prisma.etsyConnection.deleteMany();
  await prisma.etsyOAuthState.deleteMany();
  await prisma.etsyWebhookEvent.deleteMany();
  await prisma.etsyImportMapping.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.adminSecurityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.orderCostLine.deleteMany();
  await prisma.orderCostSnapshot.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.scenarioResult.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.feeRule.deleteMany();
  await prisma.productCostVersion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.packageProfile.deleteMany();
  await prisma.shippingQuote.deleteMany();
  await prisma.customsQuote.deleteMany();
  await prisma.exchangeRateSnapshot.deleteMany();
  await prisma.businessProfileVersion.deleteMany();
  await prisma.feeProfile.deleteMany();
  await prisma.marketplace.deleteMany();

  await prisma.marketplace.create({ data: { name: "Etsy" } });
  const product = await prisma.product.create({ data: { sku: "MM-0007", title: "Handmade Cotton Crochet Tote Bag", material: "Cotton", hsCode: "4202224500", oneOfOne: true, description: "One-of-one handmade cotton crochet tote bag" } });
  await prisma.productCostVersion.create({ data: { productId: product.id, effectiveFrom: new Date("2026-01-01"), materialCostTry: dec(0), laborHours: dec(0), laborHourlyRateTry: dec(0), packagingCostTry: dec(0), additionalDirectCostTry: dec(0), notes: "Enter MarmaraMade costs in native TRY before using for an order." } });
  await prisma.packageProfile.create({ data: { name: "Soft crochet bag — ShipEntegra", lengthCm: dec(40), widthCm: dec(30), heightCm: dec(7), actualWeightKg: dec(1), volumetricDivisor: dec(5000), packagingCostTry: dec(0), notes: "Dimensions are package dimensions, not product dimensions." } });
  const feeProfile = await prisma.feeProfile.create({ data: { marketplace: "Etsy", name: "Etsy Türkiye 2026", country: "TR", effectiveFrom: new Date("2026-01-01"), listingCurrency: "USD", payoutCurrency: "TRY", notes: "Editable planning assumptions; verify with Etsy." } });
  const rules = [
    ["Listing fee", "LISTING", "FIXED", null, "0.20", "USD", true],
    ["Transaction fee", "TRANSACTION", "PERCENTAGE", "6.5", null, null, true],
    ["Payment processing", "PAYMENT_PROCESSING", "PERCENTAGE_PLUS_FIXED", "7", "14", "TRY", true],
    ["Türkiye Regulatory Operating Fee", "REGULATORY", "PERCENTAGE", "1.67", null, null, true],
    ["Currency conversion", "CURRENCY_CONVERSION", "CONDITIONAL", "2.5", null, null, true],
    ["Offsite Ads below threshold", "OFFSITE_ADS", "CONDITIONAL", "15", null, null, true],
    ["Offsite Ads above threshold", "OFFSITE_ADS", "CONDITIONAL", "12", null, null, true],
    ["Deposit fee", "DEPOSIT", "CONDITIONAL", null, "42", "TRY", false],
  ] as const;
  for (const [name, category, calculationType, percentageRate, fixedAmount, fixedCurrency, vatApplicable] of rules) {
    await prisma.feeRule.create({ data: { feeProfileId: feeProfile.id, name, category, calculationType, percentageRate: percentageRate ? dec(percentageRate) : null, fixedAmount: fixedAmount ? dec(fixedAmount) : null, fixedCurrency, calculationBase: category === "LISTING" ? "LISTING_CHARGES" : "GROSS_SELLER_REVENUE", vatApplicable, vatRate: dec(20), maximumAmount: category === "OFFSITE_ADS" ? dec(100) : null, effectiveFrom: new Date("2026-01-01") } });
  }
  await prisma.businessProfileVersion.create({ data: { name: "MarmaraMade — Individual", effectiveFrom: new Date("2026-01-01"), businessStatus: "INDIVIDUAL_UNREGISTERED", vatIdSubmittedToEtsy: false, etsyVatTreatment: "ETSY_CHARGES_SELLER_FEE_VAT", sellerFeeVatRate: dec(20), accountantMonthlyTry: dec(0), socialSecurityMonthlyTry: dec(0), invoicingSoftwareMonthlyTry: dec(0), bankingMonthlyTry: dec(0), officeMonthlyTry: dec(0), otherMonthlyBusinessCostsTry: dec(0), expectedMonthlyOrders: 10, overheadAllocationMethod: "PER_ORDER", notes: "Local VAT, reverse-charge, income-tax, invoicing, or accounting obligations may still apply. Enter accountant-confirmed amounts separately." } });
  await prisma.shippingQuote.create({ data: { originCountry: "TR", originCity: "Bandırma, Balıkesir", destinationCountry: "US", carrier: "ShipEntegra", serviceName: "ShipEntegra Express", incoterm: "DDP", packageLengthCm: dec(40), packageWidthCm: dec(30), packageHeightCm: dec(7), actualWeightKg: dec(1), volumetricDivisor: dec(5000), volumetricWeightKg: dec("1.68"), billableWeightKg: dec("1.68"), shippingCost: dec("34.21"), shippingCurrency: "USD", insuranceCost: dec(0), fuelSurcharge: dec(0), remoteAreaFee: dec(0), pickupFee: dec(0), otherCarrierFees: dec(0), quoteDate: new Date("2026-07-14"), source: "Manual example quote", notes: "Domestic partner shipment assumption is subsidized and must be confirmed." } });
  await prisma.customsQuote.create({ data: { originCountry: "TR", destinationCountry: "US", hsCode: "4202224500", productDescription: "Handmade cotton crochet tote bag", countryOfOrigin: "TR", declaredValue: dec(150), declaredValueCurrency: "USD", customsDutyRate: dec("6.3"), customsDutyAmount: dec("9.45"), additionalTariffRate: dec(10), additionalTariffAmount: dec(15), carrierProcessingFee: dec("4.50"), brokerageFee: dec(0), customsClearanceFee: dec(0), insuranceFee: dec(0), otherDestinationFee: dec(0), quoteDate: new Date("2026-07-14"), source: "Manual example quote", notes: "Carrier processing fee is a destination carrier customs-processing charge, not a ShipEntegra service." } });
  await prisma.exchangeRateSnapshot.create({ data: { baseCurrency: "USD", quoteCurrency: "TRY", rate: dec(40), source: "Manual planning rate", capturedAt: new Date("2026-07-14") } });
  await prisma.appSetting.upsert({ where: { key: "shopProfile" }, update: {}, create: { key: "shopProfile", value: JSON.stringify({ shopName: "MarmaraMade", country: "Türkiye", origin: "Bandırma, Balıkesir, Türkiye", listingCurrency: "USD", payoutCurrency: "TRY", shippingProvider: "ShipEntegra" }) } });
}

main().finally(() => prisma.$disconnect());

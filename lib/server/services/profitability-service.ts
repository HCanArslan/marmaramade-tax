import "server-only";
import Decimal from "decimal.js";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { calculatePortfolio, calculateProductProfit, type ResolvedInput } from "@/lib/domain/product-profit";
import { createProductProfitSnapshot, getProfitabilityWorkspace, resolveActiveWorkspaceOwnerContext } from "@/lib/server/repositories/profitability-repository";

type WorkspaceData = Awaited<ReturnType<typeof getProfitabilityWorkspace>>;
type ProductData = WorkspaceData["products"][number];

const resolved = <T>(value: T | null, classification: ResolvedInput<T>["classification"], source: string, versionId?: string | null): ResolvedInput<T> => ({ value, classification, source, versionId });

function directRate(data: WorkspaceData, marketplaceCurrency: string, costCurrency: string) {
  if (marketplaceCurrency === costCurrency) return { value: new Decimal(1), id: null, source: "IDENTICAL_CURRENCY" };
  const rate = data.exchangeRates.find((candidate) =>
    (candidate.baseCurrency === marketplaceCurrency && candidate.quoteCurrency === costCurrency)
    || (candidate.quoteCurrency === marketplaceCurrency && candidate.baseCurrency === costCurrency));
  if (!rate) return null;
  return {
    value: rate.baseCurrency === marketplaceCurrency ? new Decimal(rate.rate) : new Decimal(1).div(rate.rate),
    id: rate.id,
    source: `${rate.source}:${rate.baseCurrency}/${rate.quoteCurrency}`,
  };
}

function resolveProduct(data: WorkspaceData, product: ProductData, destinationCountry: string) {
  const listing = product.etsyListingLinks[0]?.listing ?? null;
  const cost = product.costVersions[0] ?? null;
  const defaults = product.onboardingDefaults;
  const workspaceDefaults = data.costDefault;
  const override = product.shippingOverrides.find((item) => item.destinationCountry === destinationCountry) ?? null;
  const shippingDefault = data.shippingDefaults.find((item) => item.destinationCountry === destinationCountry) ?? null;
  const marketplaceCurrency = listing?.priceCurrency ?? workspaceDefaults?.marketplaceCurrency ?? data.businessProfile?.defaultMarketplaceCurrency ?? "USD";
  const costCurrency = workspaceDefaults?.costCurrency ?? "TRY";
  const reportingCurrency = data.businessProfile?.reportingCurrency ?? workspaceDefaults?.reportingCurrency ?? marketplaceCurrency;
  const fx = directRate(data, marketplaceCurrency, costCurrency);
  const shippingValue = override?.shippingCost ?? shippingDefault?.shippingCost ?? workspaceDefaults?.defaultShippingCost ?? null;
  const shippingCurrency = override?.shippingCurrency ?? shippingDefault?.shippingCurrency ?? workspaceDefaults?.defaultShippingCurrency ?? costCurrency;
  const customsValue = override?.sellerPaidCustomsCost ?? shippingDefault?.sellerPaidCustomsCost ?? null;
  const customsCurrency = override?.customsCurrency ?? shippingDefault?.customsCurrency ?? marketplaceCurrency;
  const shippingCurrencySupported = [marketplaceCurrency, costCurrency].includes(shippingCurrency);
  const customsCurrencySupported = [marketplaceCurrency, costCurrency].includes(customsCurrency);
  const customsResponsibility = (override?.customsResponsibility ?? shippingDefault?.customsResponsibility ?? workspaceDefaults?.customsResponsibility ?? "UNKNOWN") as "SELLER" | "BUYER" | "UNKNOWN";
  const taxPlanning = data.businessProfile?.taxPlanningPreset;

  return {
    productId: product.id,
    listingId: listing?.id ?? null,
    destinationCountry,
    marketplaceCurrency,
    costCurrency,
    reportingCurrency,
    price: resolved(listing?.priceAmount ?? null, listing ? "KNOWN" : "UNKNOWN", listing ? "ETSY_LISTING" : "MISSING", listing?.id),
    materialCost: resolved(cost?.materialCostTry ?? null, cost ? "KNOWN" : "UNKNOWN", cost ? `PRODUCT_COST_VERSION:${costCurrency}` : "MISSING", cost?.id),
    labourHours: resolved(cost?.laborHours ?? defaults?.laborHours ?? null, cost ? "KNOWN" : defaults?.laborHours != null ? "ESTIMATED" : "UNKNOWN", cost ? "PRODUCT_COST_VERSION" : defaults ? "WORKSPACE_DEFAULT" : "MISSING", cost?.id ?? defaults?.costDefaultVersionId),
    cashLabourRate: resolved(cost?.laborHourlyRateTry ?? defaults?.hourlyLaborValue ?? null, cost ? "KNOWN" : defaults?.hourlyLaborValue != null ? "ESTIMATED" : "UNKNOWN", cost ? `PRODUCT_COST_VERSION:${costCurrency}` : defaults ? `WORKSPACE_DEFAULT:${costCurrency}` : "MISSING", cost?.id ?? defaults?.costDefaultVersionId),
    economicLabourRate: resolved(cost?.economicHourlyRateTry ?? cost?.laborHourlyRateTry ?? defaults?.hourlyLaborValue ?? null, cost?.economicHourlyRateTry != null ? "KNOWN" : cost || defaults ? "ESTIMATED" : "UNKNOWN", cost ? `PRODUCT_COST_VERSION:${costCurrency}` : defaults ? `WORKSPACE_DEFAULT:${costCurrency}` : "MISSING", cost?.id ?? defaults?.costDefaultVersionId),
    packagingCost: resolved(cost?.packagingCostTry ?? defaults?.packagingCost ?? null, cost ? "KNOWN" : defaults?.packagingCost != null ? "ESTIMATED" : "UNKNOWN", cost ? `PRODUCT_COST_VERSION:${costCurrency}` : defaults ? `WORKSPACE_DEFAULT:${costCurrency}` : "MISSING", cost?.id ?? defaults?.costDefaultVersionId),
    otherDirectCost: resolved(cost?.additionalDirectCostTry ?? null, cost ? "KNOWN" : "NOT_APPLICABLE", cost ? `PRODUCT_COST_VERSION:${costCurrency}` : `NOT_APPLICABLE:${costCurrency}`, cost?.id),
    shippingCost: resolved(shippingCurrencySupported ? shippingValue : null, shippingValue == null || !shippingCurrencySupported ? "UNKNOWN" : override ? "KNOWN" : "ESTIMATED", override ? `PRODUCT_SHIPPING_OVERRIDE:${shippingCurrency}` : shippingDefault ? `WORKSPACE_SHIPPING_DEFAULT:${shippingCurrency}` : workspaceDefaults ? `ONBOARDING_DEFAULT:${shippingCurrency}` : "MISSING", override?.id ?? shippingDefault?.id ?? workspaceDefaults?.id),
    customsCost: resolved(customsCurrencySupported ? customsValue : null, customsResponsibility === "BUYER" ? "NOT_APPLICABLE" : customsValue == null || !customsCurrencySupported ? "UNKNOWN" : override ? "KNOWN" : "ESTIMATED", customsResponsibility === "BUYER" ? `BUYER_PAID:${customsCurrency}` : override ? `PRODUCT_SHIPPING_OVERRIDE:${customsCurrency}` : shippingDefault ? `WORKSPACE_SHIPPING_DEFAULT:${customsCurrency}` : "MISSING", override?.id ?? shippingDefault?.id),
    exportHandlingCost: resolved(workspaceDefaults?.exportHandlingCost ?? null, workspaceDefaults ? "ESTIMATED" : "UNKNOWN", workspaceDefaults ? `WORKSPACE_DEFAULT:${costCurrency}` : "MISSING", workspaceDefaults?.id),
    monthlyOverhead: resolved(workspaceDefaults?.monthlyOverheadKnown ? workspaceDefaults.monthlyOverhead : null, workspaceDefaults?.monthlyOverheadKnown ? "ESTIMATED" : "UNKNOWN", workspaceDefaults?.monthlyOverheadKnown ? `WORKSPACE_DEFAULT:${costCurrency}` : "MISSING", workspaceDefaults?.id),
    expectedMonthlyOrders: resolved(null, workspaceDefaults?.monthlyOverheadKnown ? "UNKNOWN" : "NOT_APPLICABLE", "NOT_CONFIGURED"),
    exchangeRate: resolved(fx?.value ?? null, fx ? "KNOWN" : "UNKNOWN", fx?.source ?? "MISSING", fx?.id),
    feeRules: data.feeProfile?.rules ?? [],
    feeProfileId: data.feeProfile?.id ?? null,
    customsResponsibility,
    targetMarginPercent: shippingDefault?.targetMarginPercent ?? 20,
    taxReserveRate: resolved(taxPlanning === "NONE" ? 0 : null, taxPlanning === "NONE" ? "NOT_APPLICABLE" : "UNKNOWN", taxPlanning ? `BUSINESS_PROFILE:${taxPlanning}` : "MISSING", data.businessProfile?.id),
    references: {
      productCostVersionId: cost?.id ?? null,
      costDefaultVersionId: workspaceDefaults?.id ?? null,
      businessProfileVersionId: data.businessProfile?.id ?? null,
      feeProfileId: data.feeProfile?.id ?? null,
      exchangeRateSnapshotId: fx?.id ?? null,
      shippingDefaultVersionId: shippingDefault?.id ?? null,
      shippingOverrideVersionId: override?.id ?? null,
    },
  };
}

function serialize(value: unknown): unknown {
  if (value instanceof Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serialize(nested)]));
  return value;
}

export async function loadProfitability(context: WorkspaceContext, destinationCountry?: string) {
  const data = await getProfitabilityWorkspace(context, destinationCountry);
  const destination = destinationCountry ?? data.costDefault?.targetMarket ?? "US";
  const products = data.products.map((product) => {
    const inputs = resolveProduct(data, product, destination);
    return { product, inputs, calculation: calculateProductProfit(inputs) };
  });
  const portfolio = calculatePortfolio(products.map((row) => ({ quantity: 1, calculation: row.calculation })));
  const calculated = products.filter((row) => row.calculation.result !== null);
  const averageMargin = calculated.length ? calculated.reduce((sum, row) => sum.plus(row.calculation.result!.cashMarginPercent ?? 0), new Decimal(0)).div(calculated.length) : null;
  const lossMaking = calculated.filter((row) => row.calculation.result!.finalCashProfit.lt(0)).length;
  return { ...data, destination, products, portfolio, averageMargin, lossMaking };
}

export async function loadProductProfitability(context: WorkspaceContext, productId: string, destinationCountry?: string) {
  const view = await loadProfitability(context, destinationCountry);
  const row = view.products.find((candidate) => candidate.product.id === productId);
  return row ? { ...view, selected: row } : null;
}

export async function recalculateProduct(context: WorkspaceContext, productId: string, destinationCountry?: string, calculationKey?: string) {
  const view = await loadProductProfitability(context, productId, destinationCountry);
  if (!view) throw new Error("Product is unavailable.");
  const { selected } = view;
  const result = selected.calculation.result;
  return createProductProfitSnapshot(context, {
    calculationKey,
    productId,
    listingId: selected.inputs.listingId,
    destinationCountry: view.destination,
    quantity: 1,
    listingPrice: selected.inputs.price.value ?? 0,
    listingCurrency: selected.inputs.marketplaceCurrency,
    reportingCurrency: selected.inputs.reportingCurrency,
    status: selected.calculation.status,
    completenessScore: selected.calculation.completenessScore,
    inputSnapshot: serialize(selected.calculation.inputSnapshot) as object,
    resultSnapshot: serialize({ result, recommendations: selected.calculation.recommendations, missingFields: selected.calculation.missingFields }) as object,
    warnings: selected.calculation.warnings,
    references: selected.inputs.references,
    totals: result ? {
      grossRevenue: result.grossRevenue, etsyFees: result.etsyFees, productCashCost: result.productCashCost, economicLabourCost: result.economicLabourCost, shippingCost: result.shippingCost, customsExposure: result.customsExposure, preTaxCashProfit: result.preTaxCashProfit, taxReserve: result.taxReserve, finalCashProfit: result.finalCashProfit, economicProfit: result.economicProfit, cashMarginPercent: result.cashMarginPercent, economicMarginPercent: result.economicMarginPercent,
    } : {},
  });
}

export async function recalculateWorkspace(context: WorkspaceContext, calculationKey?: string) {
  const view = await loadProfitability(context);
  const snapshots = [];
  for (const row of view.products) snapshots.push(await recalculateProduct(context, row.product.id, view.destination, calculationKey ? `${calculationKey}:${row.product.id}` : undefined));
  return { workspaceId: context.workspaceId, created: snapshots.length };
}

export async function recalculateWorkspaceById(workspaceId: string, calculationKey: string) {
  return recalculateWorkspace(await resolveActiveWorkspaceOwnerContext(workspaceId), calculationKey);
}

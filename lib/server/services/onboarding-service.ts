import "server-only";
import Decimal from "decimal.js";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { captureOnboardingEvent } from "@/lib/analytics/onboarding";
import { businessPresetFor, calculateFirstResult, workspaceCompleteness } from "@/lib/domain/onboarding";
import {
  applyDefaultsToMissingProducts,
  createOnboardingState,
  getOnboardingSnapshot,
  previewBulkDefaultApplication,
  recordLegalAcceptances,
  saveCostDefaults,
  saveMarketDefaults,
  selectBusinessProfile,
  updateOnboardingState,
  type CostDefaultsInput,
} from "@/lib/server/repositories/onboarding-repository";

export const LEGAL_VERSIONS = { terms: "draft-2026-08-03", privacy: "draft-2026-08-03", estimates: "planning-estimates-v1" } as const;

const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
const nextStep = (completed: number[]) => [1, 2, 3, 4, 5].find((step) => !completed.includes(step)) ?? 5;

function productInput(product: Awaited<ReturnType<typeof getOnboardingSnapshot>>["products"][number], shippingCost: Decimal.Value | null) {
  const cost = product.costVersions[0];
  const defaults = product.onboardingDefaults;
  return {
    materialCost: cost?.materialCostTry ?? null,
    laborHours: cost?.laborHours ?? defaults?.laborHours ?? null,
    laborRate: cost?.laborHourlyRateTry ?? defaults?.hourlyLaborValue ?? null,
    packagingCost: cost?.packagingCostTry ?? defaults?.packagingCost ?? null,
    shippingCost,
  };
}

export async function loadOnboarding(context: WorkspaceContext) {
  let snapshot = await getOnboardingSnapshot(context);
  if (!snapshot.state) {
    const completed: number[] = [];
    if (snapshot.connection?.status === "ACTIVE" && snapshot.importedListings > 0) completed.push(1);
    if (snapshot.businessProfile) completed.push(2);
    if (snapshot.costDefault) completed.push(3);
    if (snapshot.costDefault?.targetMarket && snapshot.costDefault.reportingCurrency) completed.push(4);
    const step = nextStep(completed);
    const syncStatus = snapshot.connection?.syncRuns[0]?.status ?? null;
    await createOnboardingState(context, {
      completedSteps: completed,
      currentStep: step,
      status: !snapshot.connection ? "WAITING_FOR_ETSY" : syncStatus === "QUEUED" || syncStatus === "RUNNING" ? "WAITING_FOR_SYNC" : "IN_PROGRESS",
      etsyConnectionStatus: snapshot.connection?.status,
      initialSyncStatus: syncStatus,
      businessProfileVersionId: snapshot.businessProfile?.id,
      costDefaultVersionId: snapshot.costDefault?.id,
      targetMarket: snapshot.costDefault?.targetMarket,
      reportingCurrency: snapshot.costDefault?.reportingCurrency,
    });
    await captureOnboardingEvent("onboarding_started", { step });
    snapshot = await getOnboardingSnapshot(context);
  }
  const shipping = snapshot.costDefault?.defaultShippingCost ?? null;
  const reportingCurrency = snapshot.costDefault?.reportingCurrency ?? snapshot.businessProfile?.reportingCurrency ?? "USD";
  const costCurrency = snapshot.costDefault?.costCurrency ?? "TRY";
  const rate = snapshot.exchangeRate;
  const shippingCurrency = snapshot.costDefault?.defaultShippingCurrency ?? costCurrency;
  const listingCurrencies = new Set(snapshot.products
    .map((product) => product.etsyListingLinks[0]?.listing?.priceCurrency)
    .filter((currency): currency is string => Boolean(currency)));
  const canConvert = (sourceCurrency: string) => sourceCurrency === reportingCurrency || Boolean(rate && (
    (rate.baseCurrency === sourceCurrency && rate.quoteCurrency === reportingCurrency)
    || (rate.quoteCurrency === sourceCurrency && rate.baseCurrency === reportingCurrency)
  ));
  const requiredCurrencies = new Set([costCurrency, shippingCurrency, ...listingCurrencies]);
  const completeness = workspaceCompleteness({
    importedListings: snapshot.importedListings,
    linkedProducts: snapshot.linkedProducts,
    products: snapshot.products.map((product) => productInput(product, shipping)),
    marketplaceFeesAvailable: snapshot.marketplaceFeesAvailable,
    destinationSelected: Boolean(snapshot.costDefault?.targetMarket),
    businessProfileSelected: Boolean(snapshot.businessProfile),
    exchangeRateAvailable: [...requiredCurrencies].every(canConvert),
  });
  const convertMoney = (value: Decimal.Value | null, sourceCurrency: string) => {
    if (value === null || value === undefined) return null;
    if (sourceCurrency === reportingCurrency) return new Decimal(value);
    if (!rate) return null;
    const amount = new Decimal(value);
    if (rate.baseCurrency === sourceCurrency && rate.quoteCurrency === reportingCurrency) return amount.mul(rate.rate);
    if (rate.quoteCurrency === sourceCurrency && rate.baseCurrency === reportingCurrency) return amount.div(rate.rate);
    return null;
  };
  const convertCost = (value: Decimal.Value | null) => convertMoney(value, costCurrency);
  const firstResult = calculateFirstResult(snapshot.products.map((product) => {
    const values = productInput(product, shipping);
    const listing = product.etsyListingLinks[0]?.listing;
    const revenue = listing ? convertMoney(listing.priceAmount, listing.priceCurrency) : null;
    return {
      revenue,
      fees: null,
      materialCost: convertCost(values.materialCost),
      laborHours: values.laborHours,
      laborRate: convertCost(values.laborRate),
      economicLaborRate: product.costVersions[0]?.economicHourlyRateTry ? convertCost(product.costVersions[0].economicHourlyRateTry) : null,
      packagingCost: convertCost(values.packagingCost),
      shippingCost: convertMoney(shipping, shippingCurrency),
      otherKnownCost: convertCost(snapshot.costDefault?.exportHandlingCost ?? null),
      revenueMissingReason: listing && !canConvert(listing.priceCurrency) ? "FX" as const : "REVENUE" as const,
    };
  }));
  const average = (values: Decimal.Value[]) => values.length
    ? values.reduce<Decimal>((sum, value) => sum.plus(value), new Decimal(0)).div(values.length).toDecimalPlaces(2).toString()
    : null;
  const customCosts = snapshot.products.flatMap((product) => product.costVersions);
  const suggestedCosts = {
    averageLaborHours: average(customCosts.map((cost) => cost.laborHours)),
    hourlyLaborValue: average(customCosts.map((cost) => cost.laborHourlyRateTry)),
    packagingCost: average(customCosts.map((cost) => cost.packagingCostTry)),
    materialWastagePercentage: average(customCosts.map((cost) => cost.wastageRate)),
  };
  return { ...snapshot, completeness, firstResult, reportingCurrency, suggestedCosts, affectedProductCount: await previewBulkDefaultApplication(context) };
}

async function advance(context: WorkspaceContext, completedStep: number, data: Record<string, unknown> = {}) {
  const snapshot = await getOnboardingSnapshot(context);
  if (!snapshot.state) throw new Error("Onboarding state is unavailable.");
  const completedSteps = uniqueSorted([...snapshot.state.completedSteps, completedStep]);
  return updateOnboardingState(context, { ...data, completedSteps, currentStep: nextStep(completedSteps), status: "IN_PROGRESS", lastActivityAt: new Date() });
}

export async function confirmEtsy(context: WorkspaceContext) {
  const snapshot = await getOnboardingSnapshot(context);
  const sync = snapshot.connection?.syncRuns[0];
  if (!snapshot.connection || snapshot.connection.status !== "ACTIVE" || snapshot.importedListings < 1) throw new Error("A completed Etsy import is required.");
  await advance(context, 1, { etsyConnectionStatus: snapshot.connection.status, initialSyncStatus: sync?.status ?? null });
  await captureOnboardingEvent("etsy_connect_completed", { importedProductCount: snapshot.importedListings });
}

export async function chooseBusiness(context: WorkspaceContext, input: { businessType: Parameters<typeof selectBusinessProfile>[1]["businessType"]; reportingCurrency: string }) {
  const profile = await selectBusinessProfile(context, { ...input, taxPlanningPreset: businessPresetFor(input.businessType) });
  await advance(context, 2, { businessProfileVersionId: profile.id, reportingCurrency: input.reportingCurrency });
  await captureOnboardingEvent("business_type_selected", { step: 2 });
  return profile;
}

export async function chooseCosts(context: WorkspaceContext, input: CostDefaultsInput) {
  const defaults = await saveCostDefaults(context, input);
  const applied = await applyDefaultsToMissingProducts(context, defaults.id);
  await advance(context, 3, { costDefaultVersionId: defaults.id });
  await captureOnboardingEvent("cost_defaults_applied", { step: 3, importedProductCount: applied });
  return { defaults, applied };
}

export async function chooseMarket(context: WorkspaceContext, input: Parameters<typeof saveMarketDefaults>[1]) {
  const updated = await saveMarketDefaults(context, input);
  if (updated.count !== 1) throw new Error("Cost defaults must be completed first.");
  await advance(context, 4, { targetMarket: input.targetMarket, reportingCurrency: input.reportingCurrency });
  await captureOnboardingEvent("target_market_selected", { step: 4 });
}

export async function completeOnboarding(context: WorkspaceContext) {
  const snapshot = await getOnboardingSnapshot(context);
  if (!snapshot.state || ![1, 2, 3, 4].every((step) => snapshot.state!.completedSteps.includes(step))) throw new Error("Required onboarding steps are incomplete.");
  if (!snapshot.connection || snapshot.importedListings < 1 || !snapshot.businessProfile || !snapshot.costDefault?.targetMarket) throw new Error("Minimum onboarding data is incomplete.");
  await recordLegalAcceptances(context, LEGAL_VERSIONS);
  const view = await loadOnboarding(context);
  await updateOnboardingState(context, {
    completedSteps: [1, 2, 3, 4, 5], currentStep: 5, status: "COMPLETED", completedAt: new Date(), lastActivityAt: new Date(), completenessSummary: view.completeness,
  });
  await captureOnboardingEvent("onboarding_completed", { step: 5, importedProductCount: snapshot.importedListings, missingFieldCount: view.completeness.blockingGaps.length, completionStatus: view.completeness.readiness });
}

export async function isOnboardingComplete(context: WorkspaceContext) {
  const snapshot = await getOnboardingSnapshot(context);
  return snapshot.state?.status === "COMPLETED";
}

export async function restartOnboarding(context: WorkspaceContext) {
  const snapshot = await getOnboardingSnapshot(context);
  if (snapshot.state?.status !== "COMPLETED") throw new Error("Completed onboarding is required.");
  const keepEtsy = Boolean(snapshot.connection && snapshot.importedListings > 0);
  await updateOnboardingState(context, {
    status: "IN_PROGRESS",
    currentStep: keepEtsy ? 2 : 1,
    completedSteps: keepEtsy ? [1] : [],
    completedAt: null,
    lastActivityAt: new Date(),
  });
}

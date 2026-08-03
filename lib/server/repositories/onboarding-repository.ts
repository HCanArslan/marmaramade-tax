import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function getOnboardingSnapshot(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  const workspaceId = context.workspaceId;
  const [state, connection, importedListings, linkedProducts, products, businessProfile, costDefault, feeProfile, exchangeRate] = await Promise.all([
    prisma.workspaceOnboarding.findUnique({ where: { workspaceId } }),
    prisma.etsyConnection.findFirst({
      where: { workspaceId, status: "ACTIVE", saasShop: { workspaceId, status: "ACTIVE" } },
      select: {
        id: true, status: true, shopName: true, shopCurrency: true, saasShopId: true,
        syncRuns: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, recordsRead: true, listingsImported: true } },
      },
    }),
    prisma.etsyListing.count({ where: { workspaceId } }),
    prisma.etsyListingProductLink.count({ where: { workspaceId } }),
    prisma.product.findMany({
      where: { workspaceId, active: true },
      select: {
        id: true, title: true,
        costVersions: { where: { effectiveTo: null }, orderBy: { effectiveFrom: "desc" }, take: 1 },
        onboardingDefaults: true,
        etsyListingLinks: { take: 1, select: { listing: { select: { priceAmount: true, priceCurrency: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceBusinessProfile.findUnique({
      where: { workspaceId },
      select: { versions: { where: { activeKey: "ACTIVE" }, take: 1 } },
    }),
    prisma.workspaceCostDefaultVersion.findFirst({ where: { workspaceId, activeKey: "ACTIVE" } }),
    prisma.feeProfile.findFirst({ where: { workspaceId, effectiveTo: null }, select: { id: true } }),
    prisma.exchangeRateSnapshot.findFirst({ where: { workspaceId }, orderBy: { capturedAt: "desc" } }),
  ]);
  return { state, connection, importedListings, linkedProducts, products, businessProfile: businessProfile?.versions[0] ?? null, costDefault, marketplaceFeesAvailable: Boolean(feeProfile), exchangeRate };
}

export async function createOnboardingState(context: WorkspaceContext, input: {
  completedSteps: number[];
  currentStep: number;
  status: "IN_PROGRESS" | "WAITING_FOR_ETSY" | "WAITING_FOR_SYNC" | "NEEDS_MINIMUM_COSTS";
  etsyConnectionStatus?: string | null;
  initialSyncStatus?: string | null;
  businessProfileVersionId?: string | null;
  costDefaultVersionId?: string | null;
  targetMarket?: string | null;
  reportingCurrency?: string | null;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceOnboarding.upsert({
    where: { workspaceId: context.workspaceId },
    create: { workspaceId: context.workspaceId, ...input, startedAt: new Date() },
    update: { lastActivityAt: new Date() },
  });
}

export async function updateOnboardingState(context: WorkspaceContext, data: Record<string, unknown>) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceOnboarding.update({ where: { workspaceId: context.workspaceId }, data });
}

export async function selectBusinessProfile(context: WorkspaceContext, input: {
  businessType: "NO_REGISTERED_BUSINESS" | "ARTISAN_EXEMPTION" | "SOLE_PROPRIETORSHIP" | "LIMITED_OR_CORPORATION" | "OTHER_OR_UNKNOWN";
  taxPlanningPreset: "NONE" | "CONSERVATIVE" | "STANDARD";
  reportingCurrency: string;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.workspaceBusinessProfile.upsert({
      where: { workspaceId: context.workspaceId },
      create: { workspaceId: context.workspaceId },
      update: {},
      include: { versions: { where: { activeKey: "ACTIVE" }, take: 1 } },
    });
    const active = profile.versions[0];
    if (active?.businessType === input.businessType && active.reportingCurrency === input.reportingCurrency) return active;
    const latest = await transaction.workspaceBusinessProfileVersion.findFirst({ where: { workspaceBusinessProfileId: profile.id }, orderBy: { versionNumber: "desc" } });
    const now = new Date();
    if (active) await transaction.workspaceBusinessProfileVersion.update({ where: { id: active.id }, data: { activeKey: null, effectiveTo: now } });
    return transaction.workspaceBusinessProfileVersion.create({
      data: {
        workspaceBusinessProfileId: profile.id,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        effectiveFrom: now,
        activeKey: "ACTIVE",
        sellerCountry: "TR",
        reportingCurrency: input.reportingCurrency,
        businessType: input.businessType,
        defaultMarketplaceCurrency: "USD",
        taxPlanningPreset: input.taxPlanningPreset,
        notes: "Planning assumption selected during onboarding; not legal or tax advice.",
      },
    });
  });
}

export type CostDefaultsInput = {
  averageLaborHours: string;
  hourlyLaborValue: string;
  packagingCost: string;
  materialWastagePercentage: string;
  exportHandlingCost: string;
  monthlyOverhead: string | null;
  currency: string;
};

export async function saveCostDefaults(context: WorkspaceContext, input: CostDefaultsInput) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const active = await transaction.workspaceCostDefaultVersion.findFirst({ where: { workspaceId: context.workspaceId, activeKey: "ACTIVE" } });
    const unchanged = active &&
      active.averageLaborHours?.toString() === input.averageLaborHours &&
      active.hourlyLabourValue.toString() === input.hourlyLaborValue &&
      active.packagingCost.toString() === input.packagingCost &&
      active.materialWastagePercentage.toString() === input.materialWastagePercentage &&
      active.exportHandlingCost.toString() === input.exportHandlingCost &&
      active.monthlyOverheadKnown === (input.monthlyOverhead !== null) &&
      (!active.monthlyOverheadKnown || active.monthlyOverhead.toString() === input.monthlyOverhead);
    if (unchanged) return active;
    const latest = await transaction.workspaceCostDefaultVersion.findFirst({ where: { workspaceId: context.workspaceId }, orderBy: { versionNumber: "desc" } });
    const now = new Date();
    if (active) await transaction.workspaceCostDefaultVersion.update({ where: { id: active.id }, data: { activeKey: null, effectiveTo: now } });
    return transaction.workspaceCostDefaultVersion.create({
      data: {
        workspaceId: context.workspaceId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        effectiveFrom: now,
        activeKey: "ACTIVE",
        averageLaborHours: input.averageLaborHours,
        hourlyLabourValue: input.hourlyLaborValue,
        packagingCost: input.packagingCost,
        materialWastagePercentage: input.materialWastagePercentage,
        exportHandlingCost: input.exportHandlingCost,
        monthlyOverhead: input.monthlyOverhead ?? "0",
        monthlyOverheadKnown: input.monthlyOverhead !== null,
        costCurrency: input.currency,
        sellerCountry: "TR",
        originCountry: "TR",
        reportingCurrency: input.currency,
        targetMarket: "US",
        sourceLabel: "MarmaraLedge onboarding planning defaults v1",
      },
    });
  });
}

export async function previewBulkDefaultApplication(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.product.count({
    where: { workspaceId: context.workspaceId, active: true, costVersions: { none: {} }, onboardingDefaults: null },
  });
}

export async function applyDefaultsToMissingProducts(context: WorkspaceContext, costDefaultVersionId: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const defaults = await transaction.workspaceCostDefaultVersion.findFirst({ where: { id: costDefaultVersionId, workspaceId: context.workspaceId } });
    if (!defaults) throw new Error("Cost defaults are unavailable.");
    const products = await transaction.product.findMany({
      where: { workspaceId: context.workspaceId, active: true, costVersions: { none: {} }, onboardingDefaults: null },
      select: { id: true },
    });
    if (products.length) await transaction.productCostDefaultApplication.createMany({
      data: products.map(({ id }) => ({
        workspaceId: context.workspaceId,
        productId: id,
        costDefaultVersionId: defaults.id,
        laborHours: defaults.averageLaborHours,
        hourlyLaborValue: defaults.hourlyLabourValue,
        packagingCost: defaults.packagingCost,
        materialWastage: defaults.materialWastagePercentage,
        exportHandlingCost: defaults.exportHandlingCost,
      })),
      skipDuplicates: true,
    });
    return products.length;
  });
}

export async function saveMarketDefaults(context: WorkspaceContext, input: {
  targetMarket: string;
  sellerCountry: string;
  originCountry: string;
  shippingCost: string | null;
  shippingCurrency: string;
  customsResponsibility: "SELLER" | "BUYER" | "UNKNOWN";
  reportingCurrency: string;
  marketplaceCurrency: string;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.workspaceCostDefaultVersion.updateMany({
    where: { workspaceId: context.workspaceId, activeKey: "ACTIVE" },
    data: {
      targetMarket: input.targetMarket,
      sellerCountry: input.sellerCountry,
      originCountry: input.originCountry,
      defaultShippingCost: input.shippingCost,
      defaultShippingCurrency: input.shippingCurrency,
      customsResponsibility: input.customsResponsibility,
      reportingCurrency: input.reportingCurrency,
      marketplaceCurrency: input.marketplaceCurrency,
    },
  });
}

export async function recordLegalAcceptances(context: WorkspaceContext, versions: { terms: string; privacy: string; estimates: string }) {
  await assertTrustedWorkspaceContext(context);
  await prisma.legalAcceptance.createMany({
    data: Object.entries(versions).map(([document, version]) => ({ userId: context.userId, workspaceId: context.workspaceId, document: document.toUpperCase(), version })),
    skipDuplicates: true,
  });
}

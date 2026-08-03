import "server-only";
import Decimal from "decimal.js";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext, RepositoryNotFoundError } from "./repository-context";

export async function getProfitabilityWorkspace(context: WorkspaceContext, destinationCountry?: string) {
  await assertTrustedWorkspaceContext(context);
  const now = new Date();
  const [products, costDefault, businessProfile, feeProfile, exchangeRates, shippingDefaults, connection, orders] = await Promise.all([
    prisma.product.findMany({
      where: { workspaceId: context.workspaceId, active: true },
      orderBy: { createdAt: "asc" },
      include: {
        costVersions: { where: { effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, orderBy: { effectiveFrom: "desc" }, take: 1 },
        onboardingDefaults: true,
        etsyListingLinks: { take: 1, include: { listing: { include: { images: { orderBy: { rank: "asc" }, take: 1 } } } } },
        shippingOverrides: { where: { activeKey: "ACTIVE", ...(destinationCountry ? { destinationCountry } : {}) }, orderBy: { effectiveFrom: "desc" } },
        profitSnapshots: { orderBy: { calculatedAt: "desc" }, take: 10 },
      },
    }),
    prisma.workspaceCostDefaultVersion.findFirst({ where: { workspaceId: context.workspaceId, activeKey: "ACTIVE" } }),
    prisma.workspaceBusinessProfileVersion.findFirst({ where: { profile: { workspaceId: context.workspaceId }, activeKey: "ACTIVE" } }),
    prisma.feeProfile.findFirst({ where: { workspaceId: context.workspaceId, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, include: { rules: true }, orderBy: { effectiveFrom: "desc" } }),
    prisma.exchangeRateSnapshot.findMany({ where: { workspaceId: context.workspaceId, capturedAt: { lte: now } }, orderBy: { capturedAt: "desc" }, take: 20 }),
    prisma.workspaceShippingDefaultVersion.findMany({ where: { workspaceId: context.workspaceId, activeKey: "ACTIVE", ...(destinationCountry ? { destinationCountry } : {}) }, orderBy: { effectiveFrom: "desc" } }),
    prisma.etsyConnection.findFirst({ where: { workspaceId: context.workspaceId, status: "ACTIVE" }, select: { status: true, shopName: true, shopCurrency: true, syncRuns: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, completedAt: true } } } }),
    prisma.order.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { orderDate: "desc" }, include: { items: { include: { product: { select: { title: true } } } }, snapshots: { orderBy: { calculatedAt: "desc" }, take: 1 } }, take: 100 }),
  ]);
  return { products, costDefault, businessProfile, feeProfile, exchangeRates, shippingDefaults, connection, orders };
}

export async function resolveActiveWorkspaceOwnerContext(workspaceId: string): Promise<WorkspaceContext> {
  const owner = await prisma.membership.findFirst({ where: { workspaceId, role: "OWNER", workspace: { status: "ACTIVE" } }, select: { userId: true } });
  if (!owner) throw new RepositoryNotFoundError();
  return { workspaceId, userId: owner.userId, role: "OWNER" };
}

export async function getOwnedProfitSnapshot(context: WorkspaceContext, snapshotId: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.productProfitSnapshot.findFirst({ where: { id: snapshotId, workspaceId: context.workspaceId } });
}

export async function createProductProfitSnapshot(context: WorkspaceContext, input: {
  calculationKey?: string;
  productId: string;
  listingId: string | null;
  destinationCountry: string;
  quantity: Decimal.Value;
  listingPrice: Decimal.Value;
  listingCurrency: string;
  reportingCurrency: string;
  status: "COMPLETE" | "ESTIMATED" | "INCOMPLETE" | "NEEDS_REVIEW";
  completenessScore: number;
  inputSnapshot: object;
  resultSnapshot: object;
  warnings: string[];
  references: { feeProfileId?: string | null; productCostVersionId?: string | null; costDefaultVersionId?: string | null; businessProfileVersionId?: string | null; exchangeRateSnapshotId?: string | null; shippingDefaultVersionId?: string | null; shippingOverrideVersionId?: string | null };
  totals?: { grossRevenue?: Decimal.Value | null; etsyFees?: Decimal.Value | null; productCashCost?: Decimal.Value | null; economicLabourCost?: Decimal.Value | null; shippingCost?: Decimal.Value | null; customsExposure?: Decimal.Value | null; preTaxCashProfit?: Decimal.Value | null; taxReserve?: Decimal.Value | null; finalCashProfit?: Decimal.Value | null; economicProfit?: Decimal.Value | null; cashMarginPercent?: Decimal.Value | null; economicMarginPercent?: Decimal.Value | null };
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    if (input.calculationKey) {
      const existing = await transaction.productProfitSnapshot.findUnique({ where: { calculationKey: input.calculationKey } });
      if (existing) {
        if (existing.workspaceId !== context.workspaceId || existing.productId !== input.productId) throw new RepositoryNotFoundError();
        return existing;
      }
    }
    const [product, listing, previous] = await Promise.all([
      transaction.product.findFirst({ where: { id: input.productId, workspaceId: context.workspaceId }, select: { id: true } }),
      input.listingId ? transaction.etsyListing.findFirst({ where: { id: input.listingId, workspaceId: context.workspaceId }, select: { id: true } }) : null,
      transaction.productProfitSnapshot.findFirst({ where: { productId: input.productId, workspaceId: context.workspaceId, destinationCountry: input.destinationCountry }, orderBy: { calculatedAt: "desc" }, select: { id: true } }),
    ]);
    if (!product || (input.listingId && !listing)) throw new RepositoryNotFoundError();
    return transaction.productProfitSnapshot.create({ data: {
      workspaceId: context.workspaceId,
      calculationKey: input.calculationKey,
      productId: product.id,
      listingId: listing?.id ?? null,
      destinationCountry: input.destinationCountry,
      quantity: new Decimal(input.quantity).toString(),
      listingPrice: new Decimal(input.listingPrice).toString(),
      listingCurrency: input.listingCurrency,
      reportingCurrency: input.reportingCurrency,
      status: input.status,
      completenessScore: input.completenessScore,
      inputSnapshot: input.inputSnapshot,
      resultSnapshot: input.resultSnapshot,
      warnings: input.warnings,
      supersedesSnapshotId: previous?.id,
      ...input.references,
      ...Object.fromEntries(Object.entries(input.totals ?? {}).map(([key, value]) => [key, value == null ? null : new Decimal(value).toString()])),
    } });
  });
}

export async function saveWorkspaceShippingDefault(context: WorkspaceContext, input: {
  destinationCountry: string; shippingCost: string | null; shippingCurrency: string; customsResponsibility: "SELLER" | "BUYER" | "UNKNOWN"; sellerPaidCustomsCost: string | null; customsCurrency: string | null; targetMarginPercent: string;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const active = await transaction.workspaceShippingDefaultVersion.findFirst({ where: { workspaceId: context.workspaceId, destinationCountry: input.destinationCountry, activeKey: "ACTIVE" } });
    const latest = await transaction.workspaceShippingDefaultVersion.findFirst({ where: { workspaceId: context.workspaceId, destinationCountry: input.destinationCountry }, orderBy: { versionNumber: "desc" } });
    const now = new Date();
    if (active) await transaction.workspaceShippingDefaultVersion.update({ where: { id: active.id }, data: { activeKey: null, effectiveTo: now } });
    return transaction.workspaceShippingDefaultVersion.create({ data: { ...input, workspaceId: context.workspaceId, versionNumber: (latest?.versionNumber ?? 0) + 1, effectiveFrom: now, activeKey: "ACTIVE" } });
  });
}

export async function saveProductShippingOverride(context: WorkspaceContext, input: {
  productId: string; destinationCountry: string; shippingCost: string | null; shippingCurrency: string; customsResponsibility: "SELLER" | "BUYER" | "UNKNOWN"; sellerPaidCustomsCost: string | null; customsCurrency: string | null;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findFirst({ where: { id: input.productId, workspaceId: context.workspaceId }, select: { id: true } });
    if (!product) throw new RepositoryNotFoundError();
    const active = await transaction.productShippingOverrideVersion.findFirst({ where: { productId: product.id, destinationCountry: input.destinationCountry, activeKey: "ACTIVE" } });
    const latest = await transaction.productShippingOverrideVersion.findFirst({ where: { productId: product.id, destinationCountry: input.destinationCountry }, orderBy: { versionNumber: "desc" } });
    const now = new Date();
    if (active) await transaction.productShippingOverrideVersion.update({ where: { id: active.id }, data: { activeKey: null, effectiveTo: now } });
    return transaction.productShippingOverrideVersion.create({ data: { ...input, productId: product.id, workspaceId: context.workspaceId, versionNumber: (latest?.versionNumber ?? 0) + 1, effectiveFrom: now, activeKey: "ACTIVE" } });
  });
}

export async function createProductCostVersion(context: WorkspaceContext, input: {
  productId: string; materialCost: string; labourHours: string; cashLabourRate: string; economicLabourRate: string | null; packagingCost: string; otherDirectCost: string; wastageRate: string;
}) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findFirst({ where: { id: input.productId, workspaceId: context.workspaceId }, select: { id: true } });
    if (!product) throw new RepositoryNotFoundError();
    const now = new Date();
    await transaction.productCostVersion.updateMany({ where: { productId: product.id, workspaceId: context.workspaceId, effectiveTo: null }, data: { effectiveTo: now } });
    return transaction.productCostVersion.create({ data: { workspaceId: context.workspaceId, productId: product.id, effectiveFrom: now, materialCostTry: input.materialCost, laborHours: input.labourHours, laborHourlyRateTry: input.cashLabourRate, economicHourlyRateTry: input.economicLabourRate, packagingCostTry: input.packagingCost, additionalDirectCostTry: input.otherDirectCost, wastageRate: input.wastageRate, changeReason: "PROMPT6_PRODUCT_EDIT" } });
  });
}

export async function createReportingCurrencyVersion(context: WorkspaceContext, reportingCurrency: string) {
  await assertTrustedWorkspaceContext(context);
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.workspaceBusinessProfile.findUnique({ where: { workspaceId: context.workspaceId }, include: { versions: { where: { activeKey: "ACTIVE" }, take: 1 } } });
    const active = profile?.versions[0];
    if (!profile || !active) throw new RepositoryNotFoundError();
    if (active.reportingCurrency === reportingCurrency) return active;
    const latest = await transaction.workspaceBusinessProfileVersion.findFirst({ where: { workspaceBusinessProfileId: profile.id }, orderBy: { versionNumber: "desc" } });
    const now = new Date();
    await transaction.workspaceBusinessProfileVersion.update({ where: { id: active.id }, data: { activeKey: null, effectiveTo: now } });
    return transaction.workspaceBusinessProfileVersion.create({ data: { workspaceBusinessProfileId: profile.id, versionNumber: (latest?.versionNumber ?? 0) + 1, effectiveFrom: now, activeKey: "ACTIVE", sellerCountry: active.sellerCountry, reportingCurrency, businessType: active.businessType, defaultMarketplaceCurrency: active.defaultMarketplaceCurrency, taxPlanningPreset: active.taxPlanningPreset, notes: "Reporting currency changed in profitability settings." } });
  });
}

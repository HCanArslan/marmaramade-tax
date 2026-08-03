import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/server/db/client";
import { createProduct, findProductById } from "@/lib/server/repositories/product-repository";
import { createShop, findEtsyListingByExternalId } from "@/lib/server/repositories/shop-repository";
import { findOrderById } from "@/lib/server/repositories/order-repository";
import { createPortfolioScenario, createPortfolioScenarioVersion, findPortfolioScenarioById } from "@/lib/server/repositories/scenario-repository";
import { RepositoryNotFoundError } from "@/lib/server/repositories/repository-context";
import { runLegacyWorkspaceBackfill } from "@/lib/server/repositories/legacy-backfill-repository";
import { findEffectiveBusinessProfileVersion, findEffectiveCostDefaults, resolveProductOrWorkspaceCost } from "@/lib/server/repositories/workspace-settings-repository";

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
let contextA: { userId: string; workspaceId: string; role: "OWNER" };
let contextB: { userId: string; workspaceId: string; role: "OWNER" };
let productA: { id: string };
let productB: { id: string };
let shopA: { id: string };
let shopB: { id: string };
let orderAId: string;
let orderBId: string;
let scenarioAId: string;
let scenarioVersionOneId: string;

beforeAll(async () => {
  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { name: "Workspace A owner", email: `a-${suffix}@example.test`, emailVerified: true } }),
    prisma.user.create({ data: { name: "Workspace B owner", email: `b-${suffix}@example.test`, emailVerified: true } }),
  ]);
  const [workspaceA, workspaceB] = await Promise.all([
    prisma.workspace.create({ data: { name: `A ${suffix}`, slug: `a-${suffix}` } }),
    prisma.workspace.create({ data: { name: `B ${suffix}`, slug: `b-${suffix}` } }),
  ]);
  await Promise.all([
    prisma.membership.create({ data: { userId: userA.id, workspaceId: workspaceA.id, role: "OWNER" } }),
    prisma.membership.create({ data: { userId: userB.id, workspaceId: workspaceB.id, role: "OWNER" } }),
  ]);
  contextA = { userId: userA.id, workspaceId: workspaceA.id, role: "OWNER" };
  contextB = { userId: userB.id, workspaceId: workspaceB.id, role: "OWNER" };
  productA = await createProduct(contextA, { sku: `SHARED-${suffix}`, title: "A product" });
  productB = await createProduct(contextB, { sku: `SHARED-${suffix}`, title: "B product" });
  shopA = await createShop(contextA, { platform: "ETSY", externalShopId: `etsy-a-${suffix}`, name: "A Etsy" });
  shopB = await createShop(contextB, { platform: "ETSY", externalShopId: `etsy-b-${suffix}`, name: "B Etsy" });
  const [connectionA, connectionB] = await Promise.all([
    prisma.etsyConnection.create({ data: { workspaceId: workspaceA.id, saasShopId: shopA.id, shopId: `etsy-a-${suffix}`, etsyUserId: `ua-${suffix}`, encryptedAccessToken: "test", encryptedRefreshToken: "test", accessTokenExpiresAt: new Date("2030-01-01"), scopes: "listings_r transactions_r" } }),
    prisma.etsyConnection.create({ data: { workspaceId: workspaceB.id, saasShopId: shopB.id, shopId: `etsy-b-${suffix}`, etsyUserId: `ub-${suffix}`, encryptedAccessToken: "test", encryptedRefreshToken: "test", accessTokenExpiresAt: new Date("2030-01-01"), scopes: "listings_r transactions_r" } }),
  ]);
  await Promise.all([
    prisma.etsyListing.create({ data: { workspaceId: workspaceA.id, shopId: shopA.id, connectionId: connectionA.id, etsyListingId: `same-listing-${suffix}`, title: "A listing", state: "active", priceAmount: "10", priceCurrency: "USD", quantity: 1, sourceHash: "a" } }),
    prisma.etsyListing.create({ data: { workspaceId: workspaceB.id, shopId: shopB.id, connectionId: connectionB.id, etsyListingId: `same-listing-${suffix}`, title: "B listing", state: "active", priceAmount: "11", priceCurrency: "USD", quantity: 1, sourceHash: "b" } }),
  ]);

  const business = await prisma.businessProfileVersion.create({ data: { name: `legacy-${suffix}`, effectiveFrom: new Date("2026-01-01"), businessStatus: "SOLE_PROPRIETORSHIP", vatIdSubmittedToEtsy: false, etsyVatTreatment: "MANUAL", sellerFeeVatRate: "0", accountantMonthlyTry: "0", socialSecurityMonthlyTry: "0", invoicingSoftwareMonthlyTry: "0", bankingMonthlyTry: "0", officeMonthlyTry: "0", otherMonthlyBusinessCostsTry: "0", expectedMonthlyOrders: 1, overheadAllocationMethod: "EXPECTED_SALES" } });
  const [feeA, feeB, rateA, rateB] = await Promise.all([
    prisma.feeProfile.create({ data: { workspaceId: workspaceA.id, marketplace: "ETSY", name: "A", country: "TR", effectiveFrom: new Date("2026-01-01"), listingCurrency: "USD", payoutCurrency: "TRY" } }),
    prisma.feeProfile.create({ data: { workspaceId: workspaceB.id, marketplace: "ETSY", name: "B", country: "TR", effectiveFrom: new Date("2026-01-01"), listingCurrency: "USD", payoutCurrency: "TRY" } }),
    prisma.exchangeRateSnapshot.create({ data: { workspaceId: workspaceA.id, baseCurrency: "USD", quoteCurrency: "TRY", rate: "40", source: "test", capturedAt: new Date("2026-01-01") } }),
    prisma.exchangeRateSnapshot.create({ data: { workspaceId: workspaceB.id, baseCurrency: "USD", quoteCurrency: "TRY", rate: "41", source: "test", capturedAt: new Date("2026-01-01") } }),
  ]);
  const [orderA, orderB] = await Promise.all([
    prisma.order.create({ data: { workspaceId: workspaceA.id, shopId: shopA.id, orderNumber: `ORDER-${suffix}`, orderDate: new Date("2026-02-01"), marketplace: "ETSY", destinationCountry: "US", currency: "USD", orderStatus: "PAID", businessProfileVersionId: business.id, feeProfileId: feeA.id, exchangeRateSnapshotId: rateA.id } }),
    prisma.order.create({ data: { workspaceId: workspaceB.id, shopId: shopB.id, orderNumber: `ORDER-${suffix}`, orderDate: new Date("2026-02-01"), marketplace: "ETSY", destinationCountry: "US", currency: "USD", orderStatus: "PAID", businessProfileVersionId: business.id, feeProfileId: feeB.id, exchangeRateSnapshotId: rateB.id } }),
  ]);
  orderAId = orderA.id;
  orderBId = orderB.id;
  await prisma.orderCostSnapshot.create({ data: { workspaceId: workspaceA.id, orderId: orderA.id, businessProfileVersionId: business.id, feeProfileId: feeA.id, exchangeRateSnapshotId: rateA.id, grossRevenueUsd: "100.25", totalCostUsd: "40.5", totalCostTry: "1620", estimatedProfitUsd: "59.75", estimatedProfitTry: "2390", assumptionsJson: "{\"fixture\":true}", lines: { create: { workspaceId: workspaceA.id, formulaName: "fixture", category: "TEST", sourceAmount: "100.25", sourceCurrency: "USD", convertedAmountUsd: "100.25", convertedAmountTry: "4010", exchangeRateUsed: "40" } } } });
  scenarioAId = (await createPortfolioScenario(contextA, "100 products to USA")).id;
  const scenarioVersionOne = await createPortfolioScenarioVersion(contextA, { scenarioId: scenarioAId, versionNumber: 1, targetDestinationCountry: "US", customsPayer: "SELLER", shippingMode: "PER_ITEM", reportingCurrency: "TRY", items: [{ productId: productA.id, quantity: 100 }] });
  scenarioVersionOneId = scenarioVersionOne.id;
  await prisma.portfolioScenarioVersion.update({ where: { id: scenarioVersionOneId }, data: { status: "CALCULATED", calculatedAt: new Date("2026-08-01") } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("database-backed tenant repositories", () => {
  it("isolates products, orders, and scenarios with indistinguishable not-found behavior", async () => {
    await expect(findProductById(contextB, productA.id)).resolves.toBeNull();
    await expect(findOrderById(contextB, orderAId)).resolves.toBeNull();
    await expect(findOrderById(contextA, orderBId)).resolves.toBeNull();
    await expect(findPortfolioScenarioById(contextB, scenarioAId)).resolves.toBeNull();
  });

  it("rejects a forged workspace context through membership validation", async () => {
    await expect(findProductById({ ...contextA, workspaceId: contextB.workspaceId }, productB.id)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("allows the same SKU across workspaces and rejects it within one workspace", async () => {
    expect(productA.id).not.toBe(productB.id);
    await expect(createProduct(contextA, { sku: `SHARED-${suffix}`, title: "duplicate" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("scopes the same Etsy external listing ID by shop", async () => {
    const [listingA, listingB] = await Promise.all([
      findEtsyListingByExternalId(contextA, shopA.id, `same-listing-${suffix}`),
      findEtsyListingByExternalId(contextB, shopB.id, `same-listing-${suffix}`),
    ]);
    expect(listingA?.title).toBe("A listing");
    expect(listingB?.title).toBe("B listing");
    await expect(findEtsyListingByExternalId(contextA, shopB.id, `same-listing-${suffix}`)).resolves.toBeNull();
  });
});

describe("effective-dated profiles and immutable scenarios", () => {
  it("does not apply a future profile or cost-default version early", async () => {
    const profile = await prisma.workspaceBusinessProfile.create({ data: { workspaceId: contextA.workspaceId } });
    await prisma.workspaceBusinessProfileVersion.createMany({ data: [
      { workspaceBusinessProfileId: profile.id, versionNumber: 1, effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2027-01-01"), sellerCountry: "TR", reportingCurrency: "TRY", businessType: "OTHER_OR_UNKNOWN", defaultMarketplaceCurrency: "USD" },
      { workspaceBusinessProfileId: profile.id, versionNumber: 2, effectiveFrom: new Date("2027-01-01"), activeKey: "ACTIVE", sellerCountry: "TR", reportingCurrency: "EUR", businessType: "SOLE_PROPRIETORSHIP", defaultMarketplaceCurrency: "EUR" },
    ] });
    await prisma.workspaceCostDefaultVersion.createMany({ data: [
      { workspaceId: contextA.workspaceId, versionNumber: 1, effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2027-01-01"), costCurrency: "TRY", sellerCountry: "TR", originCountry: "TR", reportingCurrency: "TRY", targetMarket: "US", packagingCost: "25" },
      { workspaceId: contextA.workspaceId, versionNumber: 2, effectiveFrom: new Date("2027-01-01"), activeKey: "ACTIVE", costCurrency: "EUR", sellerCountry: "TR", originCountry: "TR", reportingCurrency: "EUR", targetMarket: "DE", packagingCost: "30" },
    ] });
    expect((await findEffectiveBusinessProfileVersion(contextA, new Date("2026-08-01")))?.businessType).toBe("OTHER_OR_UNKNOWN");
    expect((await findEffectiveCostDefaults(contextA, new Date("2026-08-01")))?.packagingCost.toString()).toBe("25");
    expect(resolveProductOrWorkspaceCost("12", "25")).toMatchObject({ source: "PRODUCT_SPECIFIC" });
    expect(resolveProductOrWorkspaceCost(null, "25")).toMatchObject({ source: "WORKSPACE_DEFAULT" });
  });

  it("creates recalculation as a new version without changing version one", async () => {
    const before = await findPortfolioScenarioById(contextA, scenarioAId);
    await createPortfolioScenarioVersion(contextA, { scenarioId: scenarioAId, versionNumber: 2, targetDestinationCountry: "US", customsPayer: "BUYER", shippingMode: "CONSOLIDATED", reportingCurrency: "TRY", items: [{ productId: productA.id, quantity: 100 }] });
    const after = await findPortfolioScenarioById(contextA, scenarioAId);
    expect(before?.versions[0].customsPayer).toBe("SELLER");
    expect(after?.versions.map((version) => version.versionNumber).sort()).toEqual([1, 2]);
    expect(after?.versions.find((version) => version.versionNumber === 1)?.customsPayer).toBe("SELLER");
    await expect(prisma.portfolioScenarioVersion.update({ where: { id: scenarioVersionOneId }, data: { customsPayer: "BUYER" } })).rejects.toThrow("immutable");
  });
});

describe("idempotent founder backfill", () => {
  it("assigns safe records once, preserves counts/Decimals, and reports unknown rows", async () => {
    await prisma.legacyWorkspaceAssignment.create({ data: { sourceKey: "MARMARAMADE_LEDGER", workspaceId: contextA.workspaceId } });
    const legacy = await prisma.product.create({ data: { sku: `LEGACY-${suffix}`, title: "Legacy unowned" } });
    await prisma.etsyImportMapping.create({ data: { originalType: `unknown-${suffix}`, mappedCategory: "UNKNOWN", confidence: "0" } });
    const first = await runLegacyWorkspaceBackfill();
    const second = await runLegacyWorkspaceBackfill();
    expect((await prisma.product.findUnique({ where: { id: legacy.id } }))?.workspaceId).toBe(contextA.workspaceId);
    expect(first.beforeCounts).toEqual(first.afterCounts);
    expect(second.beforeCounts).toEqual(second.afterCounts);
    expect(first.snapshotUnchanged).toBe(true);
    expect(second.snapshotUnchanged).toBe(true);
    expect(second.unassigned.importMappings).toBeGreaterThanOrEqual(1);
  });
});

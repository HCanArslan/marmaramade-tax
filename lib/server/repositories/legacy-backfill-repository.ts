import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/server/db/client";

const assignmentKey = "MARMARAMADE_LEDGER";

async function snapshotFingerprint(database = prisma) {
  const [snapshots, lines] = await Promise.all([
    database.orderCostSnapshot.findMany({
      select: { id: true, grossRevenueUsd: true, totalCostUsd: true, totalCostTry: true, estimatedProfitUsd: true, estimatedProfitTry: true, assumptionsJson: true },
      orderBy: { id: "asc" },
    }),
    database.orderCostLine.findMany({
      select: { id: true, sourceAmount: true, sourceCurrency: true, convertedAmountUsd: true, convertedAmountTry: true, exchangeRateUsed: true },
      orderBy: { id: "asc" },
    }),
  ]);
  return createHash("sha256").update(JSON.stringify({ snapshots, lines })).digest("hex");
}

export async function runLegacyWorkspaceBackfill(database = prisma) {
  const assignments = await database.legacyWorkspaceAssignment.findMany({
    where: { sourceKey: assignmentKey },
    select: { workspaceId: true },
  });
  if (assignments.length !== 1) {
    throw new Error("Legacy workspace assignment must resolve exactly once.");
  }
  const workspaceId = assignments[0].workspaceId;
  const beforeFingerprint = await snapshotFingerprint(database);
  const beforeCounts = {
    products: await database.product.count(),
    listings: await database.etsyListing.count(),
    snapshots: await database.orderCostSnapshot.count(),
  };

  await database.$transaction(async (tx) => {
    await Promise.all([
      tx.product.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.productCostVersion.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.productMaterialCost.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.packageProfile.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.feeProfile.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.exchangeRateSnapshot.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.order.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.orderItem.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.orderCostSnapshot.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.orderCostLine.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.orderAdjustment.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.scenario.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
      tx.etsyOAuthState.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    ]);

    const connections = await tx.etsyConnection.findMany({
      where: { OR: [{ workspaceId: null }, { saasShopId: null }] },
    });
    for (const connection of connections) {
      const shop = await tx.shop.upsert({
        where: { workspaceId_platform_externalShopId: { workspaceId, platform: "ETSY", externalShopId: connection.shopId } },
        update: {},
        create: { workspaceId, platform: "ETSY", externalShopId: connection.shopId, name: connection.shopName || "Etsy shop", status: connection.status, defaultCurrency: connection.shopCurrency },
      });
      await tx.etsyConnection.update({ where: { id: connection.id }, data: { workspaceId, saasShopId: shop.id } });
      await Promise.all([
        tx.etsySyncRun.updateMany({ where: { connectionId: connection.id, workspaceId: null }, data: { workspaceId, shopId: shop.id } }),
        tx.etsyListing.updateMany({ where: { connectionId: connection.id, workspaceId: null }, data: { workspaceId, shopId: shop.id } }),
        tx.etsyReceipt.updateMany({ where: { connectionId: connection.id, workspaceId: null }, data: { workspaceId, shopId: shop.id } }),
        tx.etsyPayment.updateMany({ where: { connectionId: connection.id, workspaceId: null }, data: { workspaceId, shopId: shop.id } }),
        tx.etsyLedgerEntry.updateMany({ where: { connectionId: connection.id, workspaceId: null }, data: { workspaceId, shopId: shop.id } }),
      ]);
    }
  });

  const afterCounts = {
    products: await database.product.count(),
    listings: await database.etsyListing.count(),
    snapshots: await database.orderCostSnapshot.count(),
  };
  const afterFingerprint = await snapshotFingerprint(database);
  return {
    workspaceId,
    beforeCounts,
    afterCounts,
    snapshotUnchanged: beforeFingerprint === afterFingerprint,
    unassigned: {
      products: await database.product.count({ where: { workspaceId: null } }),
      listings: await database.etsyListing.count({ where: { workspaceId: null } }),
      oauthStates: await database.etsyOAuthState.count({ where: { workspaceId: null } }),
      importMappings: await database.etsyImportMapping.count({ where: { workspaceId: null } }),
    },
  };
}

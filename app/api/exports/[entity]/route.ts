import { NextResponse } from "next/server";
import {
  requireAdminApi,
  AdminAuthorizationError,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import {
  InvalidExportDateRangeError,
  parseExportDateRange,
} from "@/lib/export-date-range";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    const session = await requireAdminApi();
    const { entity } = await params;
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const range = parseExportDateRange(from, to);
    let headers: string[];
    let rows: Record<string, unknown>[];
    switch (entity) {
      case "products": {
        const data = await prisma.product.findMany({ orderBy: { sku: "asc" } });
        headers = ["sku", "title", "material", "hsCode", "active"];
        rows = data.map((x) => ({
          sku: x.sku,
          title: x.title,
          material: x.material,
          hsCode: x.hsCode,
          active: x.active,
        }));
        break;
      }
      case "product-costs": {
        const data = await prisma.productCostVersion.findMany({
          include: { product: true },
          orderBy: { effectiveFrom: "desc" },
        });
        headers = [
          "sku",
          "effectiveFrom",
          "materialCostTry",
          "laborHours",
          "laborHourlyRateTry",
          "packagingCostTry",
          "additionalDirectCostTry",
        ];
        rows = data.map((x) => ({
          sku: x.product.sku,
          effectiveFrom: x.effectiveFrom.toISOString(),
          materialCostTry: x.materialCostTry,
          laborHours: x.laborHours,
          laborHourlyRateTry: x.laborHourlyRateTry,
          packagingCostTry: x.packagingCostTry,
          additionalDirectCostTry: x.additionalDirectCostTry,
        }));
        break;
      }
      case "orders": {
        const data = await prisma.order.findMany({
          where: { orderDate: range },
          include: {
            snapshots: { orderBy: { calculatedAt: "desc" }, take: 1 },
          },
        });
        headers = [
          "orderNumber",
          "orderDate",
          "status",
          "destinationCountry",
          "currency",
          "confirmedAt",
          "realisticEstimatedProfitUsd",
          "complianceComplete",
        ];
        rows = data.map((x) => ({
          orderNumber: x.orderNumber,
          orderDate: x.orderDate.toISOString(),
          status: x.orderStatus,
          destinationCountry: x.destinationCountry,
          currency: x.currency,
          confirmedAt: x.confirmedAt?.toISOString(),
          realisticEstimatedProfitUsd: x.snapshots[0]?.estimatedProfitUsd,
          complianceComplete: x.complianceComplete,
        }));
        break;
      }
      case "shipping-quotes": {
        const data = await prisma.shippingQuote.findMany({
          orderBy: { quoteDate: "desc" },
        });
        headers = [
          "carrier",
          "serviceName",
          "destinationCountry",
          "incoterm",
          "billableWeightKg",
          "shippingCost",
          "shippingCurrency",
          "quoteDate",
          "expirationDate",
        ];
        rows = data.map((x) => ({
          carrier: x.carrier,
          serviceName: x.serviceName,
          destinationCountry: x.destinationCountry,
          incoterm: x.incoterm,
          billableWeightKg: x.billableWeightKg,
          shippingCost: x.shippingCost,
          shippingCurrency: x.shippingCurrency,
          quoteDate: x.quoteDate.toISOString(),
          expirationDate: x.expirationDate?.toISOString(),
        }));
        break;
      }
      case "customs-quotes": {
        const data = await prisma.customsQuote.findMany({
          orderBy: { quoteDate: "desc" },
        });
        headers = [
          "destinationCountry",
          "hsCode",
          "productMaterial",
          "declaredValue",
          "currency",
          "dutyRate",
          "additionalTariffRate",
          "quoteDate",
          "expirationDate",
        ];
        rows = data.map((x) => ({
          destinationCountry: x.destinationCountry,
          hsCode: x.hsCode,
          productMaterial: x.productMaterial,
          declaredValue: x.declaredValue,
          currency: x.declaredValueCurrency,
          dutyRate: x.customsDutyRate,
          additionalTariffRate: x.additionalTariffRate,
          quoteDate: x.quoteDate.toISOString(),
          expirationDate: x.expirationDate?.toISOString(),
        }));
        break;
      }
      case "legal-profiles": {
        const data = await prisma.legalOperatingProfile.findMany({
          orderBy: { effectiveFrom: "desc" },
        });
        headers = [
          "name",
          "effectiveFrom",
          "effectiveTo",
          "operatingMode",
          "legalSellerName",
          "makerName",
          "businessStatus",
        ];
        rows = data.map((x) => ({
          name: x.name,
          effectiveFrom: x.effectiveFrom.toISOString(),
          effectiveTo: x.effectiveTo?.toISOString(),
          operatingMode: x.operatingMode,
          legalSellerName: x.legalSellerName,
          makerName: x.makerName,
          businessStatus: x.businessStatus,
        }));
        break;
      }
      case "documents": {
        const data = await prisma.storedDocument.findMany({
          where: { deletedAt: null },
          orderBy: { uploadedAt: "desc" },
        });
        headers = [
          "originalFilename",
          "mimeType",
          "sizeBytes",
          "checksumSha256",
          "category",
          "status",
          "uploadedAt",
          "verifiedAt",
        ];
        rows = data.map((x) => ({
          originalFilename: x.originalFilename,
          mimeType: x.mimeType,
          sizeBytes: x.sizeBytes,
          checksumSha256: x.checksumSha256,
          category: x.category,
          status: x.status,
          uploadedAt: x.uploadedAt.toISOString(),
          verifiedAt: x.verifiedAt?.toISOString(),
        }));
        break;
      }
      case "compliance-cases": {
        const data = await prisma.complianceCase.findMany({
          orderBy: { openedAt: "desc" },
        });
        headers = [
          "title",
          "institution",
          "topic",
          "status",
          "openedAt",
          "referenceNumber",
          "resolvedAt",
        ];
        rows = data.map((x) => ({
          title: x.title,
          institution: x.institution,
          topic: x.topic,
          status: x.status,
          openedAt: x.openedAt.toISOString(),
          referenceNumber: x.referenceNumber,
          resolvedAt: x.resolvedAt?.toISOString(),
        }));
        break;
      }
      case "goals": {
        const data = await prisma.profitGoal.findMany({
          orderBy: { startDate: "desc" },
        });
        headers = [
          "name",
          "startDate",
          "endDate",
          "targetProfitAmount",
          "targetProfitCurrency",
          "profitMetric",
          "planningMode",
        ];
        rows = data.map((x) => ({
          name: x.name,
          startDate: x.startDate.toISOString(),
          endDate: x.endDate.toISOString(),
          targetProfitAmount: x.targetProfitAmount,
          targetProfitCurrency: x.targetProfitCurrency,
          profitMetric: x.profitMetric,
          planningMode: x.planningMode,
        }));
        break;
      }
      case "bank-accounts": {
        const data = await prisma.bankAccount.findMany({
          orderBy: { createdAt: "desc" },
        });
        headers = [
          "bankName",
          "accountName",
          "ibanMasked",
          "accountNumberMasked",
          "currency",
          "accountType",
          "businessDedicated",
          "active",
        ];
        rows = data.map((x) => ({
          bankName: x.bankName,
          accountName: x.accountName,
          ibanMasked: x.ibanMasked,
          accountNumberMasked: x.accountNumberMasked,
          currency: x.currency,
          accountType: x.accountType,
          businessDedicated: x.businessDedicated,
          active: x.active,
        }));
        break;
      }
      case "owner-transactions": {
        const data = await prisma.ownerTransaction.findMany({
          orderBy: { transactionDate: "desc" },
        });
        headers = [
          "transactionDate",
          "type",
          "amount",
          "currency",
          "description",
        ];
        rows = data.map((x) => ({
          transactionDate: x.transactionDate.toISOString(),
          type: x.type,
          amount: x.amount,
          currency: x.currency,
          description: x.description,
        }));
        break;
      }
      case "expenses": {
        const data = await prisma.expense.findMany({
          where: { deletedAt: null },
          orderBy: { expenseDate: "desc" },
        });
        headers = [
          "expenseDate",
          "supplierName",
          "description",
          "category",
          "netAmount",
          "vatAmount",
          "grossAmount",
          "currency",
          "grossAmountTry",
          "paymentStatus",
          "deductibilityStatus",
          "vatDeductibilityStatus",
          "accountantReviewStatus",
        ];
        rows = data.map((x) => ({
          expenseDate: x.expenseDate.toISOString(),
          supplierName: x.supplierName,
          description: x.description,
          category: x.category,
          netAmount: x.netAmount,
          vatAmount: x.vatAmount,
          grossAmount: x.grossAmount,
          currency: x.currency,
          grossAmountTry: x.grossAmountTry,
          paymentStatus: x.paymentStatus,
          deductibilityStatus: x.deductibilityStatus,
          vatDeductibilityStatus: x.vatDeductibilityStatus,
          accountantReviewStatus: x.accountantReviewStatus,
        }));
        break;
      }
      case "recurring-expenses": {
        const data = await prisma.recurringExpense.findMany({
          orderBy: { createdAt: "desc" },
        });
        headers = [
          "name",
          "category",
          "expectedAmount",
          "currency",
          "recurrenceRule",
          "nextDueAt",
          "active",
          "deductibilityStatus",
        ];
        rows = data.map((x) => ({
          name: x.name,
          category: x.category,
          expectedAmount: x.expectedAmount,
          currency: x.currency,
          recurrenceRule: x.recurrenceRule,
          nextDueAt: x.nextDueAt?.toISOString(),
          active: x.active,
          deductibilityStatus: x.deductibilityStatus,
        }));
        break;
      }
      case "fixed-assets": {
        const data = await prisma.fixedAsset.findMany({
          orderBy: { acquisitionDate: "desc" },
        });
        headers = [
          "name",
          "category",
          "acquisitionDate",
          "acquisitionCost",
          "currency",
          "acquisitionCostTry",
          "carryingValue",
          "accountantReviewStatus",
        ];
        rows = data.map((x) => ({
          name: x.name,
          category: x.category,
          acquisitionDate: x.acquisitionDate.toISOString(),
          acquisitionCost: x.acquisitionCost,
          currency: x.currency,
          acquisitionCostTry: x.acquisitionCostTry,
          carryingValue: x.carryingValue,
          accountantReviewStatus: x.accountantReviewStatus,
        }));
        break;
      }
      case "materials": {
        const data = await prisma.material.findMany({
          orderBy: { sku: "asc" },
        });
        headers = ["sku", "name", "unit", "reorderPoint", "active"];
        rows = data.map((x) => ({
          sku: x.sku,
          name: x.name,
          unit: x.unit,
          reorderPoint: x.reorderPoint,
          active: x.active,
        }));
        break;
      }
      case "material-inventory": {
        const data = await prisma.materialInventoryTransaction.findMany({
          include: { material: true },
          orderBy: { transactionAt: "desc" },
        });
        headers = [
          "sku",
          "transactionAt",
          "type",
          "quantity",
          "referenceType",
          "referenceId",
        ];
        rows = data.map((x) => ({
          sku: x.material.sku,
          transactionAt: x.transactionAt.toISOString(),
          type: x.type,
          quantity: x.quantity,
          referenceType: x.referenceType,
          referenceId: x.referenceId,
        }));
        break;
      }
      case "production-batches": {
        const data = await prisma.productionBatch.findMany({
          orderBy: { startDate: "desc" },
        });
        headers = [
          "batchCode",
          "productTemplateId",
          "makerPersonId",
          "startDate",
          "completionDate",
          "status",
          "plannedQuantity",
          "completedQuantity",
          "rejectedQuantity",
          "totalLaborHours",
        ];
        rows = data.map((x) => ({
          batchCode: x.batchCode,
          productTemplateId: x.productTemplateId,
          makerPersonId: x.makerPersonId,
          startDate: x.startDate.toISOString(),
          completionDate: x.completionDate?.toISOString(),
          status: x.status,
          plannedQuantity: x.plannedQuantity,
          completedQuantity: x.completedQuantity,
          rejectedQuantity: x.rejectedQuantity,
          totalLaborHours: x.totalLaborHours,
        }));
        break;
      }
      case "finished-inventory": {
        const data = await prisma.productionUnit.findMany({
          orderBy: { createdAt: "desc" },
        });
        headers = [
          "localSku",
          "serialNumber",
          "oneOfOne",
          "completedAt",
          "qualityStatus",
          "inventoryStatus",
          "etsyListingId",
        ];
        rows = data.map((x) => ({
          localSku: x.localSku,
          serialNumber: x.serialNumber,
          oneOfOne: x.oneOfOne,
          completedAt: x.completedAt?.toISOString(),
          qualityStatus: x.qualityStatus,
          inventoryStatus: x.inventoryStatus,
          etsyListingId: x.etsyListingId,
        }));
        break;
      }
      case "etsy-listings": {
        const data = await prisma.etsyListing.findMany({
          orderBy: { lastImportedAt: "desc" },
        });
        headers = [
          "etsyListingId",
          "title",
          "state",
          "sku",
          "priceAmount",
          "priceCurrency",
          "quantity",
          "sourceUpdatedAt",
        ];
        rows = data.map((x) => ({
          etsyListingId: x.etsyListingId,
          title: x.title,
          state: x.state,
          sku: x.sku,
          priceAmount: x.priceAmount,
          priceCurrency: x.priceCurrency,
          quantity: x.quantity,
          sourceUpdatedAt: x.sourceUpdatedAt?.toISOString(),
        }));
        break;
      }
      case "etsy-receipts": {
        const data = await prisma.etsyReceipt.findMany({
          orderBy: { sourceCreatedAt: "desc" },
        });
        headers = [
          "etsyReceiptId",
          "paymentStatus",
          "shipmentStatus",
          "sourceCreatedAt",
          "totalAmount",
          "currency",
          "paidAt",
          "shippedAt",
          "localOrderId",
        ];
        rows = data.map((x) => ({
          etsyReceiptId: x.etsyReceiptId,
          paymentStatus: x.paymentStatus,
          shipmentStatus: x.shipmentStatus,
          sourceCreatedAt: x.sourceCreatedAt.toISOString(),
          totalAmount: x.totalAmount,
          currency: x.currency,
          paidAt: x.paidAt?.toISOString(),
          shippedAt: x.shippedAt?.toISOString(),
          localOrderId: x.localOrderId,
        }));
        break;
      }
      case "etsy-payments": {
        const data = await prisma.etsyPayment.findMany({
          orderBy: { paidAt: "desc" },
        });
        headers = [
          "etsyPaymentId",
          "etsyReceiptId",
          "amount",
          "currency",
          "paidAt",
        ];
        rows = data.map((x) => ({
          etsyPaymentId: x.etsyPaymentId,
          etsyReceiptId: x.etsyReceiptId,
          amount: x.amount,
          currency: x.currency,
          paidAt: x.paidAt?.toISOString(),
        }));
        break;
      }
      case "etsy-ledger": {
        const data = await prisma.etsyLedgerEntry.findMany({
          orderBy: { sourceCreatedAt: "desc" },
        });
        headers = [
          "etsyLedgerEntryId",
          "entryType",
          "mappedCategory",
          "mappingConfidence",
          "manualReview",
          "reviewStatus",
          "amount",
          "currency",
          "sourceCreatedAt",
        ];
        rows = data.map((x) => ({
          etsyLedgerEntryId: x.etsyLedgerEntryId,
          entryType: x.entryType,
          mappedCategory: x.mappedCategory,
          mappingConfidence: x.mappingConfidence,
          manualReview: x.manualReview,
          reviewStatus: x.reviewStatus,
          amount: x.amount,
          currency: x.currency,
          sourceCreatedAt: x.sourceCreatedAt.toISOString(),
        }));
        break;
      }
      case "etsy-payouts": {
        const data = await prisma.etsyPayout.findMany({
          orderBy: { payoutDate: "desc" },
        });
        headers = [
          "etsyPayoutId",
          "payoutDate",
          "amount",
          "currency",
          "status",
          "bankReference",
        ];
        rows = data.map((x) => ({
          etsyPayoutId: x.etsyPayoutId,
          payoutDate: x.payoutDate.toISOString(),
          amount: x.amount,
          currency: x.currency,
          status: x.status,
          bankReference: x.bankReference,
        }));
        break;
      }
      case "shipentegra-quotes": {
        const data = await prisma.shipEntegraQuote.findMany({
          orderBy: { quotedAt: "desc" },
        });
        headers = [
          "localOrderId",
          "originCountry",
          "destinationCountry",
          "carrier",
          "serviceCode",
          "serviceName",
          "incoterm",
          "estimatedPrice",
          "currency",
          "fuelCost",
          "additionalFee",
          "quotedAt",
          "expiresAt",
          "source",
        ];
        rows = data.map((x) => ({
          localOrderId: x.localOrderId,
          originCountry: x.originCountry,
          destinationCountry: x.destinationCountry,
          carrier: x.carrier,
          serviceCode: x.serviceCode,
          serviceName: x.serviceName,
          incoterm: x.incoterm,
          estimatedPrice: x.estimatedPrice,
          currency: x.currency,
          fuelCost: x.fuelCost,
          additionalFee: x.additionalFee,
          quotedAt: x.quotedAt.toISOString(),
          expiresAt: x.expiresAt?.toISOString(),
          source: x.source,
        }));
        break;
      }
      case "shipments": {
        const data = await prisma.shipEntegraShipment.findMany({
          orderBy: { createdAt: "desc" },
        });
        headers = [
          "localOrderId",
          "externalShipmentId",
          "externalOrderReference",
          "carrier",
          "serviceCode",
          "serviceName",
          "incoterm",
          "shipmentStatus",
          "trackingNumber",
          "estimatedCost",
          "creationCost",
          "actualCost",
          "currency",
          "lastSyncedAt",
          "deliveredAt",
        ];
        rows = data.map((x) => ({
          localOrderId: x.localOrderId,
          externalShipmentId: x.externalShipmentId,
          externalOrderReference: x.externalOrderReference,
          carrier: x.carrier,
          serviceCode: x.serviceCode,
          serviceName: x.serviceName,
          incoterm: x.incoterm,
          shipmentStatus: x.shipmentStatus,
          trackingNumber: x.trackingNumber,
          estimatedCost: x.estimatedCost,
          creationCost: x.creationCost,
          actualCost: x.actualCost,
          currency: x.currency,
          lastSyncedAt: x.lastSyncedAt?.toISOString(),
          deliveredAt: x.deliveredAt?.toISOString(),
        }));
        break;
      }
      case "tracking": {
        const data = await prisma.shipEntegraTrackingEvent.findMany({
          orderBy: { eventTime: "desc" },
        });
        headers = [
          "shipmentId",
          "externalEventId",
          "statusCode",
          "statusLabel",
          "description",
          "eventLocation",
          "eventTime",
        ];
        rows = data.map((x) => ({
          shipmentId: x.shipmentId,
          externalEventId: x.externalEventId,
          statusCode: x.statusCode,
          statusLabel: x.statusLabel,
          description: x.description,
          eventLocation: x.eventLocation,
          eventTime: x.eventTime.toISOString(),
        }));
        break;
      }
      case "customs-profiles": {
        const data = await prisma.customsProfile.findMany({
          orderBy: { effectiveFrom: "desc" },
        });
        headers = [
          "name",
          "originCountry",
          "destinationCountry",
          "incoterm",
          "status",
          "confirmationStatus",
          "effectiveFrom",
          "effectiveTo",
          "source",
        ];
        rows = data.map((x) => ({
          name: x.name,
          originCountry: x.originCountry,
          destinationCountry: x.destinationCountry,
          incoterm: x.incoterm,
          status: x.status,
          confirmationStatus: x.confirmationStatus,
          effectiveFrom: x.effectiveFrom.toISOString(),
          effectiveTo: x.effectiveTo?.toISOString(),
          source: x.source,
        }));
        break;
      }
      case "tariffs": {
        const data = await prisma.tariffVersion.findMany({
          orderBy: { effectiveFrom: "desc" },
        });
        headers = [
          "hsCode",
          "productDescription",
          "material",
          "originCountry",
          "destinationCountry",
          "dutyRate",
          "confirmationStatus",
          "effectiveFrom",
          "effectiveTo",
          "source",
        ];
        rows = data.map((x) => ({
          hsCode: x.hsCode,
          productDescription: x.productDescription,
          material: x.material,
          originCountry: x.originCountry,
          destinationCountry: x.destinationCountry,
          dutyRate: x.dutyRate,
          confirmationStatus: x.confirmationStatus,
          effectiveFrom: x.effectiveFrom.toISOString(),
          effectiveTo: x.effectiveTo?.toISOString(),
          source: x.source,
        }));
        break;
      }
      case "etgb-cases": {
        const data = await prisma.microExportCase.findMany({
          orderBy: { createdAt: "desc" },
        });
        headers = [
          "orderId",
          "status",
          "exporterName",
          "customsStatus",
          "etgbStatus",
          "shipmentId",
        ];
        rows = data.map((x) => ({
          orderId: x.orderId,
          status: x.status,
          exporterName: x.exporterName,
          customsStatus: x.customsStatus,
          etgbStatus: x.etgbStatus,
          shipmentId: x.shipmentId,
        }));
        break;
      }
      case "tax-obligations": {
        const data = await prisma.taxObligation.findMany({
          orderBy: { dueDate: "desc" },
        });
        headers = [
          "taxType",
          "periodStart",
          "periodEnd",
          "dueDate",
          "status",
          "estimatedAmount",
          "filedAmount",
          "paidAmount",
          "currency",
          "confirmationStatus",
        ];
        rows = data.map((x) => ({
          taxType: x.taxType,
          periodStart: x.periodStart.toISOString(),
          periodEnd: x.periodEnd.toISOString(),
          dueDate: x.dueDate.toISOString(),
          status: x.status,
          estimatedAmount: x.estimatedAmount,
          filedAmount: x.filedAmount,
          paidAmount: x.paidAmount,
          currency: x.currency,
          confirmationStatus: x.confirmationStatus,
        }));
        break;
      }
      case "sgk": {
        const data = await prisma.sgkMonthStatus.findMany({
          orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        headers = [
          "year",
          "month",
          "fourAActive",
          "fourBStatus",
          "debtAmount",
          "paymentAmount",
          "confirmationStatus",
        ];
        rows = data.map((x) => ({
          year: x.year,
          month: x.month,
          fourAActive: x.fourAActive,
          fourBStatus: x.fourBStatus,
          debtAmount: x.debtAmount,
          paymentAmount: x.paymentAmount,
          confirmationStatus: x.confirmationStatus,
        }));
        break;
      }
      case "accountant-periods": {
        const data = await prisma.accountantPeriod.findMany({
          orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        headers = [
          "year",
          "month",
          "status",
          "expectedDocuments",
          "uploadedDocuments",
          "missingDocuments",
          "sentAt",
          "confirmedReceivedAt",
          "lockedAt",
        ];
        rows = data.map((x) => ({
          year: x.year,
          month: x.month,
          status: x.status,
          expectedDocuments: x.expectedDocuments,
          uploadedDocuments: x.uploadedDocuments,
          missingDocuments: x.missingDocuments,
          sentAt: x.sentAt?.toISOString(),
          confirmedReceivedAt: x.confirmedReceivedAt?.toISOString(),
          lockedAt: x.lockedAt?.toISOString(),
        }));
        break;
      }
      case "audit-events": {
        const data = await prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        headers = ["entityType", "entityId", "action", "actor", "createdAt"];
        rows = data.map((x) => ({
          entityType: x.entityType,
          entityId: x.entityId,
          action: x.action,
          actor: x.actor,
          createdAt: x.createdAt.toISOString(),
        }));
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown export" }, { status: 404 });
    }
    await prisma.auditLog.create({
      data: {
        entityType: "ReportExport",
        entityId: entity,
        action: "CSV_EXPORTED",
        actor: session.user?.email || "ADMIN",
        afterJson: JSON.stringify({ rowCount: rows.length, from, to }),
      },
    });
    return new Response("\uFEFF" + toCsv(headers, rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="marmaramade-${entity}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof InvalidExportDateRangeError)
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    throw error;
  }
}

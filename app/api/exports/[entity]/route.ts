import { NextResponse } from "next/server";
import {
  requireAdminApi,
  AdminAuthorizationError,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

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
    const range =
      from || to
        ? {
            gte: from ? new Date(from) : undefined,
            lte: to ? new Date(to) : undefined,
          }
        : undefined;
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
    throw error;
  }
}

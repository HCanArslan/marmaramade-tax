"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  createPrivateBlobPath,
  sanitizeDocumentFilename,
  validateDocument,
} from "@/lib/documents/security";
import {
  DEFAULT_ORDER_DOCUMENTS,
  checklistCompleteness,
} from "@/lib/compliance";
import { calculate } from "@/lib/domain/calculator";
import { applyFeeProfile } from "@/lib/domain/fee-profile";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { calculateProductCost } from "@/lib/domain/product-cost";
import { optimizeProductMix } from "@/lib/goals/planner";
import Decimal from "decimal.js";

const text = z.string().trim().min(1);
const optionalText = z
  .string()
  .trim()
  .transform((v) => v || undefined);
const number = z.coerce.number().finite();
const date = z.coerce.date();
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(true)])
  .optional()
  .transform(Boolean);

async function adminActor(path: string) {
  const session = await requireAdmin({ redirectTo: path });
  return session.user?.email || "ADMIN";
}

export async function createLegalProfileAction(formData: FormData) {
  const actor = await adminActor("/business");
  const v = z
    .object({
      name: text,
      effectiveFrom: date,
      operatingMode: z.enum([
        "ARTISAN_TAX_EXEMPTION",
        "SOLE_PROPRIETORSHIP",
        "LIMITED_COMPANY",
        "PLANNING_ONLY",
        "ARCHIVED",
      ]),
      legalSellerName: text,
      legalSellerType: z.enum([
        "TAX_EXEMPT_ARTISAN",
        "INDIVIDUAL",
        "SOLE_PROPRIETORSHIP",
        "COMPANY",
      ]),
      makerName: text,
      etsyAccountHolderName: text,
      etsyTaxpayerName: text,
      bankAccountHolderName: text,
      exporterName: text,
      shipEntegraAccountHolderName: text,
      businessStatus: text,
      sellerFeeVatTreatment: text,
      artisanTaxExemptionEnabled: checkbox,
      orphanPensionRiskStatus: z.enum([
        "UNKNOWN",
        "UNDER_REVIEW",
        "CONFIRMED_NO_IMPACT",
        "CONFIRMED_IMPACT",
        "MANUAL_REVIEW_REQUIRED",
      ]),
      certificateNumber: optionalText,
      expectedMonthlyOrders: z.coerce.number().int().positive(),
      incomeTaxReserveRate: number,
      withholdingTaxRate: number,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const created = await prisma.$transaction(async (tx) => {
    const profile = await tx.legalOperatingProfile.create({
      data: {
        name: v.name,
        effectiveFrom: v.effectiveFrom,
        operatingMode: v.operatingMode,
        legalSellerName: v.legalSellerName,
        legalSellerType: v.legalSellerType,
        makerName: v.makerName,
        etsyAccountHolderName: v.etsyAccountHolderName,
        etsyTaxpayerName: v.etsyTaxpayerName,
        bankAccountHolderName: v.bankAccountHolderName,
        exporterName: v.exporterName,
        shipEntegraAccountHolderName: v.shipEntegraAccountHolderName,
        businessStatus: v.businessStatus,
        sellerFeeVatTreatment: v.sellerFeeVatTreatment,
        artisanTaxExemptionEnabled: v.artisanTaxExemptionEnabled,
        artisanTaxExemptionCertificateNumber: v.certificateNumber,
        orphanPensionRiskStatus: v.orphanPensionRiskStatus,
        expectedMonthlyOrders: v.expectedMonthlyOrders,
        incomeTaxReserveRate: v.incomeTaxReserveRate,
        withholdingTaxRate: v.withholdingTaxRate,
        notes: v.notes,
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "LegalOperatingProfile",
        entityId: profile.id,
        action: "VERSION_CREATED",
        actor,
        afterJson: JSON.stringify({
          name: profile.name,
          operatingMode: profile.operatingMode,
          effectiveFrom: profile.effectiveFrom,
        }),
      },
    });
    return profile;
  });
  redirect(`/business?created=${created.id}`);
}

export async function createShippingQuoteAction(formData: FormData) {
  const actor = await adminActor("/shipping");
  const v = z
    .object({
      originCountry: text,
      originCity: text,
      destinationCountry: text,
      carrier: text,
      serviceName: text,
      incoterm: text,
      actualWeightKg: number,
      length: number,
      width: number,
      height: number,
      divisor: number,
      base: number,
      fuel: number,
      insurance: number,
      pickup: number,
      remote: number,
      other: number,
      currency: text,
      quoteDate: date,
      expirationDate: optionalText,
      source: optionalText,
      notes: optionalText,
      planningDefault: checkbox,
    })
    .parse(Object.fromEntries(formData));
  const volumetric = (v.length * v.width * v.height) / v.divisor;
  const billable = Math.max(v.actualWeightKg, volumetric);
  const total = v.base + v.fuel + v.insurance + v.pickup + v.remote + v.other;
  const quote = await prisma.shippingQuote.create({
    data: {
      originCountry: v.originCountry,
      originCity: v.originCity,
      destinationCountry: v.destinationCountry,
      carrier: v.carrier,
      serviceName: v.serviceName,
      incoterm: v.incoterm,
      packageLengthCm: v.length,
      packageWidthCm: v.width,
      packageHeightCm: v.height,
      actualWeightKg: v.actualWeightKg,
      volumetricDivisor: v.divisor,
      volumetricWeightKg: volumetric,
      billableWeightKg: billable,
      baseShippingPrice: v.base,
      shippingCost: total,
      shippingCurrency: v.currency,
      insuranceCost: v.insurance,
      fuelSurcharge: v.fuel,
      remoteAreaFee: v.remote,
      pickupFee: v.pickup,
      otherCarrierFees: v.other,
      quoteDate: v.quoteDate,
      expirationDate: v.expirationDate ? new Date(v.expirationDate) : null,
      source: v.source,
      notes: v.notes,
      planningDefault: v.planningDefault,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "ShippingQuote",
      entityId: quote.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/shipping");
}

export async function createCustomsQuoteAction(formData: FormData) {
  const actor = await adminActor("/customs");
  const v = z
    .object({
      originCountry: text,
      destinationCountry: text,
      hsCode: text,
      productDescription: text,
      countryOfOrigin: text,
      material: optionalText,
      declaredValue: number,
      currency: text,
      dutyRate: number,
      tariffRate: number,
      processing: number,
      brokerage: number,
      clearance: number,
      destinationTax: number,
      other: number,
      quoteDate: date,
      expirationDate: optionalText,
      source: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const quote = await prisma.customsQuote.create({
    data: {
      originCountry: v.originCountry,
      destinationCountry: v.destinationCountry,
      hsCode: v.hsCode,
      productDescription: v.productDescription,
      countryOfOrigin: v.countryOfOrigin,
      productMaterial: v.material,
      declaredValue: v.declaredValue,
      declaredValueCurrency: v.currency,
      customsDutyRate: v.dutyRate,
      customsDutyAmount: (v.declaredValue * v.dutyRate) / 100,
      additionalTariffRate: v.tariffRate,
      additionalTariffAmount: (v.declaredValue * v.tariffRate) / 100,
      carrierProcessingFee: v.processing,
      brokerageFee: v.brokerage,
      customsClearanceFee: v.clearance,
      insuranceFee: 0,
      destinationTax: v.destinationTax,
      otherDestinationFee: v.other,
      quoteDate: v.quoteDate,
      effectiveFrom: v.quoteDate,
      expirationDate: v.expirationDate ? new Date(v.expirationDate) : null,
      source: v.source,
      notes: v.notes,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "CustomsQuote",
      entityId: quote.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/customs");
}
export async function duplicateShippingQuoteAction(formData: FormData) {
  const actor = await adminActor("/shipping");
  const id = text.parse(formData.get("id"));
  const source = await prisma.shippingQuote.findUniqueOrThrow({
    where: { id },
  });
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = source;
  void _id;
  void _c;
  void _u;
  const row = await prisma.shippingQuote.create({
    data: {
      ...data,
      quoteDate: new Date(),
      expirationDate: null,
      planningDefault: false,
      activeExpected: false,
      notes: `Duplicated from ${id}. ${data.notes || ""}`,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "ShippingQuote",
      entityId: row.id,
      action: "DUPLICATED",
      actor,
    },
  });
  revalidatePath("/shipping");
}
export async function archiveShippingQuoteAction(formData: FormData) {
  const actor = await adminActor("/shipping");
  const id = text.parse(formData.get("id"));
  await prisma.$transaction([
    prisma.shippingQuote.update({
      where: { id },
      data: {
        expirationDate: new Date(),
        planningDefault: false,
        activeExpected: false,
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "ShippingQuote",
        entityId: id,
        action: "ARCHIVED",
        actor,
      },
    }),
  ]);
  revalidatePath("/shipping");
}
export async function duplicateCustomsQuoteAction(formData: FormData) {
  const actor = await adminActor("/customs");
  const id = text.parse(formData.get("id"));
  const source = await prisma.customsQuote.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = source;
  void _id;
  void _c;
  void _u;
  const row = await prisma.customsQuote.create({
    data: {
      ...data,
      quoteDate: new Date(),
      effectiveFrom: new Date(),
      expirationDate: null,
      notes: `Duplicated from ${id}. ${data.notes || ""}`,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "CustomsQuote",
      entityId: row.id,
      action: "DUPLICATED",
      actor,
    },
  });
  revalidatePath("/customs");
}
export async function archiveCustomsQuoteAction(formData: FormData) {
  const actor = await adminActor("/customs");
  const id = text.parse(formData.get("id"));
  await prisma.$transaction([
    prisma.customsQuote.update({
      where: { id },
      data: { expirationDate: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "CustomsQuote",
        entityId: id,
        action: "ARCHIVED",
        actor,
      },
    }),
  ]);
  revalidatePath("/customs");
}

export async function createComplianceCaseAction(formData: FormData) {
  const actor = await adminActor("/compliance");
  const v = z
    .object({
      title: text,
      institution: z.enum([
        "SGK",
        "GIB",
        "TAX_OFFICE",
        "ETSY",
        "SHIPENTEGRA",
        "BANK",
        "ACCOUNTANT",
        "OTHER",
      ]),
      topic: text,
      status: z.enum([
        "DRAFT",
        "SUBMITTED",
        "WAITING_FOR_RESPONSE",
        "RESPONSE_RECEIVED",
        "NEEDS_CLARIFICATION",
        "RESOLVED",
        "ARCHIVED",
      ]),
      referenceNumber: optionalText,
      summary: optionalText,
      profileId: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const item = await prisma.complianceCase.create({
    data: {
      title: v.title,
      institution: v.institution,
      topic: v.topic,
      status: v.status,
      referenceNumber: v.referenceNumber,
      summary: v.summary,
      relatedLegalOperatingProfileId: v.profileId,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "ComplianceCase",
      entityId: item.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/compliance");
}

export async function createProfitGoalAction(formData: FormData) {
  const actor = await adminActor("/goals");
  const v = z
    .object({
      name: text,
      startDate: date,
      endDate: date,
      target: number,
      currency: z.enum(["USD", "TRY"]),
      planningMode: z.enum([
        "AVERAGE_PRODUCT",
        "PRODUCT_COMBINATION",
        "CURRENT_INVENTORY",
        "CUSTOM_MIX",
        "SALES_PACE",
        "CASH_FLOW_TARGET",
      ]),
      operatingProfileId: text,
      exchangeRate: number,
      unitProfitUsd: number.optional(),
    })
    .parse(Object.fromEntries(formData));
  const goal = await prisma.$transaction(async (tx) => {
    const g = await tx.profitGoal.create({
      data: {
        name: v.name,
        periodType: "MONTHLY",
        startDate: v.startDate,
        endDate: v.endDate,
        targetProfitAmount: v.target,
        targetProfitCurrency: v.currency,
        planningMode: v.planningMode,
        operatingProfileId: v.operatingProfileId,
        scenarioSettings: {
          exchangeRate: v.exchangeRate,
          unitProfitUsd: v.unitProfitUsd ?? null,
        },
      },
    });
    await tx.profitGoalVersion.create({
      data: {
        profitGoalId: g.id,
        versionNumber: 1,
        targetProfitAmount: v.target,
        targetProfitCurrency: v.currency,
        assumptionsJson: { exchangeRate: v.exchangeRate, saved: true },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "ProfitGoal",
        entityId: g.id,
        action: "CREATED",
        actor,
      },
    });
    return g;
  });
  redirect(`/goals?created=${goal.id}`);
}

export async function deleteProfitGoalAction(formData: FormData) {
  const actor = await adminActor("/goals");
  const id = text.parse(formData.get("id"));
  const goal = await prisma.profitGoal.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      targetProfitAmount: true,
      targetProfitCurrency: true,
    },
  });
  await prisma.$transaction(async (tx) => {
    await tx.profitGoal.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        entityType: "ProfitGoal",
        entityId: id,
        action: "DELETED",
        actor,
        beforeJson: JSON.stringify({
          name: goal.name,
          target: goal.targetProfitAmount.toString(),
          currency: goal.targetProfitCurrency,
        }),
      },
    });
  });
  revalidatePath("/goals");
  revalidatePath("/sales-plan");
  revalidatePath("/");
}

export async function uploadDocumentAction(formData: FormData) {
  const actor = await adminActor("/documents");
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Select a file.");
  const category = z
    .enum([
      "ETSY_ORDER",
      "ETSY_PAYMENT",
      "ETSY_LEDGER",
      "PRODUCT_PHOTO",
      "PACKAGE_PHOTO",
      "SALES_DOCUMENT",
      "PROFORMA",
      "SHIPENTEGRA_LABEL",
      "SHIPENTEGRA_INVOICE",
      "ETGB",
      "CUSTOMS_CALCULATION",
      "DDP_CALCULATION",
      "TRACKING_DOCUMENT",
      "BANK_PAYOUT",
      "BANK_WITHHOLDING",
      "MATERIAL_RECEIPT",
      "PACKAGING_RECEIPT",
      "RETURN_DOCUMENT",
      "CUSTOMER_CORRESPONDENCE",
      "TAX_EXEMPTION_CERTIFICATE",
      "SGK_RESPONSE",
      "TAX_OFFICE_RESPONSE",
      "ETSY_SUPPORT_RESPONSE",
      "SHIPENTEGRA_RESPONSE",
      "ACCOUNTANT_OPINION",
      "OTHER",
    ])
    .parse(formData.get("category"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = validateDocument({
    filename: file.name,
    declaredType: file.type,
    bytes,
  });
  const existing = await prisma.storedDocument.findFirst({
    where: { checksumSha256: checked.checksumSha256, deletedAt: null },
  });
  if (existing) throw new Error("An identical document is already stored.");
  const blobPath = createPrivateBlobPath(file.name);
  const blob = await put(blobPath, Buffer.from(bytes), {
    access: "private",
    contentType: checked.detectedType,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const document = await prisma.$transaction(async (tx) => {
    const d = await tx.storedDocument.create({
      data: {
        originalFilename: sanitizeDocumentFilename(file.name),
        safeStorageFilename: blobPath.split("/").pop()!,
        blobUrl: blob.url,
        blobPath,
        mimeType: checked.detectedType,
        sizeBytes: bytes.length,
        checksumSha256: checked.checksumSha256,
        category,
        orderId: String(formData.get("orderId") || "") || null,
        complianceCaseId:
          String(formData.get("complianceCaseId") || "") || null,
        uploadedBy: actor,
        notes: String(formData.get("notes") || "") || null,
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "StoredDocument",
        entityId: d.id,
        action: "UPLOADED",
        actor,
        afterJson: JSON.stringify({
          category,
          mimeType: checked.detectedType,
          sizeBytes: bytes.length,
          checksumSha256: checked.checksumSha256,
        }),
      },
    });
    const replacementForId = String(formData.get("replacementForId") || "");
    if (replacementForId) {
      await tx.storedDocument.update({
        where: { id: replacementForId },
        data: {
          status: "ARCHIVED",
          archivedAt: new Date(),
          deletedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          entityType: "StoredDocument",
          entityId: replacementForId,
          action: "REPLACED",
          actor,
          afterJson: JSON.stringify({ replacementId: d.id }),
        },
      });
    }
    return d;
  });
  void document.id;
  revalidatePath("/documents");
}

export async function verifyDocumentAction(formData: FormData) {
  const actor = await adminActor("/documents");
  const id = text.parse(formData.get("id"));
  await prisma.$transaction([
    prisma.storedDocument.update({
      where: { id },
      data: { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: actor },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "StoredDocument",
        entityId: id,
        action: "VERIFIED",
        actor,
      },
    }),
  ]);
  revalidatePath("/documents");
}
export async function archiveDocumentAction(formData: FormData) {
  const actor = await adminActor("/documents");
  const id = text.parse(formData.get("id"));
  await prisma.$transaction([
    prisma.storedDocument.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        deletedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "StoredDocument",
        entityId: id,
        action: "SOFT_DELETED",
        actor,
      },
    }),
  ]);
  revalidatePath("/documents");
}
export async function permanentlyDeleteDocumentAction(formData: FormData) {
  const actor = await adminActor("/documents");
  const v = z
    .object({ id: text, confirmation: z.literal("PERMANENTLY DELETE") })
    .parse(Object.fromEntries(formData));
  const doc = await prisma.storedDocument.findUniqueOrThrow({
    where: { id: v.id },
  });
  if (!doc.deletedAt)
    throw new Error("Archive the document before permanent deletion.");
  await del(doc.blobPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
  await prisma.$transaction([
    prisma.storedDocument.delete({ where: { id: doc.id } }),
    prisma.auditLog.create({
      data: {
        entityType: "StoredDocument",
        entityId: doc.id,
        action: "PERMANENTLY_DELETED",
        actor,
      },
    }),
  ]);
  revalidatePath("/documents");
}

export async function ensureOrderChecklist(orderId: string) {
  await requireAdmin({ redirectTo: `/orders/${orderId}` });
  return prisma.$transaction(async (tx) => {
    const existing = await tx.orderDocumentChecklist.findUnique({
      where: { orderId },
      include: { items: true },
    });
    if (existing) return existing;
    return tx.orderDocumentChecklist.create({
      data: {
        orderId,
        items: {
          create: DEFAULT_ORDER_DOCUMENTS.map((category) => ({ category })),
        },
      },
      include: { items: true },
    });
  });
}

export async function refreshChecklist(orderId: string) {
  await requireAdmin({ redirectTo: `/orders/${orderId}` });
  const docs = await prisma.storedDocument.findMany({
    where: { orderId, deletedAt: null },
  });
  const checklist = await ensureOrderChecklist(orderId);
  const updated = checklist.items.map((item) => ({
    ...item,
    verified: docs.some(
      (doc) => doc.category === item.category && doc.status === "VERIFIED",
    ),
  }));
  const score = checklistCompleteness(updated);
  await prisma.$transaction(async (tx) => {
    for (const item of updated)
      await tx.orderDocumentChecklistItem.update({
        where: { id: item.id },
        data: {
          verified: item.verified,
          documentId: docs.find(
            (doc) =>
              doc.category === item.category && doc.status === "VERIFIED",
          )?.id,
        },
      });
    await tx.orderDocumentChecklist.update({
      where: { id: checklist.id },
      data: {
        completenessPercent: score.percent,
        complianceComplete: score.complete,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { complianceComplete: score.complete },
    });
  });
  void score;
}

export async function createFeeProfileAction(formData: FormData) {
  const actor = await adminActor("/fees");
  const v = z
    .object({
      name: text,
      country: text,
      effectiveFrom: date,
      listingCurrency: text,
      payoutCurrency: text,
      ruleName: text,
      category: text,
      calculationType: z.enum(["PERCENTAGE", "FIXED"]),
      percentageRate: number,
      fixedAmount: number,
      fixedCurrency: text,
      calculationBase: text,
      vatApplicable: checkbox,
      vatRate: number,
      sourceUrl: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const profile = await prisma.$transaction(async (tx) => {
    const p = await tx.feeProfile.create({
      data: {
        marketplace: "Etsy",
        name: v.name,
        country: v.country,
        effectiveFrom: v.effectiveFrom,
        listingCurrency: v.listingCurrency,
        payoutCurrency: v.payoutCurrency,
        notes: v.notes,
        rules: {
          create: {
            name: v.ruleName,
            category: v.category,
            calculationType: v.calculationType,
            percentageRate:
              v.calculationType === "PERCENTAGE" ? v.percentageRate : null,
            fixedAmount: v.calculationType === "FIXED" ? v.fixedAmount : null,
            fixedCurrency: v.fixedCurrency,
            calculationBase: v.calculationBase,
            vatApplicable: v.vatApplicable,
            vatRate: v.vatRate,
            effectiveFrom: v.effectiveFrom,
            sourceUrl: v.sourceUrl,
            notes: v.notes,
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "FeeProfile",
        entityId: p.id,
        action: "VERSION_CREATED",
        actor,
      },
    });
    return p;
  });
  redirect(`/fees?created=${profile.id}`);
}

export async function createOfficialEtsyTurkeyFeeProfileAction() {
  const actor = await adminActor("/fees");
  const effectiveFrom = new Date("2026-01-01T00:00:00.000Z");
  const existing = await prisma.feeProfile.findUnique({
    where: {
      marketplace_country_effectiveFrom: {
        marketplace: "Etsy",
        country: "TR",
        effectiveFrom,
      },
    },
  });
  if (existing) redirect(`/fees?created=${existing.id}`);

  const feePolicy = "https://www.etsy.com/legal/fees/";
  const paymentsPolicy = "https://www.etsy.com/legal/etsy-payments";
  const regulatoryPolicy =
    "https://help.etsy.com/hc/en-us/articles/1500011073202-What-is-a-Regulatory-Operating-Fee";
  const profile = await prisma.$transaction(async (tx) => {
    const created = await tx.feeProfile.create({
      data: {
        marketplace: "Etsy",
        name: "Etsy Türkiye main planning profile (2026)",
        country: "TR",
        effectiveFrom,
        listingCurrency: "USD",
        payoutCurrency: "TRY",
        notes:
          "Official Etsy rates checked 2026-07-16. VAT treatment, Offsite Ads eligibility, currency conversion, and deposit fees remain conditional and must be reconciled to Etsy ledger entries.",
        rules: {
          create: [
            {
              name: "Listing / renewal fee",
              category: "LISTING",
              calculationType: "FIXED",
              fixedAmount: "0.20",
              fixedCurrency: "USD",
              calculationBase: "PER_LISTING_OR_RENEWAL",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: feePolicy,
            },
            {
              name: "Transaction fee",
              category: "TRANSACTION",
              calculationType: "PERCENTAGE",
              percentageRate: "6.5",
              calculationBase: "ITEM_PLUS_SHIPPING_PLUS_GIFT_WRAP",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: feePolicy,
            },
            {
              name: "Etsy Payments percentage",
              category: "PAYMENT_PROCESSING_PERCENT",
              calculationType: "PERCENTAGE",
              percentageRate: "6.5",
              calculationBase: "TOTAL_PAYMENT_INCLUDING_SHIPPING_AND_TAX",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: paymentsPolicy,
            },
            {
              name: "Etsy Payments fixed",
              category: "PAYMENT_PROCESSING_FIXED",
              calculationType: "FIXED",
              fixedAmount: "14",
              fixedCurrency: "TRY",
              calculationBase: "PER_ORDER",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: paymentsPolicy,
            },
            {
              name: "Regulatory operating fee",
              category: "REGULATORY",
              calculationType: "PERCENTAGE",
              percentageRate: "1.67",
              calculationBase: "ITEM_PLUS_SHIPPING_PLUS_GIFT_WRAP",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: regulatoryPolicy,
            },
            {
              name: "Currency conversion (conditional)",
              category: "CURRENCY_CONVERSION",
              calculationType: "PERCENTAGE",
              percentageRate: "2.5",
              calculationBase:
                "ONLY_WHEN_LISTING_AND_PAYMENT_CURRENCIES_DIFFER",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: feePolicy,
            },
            {
              name: "Offsite Ads conservative rate",
              category: "OFFSITE_ADS",
              calculationType: "PERCENTAGE",
              percentageRate: "15",
              calculationBase: "ATTRIBUTED_ORDER_ONLY_MAX_100_USD",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: feePolicy,
              notes:
                "Use 12% instead when the shop qualifies for Etsy's lower established-seller rate; reconcile from actual ledger.",
            },
            {
              name: "Low-deposit fee (conditional)",
              category: "DEPOSIT",
              calculationType: "FIXED",
              fixedAmount: "42",
              fixedCurrency: "TRY",
              calculationBase: "DEPOSIT_ABOVE_50_AND_BELOW_600_TRY",
              vatApplicable: true,
              vatRate: "20",
              effectiveFrom,
              sourceUrl: paymentsPolicy,
            },
          ],
        },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "FeeProfile",
        entityId: created.id,
        action: "OFFICIAL_TURKEY_PRESET_CREATED",
        actor,
        afterJson: JSON.stringify({
          sourceDate: "2026-07-16",
          rules: 8,
          confirmation: "CONDITIONAL_ITEMS_REQUIRE_RECONCILIATION",
        }),
      },
    });
    return created;
  });
  redirect(`/fees?created=${profile.id}`);
}

export async function createProductCostAction(formData: FormData) {
  const actor = await adminActor("/products");
  const v = z
    .object({
      productId: text,
      effectiveFrom: date,
      materialCostTry: number,
      laborHours: number,
      laborHourlyRateTry: number,
      packagingCostTry: number,
      additionalDirectCostTry: number,
      wastageRate: number,
      additionalMakerPaymentTry: number,
      allocatedEquipmentCostTry: number,
      changeReason: optionalText,
      templateType: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const version = await prisma.$transaction(async (tx) => {
    const p = await tx.productCostVersion.create({ data: v });
    await tx.auditLog.create({
      data: {
        entityType: "ProductCostVersion",
        entityId: p.id,
        action: "VERSION_CREATED",
        actor,
      },
    });
    return p;
  });
  redirect(`/products?cost=${version.id}`);
}
export async function createFeeRuleAction(formData: FormData) {
  const actor = await adminActor("/fees");
  const v = z
    .object({
      feeProfileId: text,
      name: text,
      category: text,
      calculationType: z.enum(["PERCENTAGE", "FIXED"]),
      percentageRate: number,
      fixedAmount: number,
      fixedCurrency: text,
      calculationBase: text,
      vatApplicable: checkbox,
      vatRate: number,
      effectiveFrom: date,
      sourceUrl: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const row = await prisma.feeRule.create({
    data: {
      ...v,
      percentageRate:
        v.calculationType === "PERCENTAGE" ? v.percentageRate : null,
      fixedAmount: v.calculationType === "FIXED" ? v.fixedAmount : null,
    },
  });
  await prisma.auditLog.create({
    data: { entityType: "FeeRule", entityId: row.id, action: "CREATED", actor },
  });
  revalidatePath("/fees");
}

export async function createProductMaterialAction(formData: FormData) {
  const actor = await adminActor("/products");
  const v = z
    .object({
      productId: text,
      productCostVersionId: text,
      componentType: text,
      description: optionalText,
      quantity: number,
      unitCostTry: number,
    })
    .parse(Object.fromEntries(formData));
  const version = await prisma.productCostVersion.findUniqueOrThrow({
    where: { id: v.productCostVersionId },
  });
  if (version.productId !== v.productId)
    throw new Error("Cost version does not belong to the selected product.");
  const row = await prisma.productMaterialCost.create({
    data: { ...v, totalCostTry: v.quantity * v.unitCostTry },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "ProductMaterialCost",
      entityId: row.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/products");
}

export async function createManualOrderAction(formData: FormData) {
  const actor = await adminActor("/orders");
  const v = z
    .object({
      orderNumber: text,
      orderDate: date,
      destinationCountry: text,
      currency: text,
      productCostVersionId: text,
      quantity: z.coerce.number().int().positive(),
      unitPrice: number,
      businessProfileVersionId: text,
      legalOperatingProfileId: text,
      feeProfileId: text,
      exchangeRateSnapshotId: text,
      shippingQuoteId: optionalText,
      customsQuoteId: optionalText,
      packagingActualTry: number,
      withholdingTry: number,
      overheadTry: number,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const result = await prisma.$transaction(async (tx) => {
    const [cost, business, legal, fee, rate, shipping, customs] =
      await Promise.all([
        tx.productCostVersion.findUniqueOrThrow({
          where: { id: v.productCostVersionId },
        }),
        tx.businessProfileVersion.findUniqueOrThrow({
          where: { id: v.businessProfileVersionId },
        }),
        tx.legalOperatingProfile.findUniqueOrThrow({
          where: { id: v.legalOperatingProfileId },
        }),
        tx.feeProfile.findUniqueOrThrow({
          where: { id: v.feeProfileId },
          include: { rules: true },
        }),
        tx.exchangeRateSnapshot.findUniqueOrThrow({
          where: { id: v.exchangeRateSnapshotId },
        }),
        v.shippingQuoteId
          ? tx.shippingQuote.findUnique({ where: { id: v.shippingQuoteId } })
          : null,
        v.customsQuoteId
          ? tx.customsQuote.findUnique({ where: { id: v.customsQuoteId } })
          : null,
      ]);
    const duty =
      customs?.customsDutyAmount ??
      customs?.declaredValue.mul(customs.customsDutyRate).div(100) ??
      0;
    const tariff =
      customs?.additionalTariffAmount ??
      customs?.declaredValue.mul(customs.additionalTariffRate).div(100) ??
      0;
    const monthlyOverhead = business.accountantMonthlyTry
      .plus(business.socialSecurityMonthlyTry)
      .plus(business.invoicingSoftwareMonthlyTry)
      .plus(business.bankingMonthlyTry)
      .plus(business.officeMonthlyTry)
      .plus(business.otherMonthlyBusinessCostsTry)
      .plus(v.overheadTry);
    const feeInput = applyFeeProfile(defaultCalculatorInput, fee.rules);
    const calc = calculate({
      ...feeInput,
      itemSubtotalUsd: v.unitPrice * v.quantity,
      materialCostTry: calculateProductCost({
        materialComponentsTry: [cost.materialCostTry],
        wastageRate: cost.wastageRate,
        laborHours: 0,
        laborHourlyRateTry: 0,
        packagingCostTry: 0,
        additionalMakerPaymentTry: cost.additionalMakerPaymentTry,
        allocatedEquipmentCostTry: cost.allocatedEquipmentCostTry,
        otherDirectCostTry: 0,
      }).directProductCostTry.mul(v.quantity),
      laborHours: cost.laborHours.mul(v.quantity),
      laborHourlyRateTry: cost.laborHourlyRateTry,
      packagingCostTry: cost.packagingCostTry
        .mul(v.quantity)
        .plus(v.packagingActualTry),
      additionalDirectCostTry: cost.additionalDirectCostTry.mul(v.quantity),
      internationalShippingUsd: shipping?.shippingCost ?? 0,
      customsDutyUsd: duty,
      additionalTariffUsd: tariff,
      carrierProcessingFeeUsd: customs?.carrierProcessingFee ?? 0,
      monthlyOverheadTry: monthlyOverhead,
      expectedMonthlyOrders: business.expectedMonthlyOrders,
      taxReserveRate: legal.incomeTaxReserveRate,
      businessStatus:
        legal.operatingMode === "SOLE_PROPRIETORSHIP"
          ? "SOLE_PROPRIETORSHIP"
          : "INDIVIDUAL_UNREGISTERED",
      vatTreatment:
        business.etsyVatTreatment === "ETSY_CHARGES_SELLER_FEE_VAT"
          ? "CHARGED_BY_ETSY"
          : "ACCOUNTANT_MANAGED",
      sellerFeeVatRate: business.sellerFeeVatRate,
      usdTryRate: rate.rate,
    });
    const order = await tx.order.create({
      data: {
        orderNumber: v.orderNumber,
        orderDate: v.orderDate,
        marketplace: "MANUAL",
        destinationCountry: v.destinationCountry,
        currency: v.currency,
        orderStatus: "CONFIRMED",
        confirmedAt: new Date(),
        businessProfileVersionId: business.id,
        legalOperatingProfileId: v.legalOperatingProfileId,
        feeProfileId: fee.id,
        exchangeRateSnapshotId: rate.id,
        shippingQuoteId: v.shippingQuoteId,
        customsQuoteId: v.customsQuoteId,
        notes: v.notes,
        items: {
          create: {
            productId: cost.productId,
            quantity: v.quantity,
            unitPrice: v.unitPrice,
            unitCurrency: v.currency,
            sellerFundedDiscount: 0,
            etsyFundedDiscount: 0,
            shippingAllocated: 0,
            giftWrapAllocated: 0,
            taxCollectedByMarketplace: 0,
            productCostVersionId: cost.id,
          },
        },
      },
    });
    const snapshot = await tx.orderCostSnapshot.create({
      data: {
        orderId: order.id,
        businessProfileVersionId: business.id,
        feeProfileId: fee.id,
        exchangeRateSnapshotId: rate.id,
        grossRevenueUsd: calc.totals.grossRevenue,
        totalCostUsd: calc.totals.totalCostUsd,
        totalCostTry: calc.totals.totalCostTry,
        estimatedProfitUsd: calc.totals.estimatedAfterReserveProfit,
        estimatedProfitTry: calc.totals.estimatedAfterReserveProfitTry,
        assumptionsJson: JSON.stringify(calc.assumptions),
        lines: {
          create: calc.lines.map((line) => ({
            formulaName: line.name,
            category: line.category,
            calculationBase: line.base,
            rate: line.rate,
            sourceAmount: line.nativeAmount,
            sourceCurrency: line.nativeCurrency,
            convertedAmountUsd: line.usd,
            convertedAmountTry: line.try,
            exchangeRateUsed: rate.rate,
            applicableProfileName: business.name,
            applicableFeeVersion: fee.name,
            metadataJson: JSON.stringify({ formula: line.formula }),
          })),
        },
      },
    });
    if (v.withholdingTry > 0)
      await tx.withholdingRecord.create({
        data: {
          orderId: order.id,
          legalOperatingProfileId: v.legalOperatingProfileId,
          recordDate: v.orderDate,
          actualWithholdingTry: v.withholdingTry,
          withholdingBaseType: "UNKNOWN_PENDING_CONFIRMATION",
        },
      });
    await tx.auditLog.create({
      data: {
        entityType: "OrderCostSnapshot",
        entityId: snapshot.id,
        action: "MANUAL_ORDER_CONFIRMED",
        actor,
      },
    });
    return order;
  });
  redirect(`/orders?created=${result.id}`);
}

export async function createOrderAdjustmentAction(formData: FormData) {
  const actor = await adminActor("/orders");
  const v = z
    .object({
      orderId: text,
      snapshotId: optionalText,
      category: text,
      amount: number,
      currency: z.enum(["USD", "TRY"]),
      exchangeRate: number,
      reason: text,
      evidenceNote: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const amountUsd = v.currency === "USD" ? v.amount : v.amount / v.exchangeRate;
  const amountTry = v.currency === "TRY" ? v.amount : v.amount * v.exchangeRate;
  const item = await prisma.$transaction(async (tx) => {
    const a = await tx.orderAdjustment.create({
      data: {
        orderId: v.orderId,
        snapshotId: v.snapshotId,
        category: v.category,
        amount: v.amount,
        currency: v.currency,
        amountUsd,
        amountTry,
        reason: v.reason,
        evidenceNote: v.evidenceNote,
        createdBy: actor,
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "OrderAdjustment",
        entityId: a.id,
        action: "CREATED",
        actor,
      },
    });
    return a;
  });
  void item;
  revalidatePath("/orders");
}

export async function saveGeneralSettingAction(formData: FormData) {
  const actor = await adminActor("/settings");
  const v = z
    .object({
      key: z.enum([
        "SHOP_IDENTITY",
        "SHIPPING_DEFAULT",
        "CUSTOMS_DEFAULT",
        "PACKAGE_DEFAULT",
        "GOAL_DEFAULTS",
        "RESERVES",
        "DOCUMENT_RETENTION",
        "DOCUMENT_REQUIREMENTS",
      ]),
      value: text,
    })
    .parse(Object.fromEntries(formData));
  const setting = await prisma.appSetting.upsert({
    where: { key: v.key },
    update: { value: v.value },
    create: v,
  });
  await prisma.auditLog.create({
    data: {
      entityType: "AppSetting",
      entityId: setting.id,
      action: "UPDATED",
      actor,
      afterJson: JSON.stringify({ key: v.key }),
    },
  });
  revalidatePath("/settings");
}

export async function createDocumentRequirementAction(formData: FormData) {
  const actor = await adminActor("/settings");
  const v = z
    .object({
      name: text,
      category: z.enum([
        "ETSY_ORDER",
        "ETSY_PAYMENT",
        "ETSY_LEDGER",
        "PRODUCT_PHOTO",
        "PACKAGE_PHOTO",
        "SALES_DOCUMENT",
        "PROFORMA",
        "SHIPENTEGRA_LABEL",
        "SHIPENTEGRA_INVOICE",
        "ETGB",
        "CUSTOMS_CALCULATION",
        "DDP_CALCULATION",
        "TRACKING_DOCUMENT",
        "BANK_PAYOUT",
        "BANK_WITHHOLDING",
        "MATERIAL_RECEIPT",
        "PACKAGING_RECEIPT",
        "RETURN_DOCUMENT",
        "CUSTOMER_CORRESPONDENCE",
        "TAX_EXEMPTION_CERTIFICATE",
        "SGK_RESPONSE",
        "TAX_OFFICE_RESPONSE",
        "ETSY_SUPPORT_RESPONSE",
        "SHIPENTEGRA_RESPONSE",
        "ACCOUNTANT_OPINION",
        "OTHER",
      ]),
      destinationCountry: optionalText,
      incoterm: optionalText,
      carrier: optionalText,
      effectiveFrom: date,
    })
    .parse(Object.fromEntries(formData));
  const rule = await prisma.documentRequirementRule.create({ data: v });
  await prisma.auditLog.create({
    data: {
      entityType: "DocumentRequirementRule",
      entityId: rule.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/settings");
}

export async function createTaxLimitAction(formData: FormData) {
  const actor = await adminActor("/tax-exemption");
  const v = z
    .object({
      year: z.coerce.number().int(),
      annualLimitTry: number,
      effectiveFrom: date,
      source: text,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const row = await prisma.taxExemptionLimitVersion.create({ data: v });
  await prisma.auditLog.create({
    data: {
      entityType: "TaxExemptionLimitVersion",
      entityId: row.id,
      action: "VERSION_CREATED",
      actor,
    },
  });
  revalidatePath("/tax-exemption");
}
export async function createWithholdingAction(formData: FormData) {
  const actor = await adminActor("/tax-exemption");
  const v = z
    .object({
      legalOperatingProfileId: text,
      recordDate: date,
      expectedWithholdingRate: number,
      expectedWithholdingTry: number,
      actualWithholdingTry: number,
      withholdingBaseType: z.enum([
        "BANK_NET_PAYOUT",
        "ETSY_GROSS_REVENUE",
        "MANUAL",
        "UNKNOWN_PENDING_CONFIRMATION",
      ]),
      withholdingBaseTry: number,
      bankReference: optionalText,
      verificationStatus: text,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const row = await prisma.withholdingRecord.create({ data: v });
  await prisma.auditLog.create({
    data: {
      entityType: "WithholdingRecord",
      entityId: row.id,
      action: "CREATED",
      actor,
    },
  });
  revalidatePath("/tax-exemption");
}
export async function saveMonthlyOverheadAction(formData: FormData) {
  const actor = await adminActor("/business");
  const v = z
    .object({
      month: date,
      accountantTry: number,
      socialSecurityTry: number,
      softwareTry: number,
      bankingTry: number,
      officeTry: number,
      otherTry: number,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const row = await prisma.monthlyOverhead.upsert({
    where: { month: v.month },
    update: v,
    create: v,
  });
  await prisma.auditLog.create({
    data: {
      entityType: "MonthlyOverhead",
      entityId: row.id,
      action: "UPSERTED",
      actor,
    },
  });
  revalidatePath("/business");
  revalidatePath("/calculator");
  revalidatePath("/");
}

export async function runInventoryGoalAction(formData: FormData) {
  const actor = await adminActor("/goals");
  const v = z
    .object({
      goalId: text,
      maxUnits: z.coerce.number().int().positive(),
      maxLaborHours: number,
      offsiteAds: checkbox,
    })
    .parse(Object.fromEntries(formData));
  const goal = await prisma.profitGoal.findUniqueOrThrow({
    where: { id: v.goalId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  const settings = goal.scenarioSettings as { exchangeRate?: number };
  const rate = new Decimal(settings.exchangeRate || 1);
  const [products, feeProfile, legalProfile, overhead, shipping, customs] =
    await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        include: {
          costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
          etsyListingLinks: { include: { listing: true } },
        },
      }),
      prisma.feeProfile.findFirst({
        where: { marketplace: "Etsy", country: "TR" },
        include: { rules: true },
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.legalOperatingProfile.findUnique({
        where: { id: goal.operatingProfileId },
      }),
      prisma.monthlyOverhead.findFirst({ orderBy: { month: "desc" } }),
      prisma.shippingQuote.findFirst({
        where: { planningDefault: true, shippingCurrency: "USD" },
        orderBy: { quoteDate: "desc" },
      }),
      prisma.customsQuote.findFirst({
        where: { declaredValueCurrency: "USD" },
        orderBy: { quoteDate: "desc" },
      }),
    ]);
  const monthlyOverhead = overhead
    ? overhead.accountantTry
        .plus(overhead.socialSecurityTry)
        .plus(overhead.softwareTry)
        .plus(overhead.bankingTry)
        .plus(overhead.officeTry)
        .plus(overhead.otherTry)
    : new Decimal(0);
  const duty =
    customs?.customsDutyAmount ??
    customs?.declaredValue.mul(customs.customsDutyRate).div(100) ??
    0;
  const tariff =
    customs?.additionalTariffAmount ??
    customs?.declaredValue.mul(customs.additionalTariffRate).div(100) ??
    0;
  const baseInput = applyFeeProfile(
    defaultCalculatorInput,
    feeProfile?.rules ?? [],
  );
  const candidates = products.flatMap((p) => {
    const cost = p.costVersions[0],
      listing = p.etsyListingLinks[0]?.listing;
    if (!cost || !listing || listing.quantity <= 0) return [];
    const price = listing.buyerDiscountedPrice ?? listing.priceAmount;
    const calc = calculate({
      ...baseInput,
      itemSubtotalUsd: price,
      materialCostTry: cost.materialCostTry,
      laborHours: cost.laborHours,
      laborHourlyRateTry: cost.laborHourlyRateTry,
      packagingCostTry: cost.packagingCostTry,
      additionalDirectCostTry: cost.additionalDirectCostTry,
      monthlyOverheadTry: monthlyOverhead,
      expectedMonthlyOrders: legalProfile?.expectedMonthlyOrders ?? 1,
      taxReserveRate: legalProfile?.incomeTaxReserveRate ?? 0,
      businessStatus:
        legalProfile?.operatingMode === "SOLE_PROPRIETORSHIP"
          ? "SOLE_PROPRIETORSHIP"
          : "INDIVIDUAL_UNREGISTERED",
      vatTreatment:
        legalProfile?.sellerFeeVatTreatment === "ETSY_CHARGES_SELLER_FEE_VAT"
          ? "CHARGED_BY_ETSY"
          : "ACCOUNTANT_MANAGED",
      internationalShippingUsd: shipping?.shippingCost ?? 0,
      shippingInsuranceUsd: shipping?.insuranceCost ?? 0,
      customsDutyUsd: duty,
      additionalTariffUsd: tariff,
      carrierProcessingFeeUsd: customs?.carrierProcessingFee ?? 0,
      brokerageFeeUsd: customs?.brokerageFee ?? 0,
      customsClearanceFeeUsd: customs?.customsClearanceFee ?? 0,
      destinationFeesUsd:
        customs?.otherDestinationFee.plus(customs.destinationTax) ?? 0,
      usdTryRate: rate,
      offsiteAdAttributed: v.offsiteAds,
    });
    return [
      {
        id: p.id,
        profitUsd: calc.totals.estimatedAfterReserveProfit,
        laborHours: cost.laborHours,
        stock: p.oneOfOne ? Math.min(1, listing.quantity) : listing.quantity,
        price,
        material: cost.materialCostTry,
        fees: calc.totals.totalEtsyFees,
        logistics: calc.totals.internationalShippingUsd.plus(
          calc.totals.customsAndTariffUsd,
        ),
      },
    ];
  });
  const targetUsd =
    goal.targetProfitCurrency === "USD"
      ? goal.targetProfitAmount
      : goal.targetProfitAmount.div(rate);
  const optimized = optimizeProductMix(candidates, {
    targetProfitUsd: targetUsd,
    maxUnits: v.maxUnits,
    maxLaborHours: v.maxLaborHours,
    maxStates: 100000,
  });
  const best = optimized.result as null | {
    quantities: number[];
    profit: Decimal;
    labor: Decimal;
    units: number;
  };
  await prisma.$transaction(async (tx) => {
    const scenario = await tx.goalScenario.create({
      data: {
        profitGoalId: goal.id,
        profitGoalVersionId: goal.versions[0]?.id,
        name: `Inventory ${v.offsiteAds ? "with" : "without"} Offsite Ads`,
        planningMode: "CURRENT_INVENTORY",
        objective: "MINIMUM_UNITS",
        settingsJson: {
          maxUnits: v.maxUnits,
          maxLaborHours: v.maxLaborHours,
          offsiteAds: v.offsiteAds,
        },
        exactResult: optimized.exact,
        products: {
          create: candidates.flatMap((p, i) =>
            best && best.quantities[i] > 0
              ? [
                  {
                    productId: p.id,
                    quantity: best.quantities[i],
                    unitProfitUsd: p.profitUsd,
                    laborHours: p.laborHours,
                  },
                ]
              : [],
          ),
        },
      },
    });
    await tx.goalScenarioResult.create({
      data: {
        goalScenarioId: scenario.id,
        estimatedProfitUsd: best?.profit ?? 0,
        estimatedProfitTry: (best?.profit ?? new Decimal(0)).mul(rate),
        requiredUnits: best?.units,
        requiredRevenueUsd: candidates.reduce(
          (s, p, i) => s.plus(best ? p.price.mul(best.quantities[i]) : 0),
          new Decimal(0),
        ),
        totalLaborHours: best?.labor ?? 0,
        totalFeesUsd: candidates.reduce(
          (s, p, i) => s.plus(best ? p.fees.mul(best.quantities[i]) : 0),
          new Decimal(0),
        ),
        totalLogisticsUsd: candidates.reduce(
          (s, p, i) => s.plus(best ? p.logistics.mul(best.quantities[i]) : 0),
          new Decimal(0),
        ),
        totalMaterialsTry: candidates.reduce(
          (s, p, i) => s.plus(best ? p.material.mul(best.quantities[i]) : 0),
          new Decimal(0),
        ),
        targetAchievementPercent: best
          ? best.profit.div(targetUsd).mul(100)
          : 0,
        warningsJson: best
          ? []
          : ["Current inventory and constraints cannot reach the target."],
        calculationSnapshotJson: {
          targetUsd: targetUsd.toString(),
          visitedStates: optimized.visitedStates,
          exact: optimized.exact,
          offsiteAds: v.offsiteAds,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "GoalScenario",
        entityId: scenario.id,
        action: "CALCULATED",
        actor,
      },
    });
  });
  revalidatePath("/goals");
}

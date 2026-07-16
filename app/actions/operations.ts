"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const text = z.string().trim().min(1);
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);
const decimal = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d+)?$/);
const positiveDecimal = decimal.refine(
  (value) => !value.startsWith("-") && value !== "0",
);
const date = z.coerce.date();
const optionalDecimal = z.preprocess(
  (value) => (value === "" ? undefined : value),
  decimal.optional(),
);
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.date().optional(),
);
const optionalDay = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().min(1).max(31).optional(),
);
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(true)])
  .optional()
  .transform(Boolean);

async function actor(path: string) {
  const session = await requireAdmin({ redirectTo: path });
  return session.user?.email ?? "ADMIN";
}

async function audit(input: {
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  after: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actor: input.actor,
      afterJson: JSON.stringify(input.after),
    },
  });
}

export async function createBusinessPersonAction(formData: FormData) {
  const admin = await actor("/business");
  const value = z
    .object({
      fullName: text,
      displayName: optionalText,
      relationshipToOwner: optionalText,
      role: z.enum([
        "LEGAL_OWNER",
        "BUSINESS_OPERATOR",
        "ETSY_ACCOUNT_HOLDER",
        "EXPORTER",
        "INVOICE_ISSUER",
        "BANK_ACCOUNT_HOLDER",
        "MAKER",
        "DESIGNER",
        "PHOTOGRAPHER",
        "SHOP_MANAGER",
        "PACKAGING_OPERATOR",
        "CUSTOMER_SERVICE",
        "EMPLOYEE",
        "SUPPLIER",
        "FAMILY_CONTRIBUTOR",
        "ACCOUNTANT",
        "OTHER",
      ]),
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const person = await prisma.businessPerson.create({
    data: {
      fullName: value.fullName,
      displayName: value.displayName,
      relationshipToOwner: value.relationshipToOwner,
      notes: value.notes,
      roles: {
        create: {
          role: value.role,
          effectiveFrom: new Date(),
          notes: value.notes,
        },
      },
    },
  });
  await audit({
    entityType: "BusinessPerson",
    entityId: person.id,
    action: "CREATED",
    actor: admin,
    after: { fullName: person.fullName, role: value.role },
  });
  revalidatePath("/business");
}

export async function createBankAccountAction(formData: FormData) {
  const admin = await actor("/banking");
  const value = z
    .object({
      businessProfileId: text,
      bankName: text,
      accountName: text,
      ibanMasked: optionalText,
      accountNumberMasked: optionalText,
      currency: text.transform((v) => v.toUpperCase()),
      accountType: text,
      businessDedicated: checkbox,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const account = await prisma.bankAccount.create({ data: value });
  await audit({
    entityType: "BankAccount",
    entityId: account.id,
    action: "CREATED",
    actor: admin,
    after: {
      bankName: account.bankName,
      currency: account.currency,
      businessDedicated: account.businessDedicated,
    },
  });
  revalidatePath("/banking");
}

export async function createPaymentCardAction(formData: FormData) {
  const admin = await actor("/banking");
  const value = z
    .object({
      businessProfileId: text,
      issuer: text,
      cardholderName: text,
      lastFourDigits: z.string().regex(/^\d{4}$/),
      currency: text.transform((v) => v.toUpperCase()),
      cardType: text,
      businessDedicated: checkbox,
      statementClosingDay: optionalDay,
      paymentDueDay: optionalDay,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const card = await prisma.paymentCard.create({ data: value });
  await audit({
    entityType: "PaymentCard",
    entityId: card.id,
    action: "CREATED",
    actor: admin,
    after: { issuer: card.issuer, lastFourDigits: card.lastFourDigits },
  });
  revalidatePath("/banking");
}

export async function createOwnerTransactionAction(formData: FormData) {
  const admin = await actor("/banking");
  const value = z
    .object({
      businessProfileId: text,
      transactionDate: date,
      type: z.enum([
        "CAPITAL_CONTRIBUTION",
        "OWNER_ADVANCE",
        "OWNER_REIMBURSEMENT",
        "OWNER_WITHDRAWAL",
        "BUSINESS_EXPENSE_PAID_PERSONALLY",
        "PERSONAL_EXPENSE_PAID_BY_BUSINESS",
        "CORRECTION",
      ]),
      amount: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
      description: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.ownerTransaction.create({ data: value });
  await audit({
    entityType: "OwnerTransaction",
    entityId: record.id,
    action: "CREATED",
    actor: admin,
    after: {
      type: record.type,
      amount: value.amount,
      currency: record.currency,
    },
  });
  revalidatePath("/banking");
}

export async function createBankTransactionAction(formData: FormData) {
  const admin = await actor("/banking");
  const value = z
    .object({
      accountId: text,
      externalReference: optionalText,
      transactionDate: date,
      valueDate: optionalDate,
      amount: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
      direction: z.enum(["CREDIT", "DEBIT"]),
      description: text,
      counterparty: optionalText,
      category: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.bankTransaction.create({ data: value });
  await audit({
    entityType: "BankTransaction",
    entityId: record.id,
    action: "MANUAL_ENTRY_CREATED",
    actor: admin,
    after: {
      accountId: record.accountId,
      direction: record.direction,
      amount: value.amount,
      currency: record.currency,
    },
  });
  revalidatePath("/banking");
}

export async function createBankTransactionMatchAction(formData: FormData) {
  const admin = await actor("/banking");
  const value = z
    .object({
      bankTransactionId: text,
      targetType: text,
      targetId: text,
      amount: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
    })
    .parse(Object.fromEntries(formData));
  const match = await prisma.bankTransactionMatch.create({
    data: { ...value, confirmed: true },
  });
  await prisma.bankTransaction.update({
    where: { id: value.bankTransactionId },
    data: { reconciliationStatus: "MATCHED" },
  });
  await audit({
    entityType: "BankTransactionMatch",
    entityId: match.id,
    action: "CONFIRMED",
    actor: admin,
    after: {
      targetType: match.targetType,
      targetId: match.targetId,
      amount: value.amount,
    },
  });
  revalidatePath("/banking");
}

export async function createEtsyPayoutReconciliationAction(formData: FormData) {
  const admin = await actor("/etsy-payouts");
  const value = z
    .object({
      payoutId: text,
      targetType: z.enum([
        "BANK_TRANSACTION",
        "ORDER",
        "LEDGER_ENTRY",
        "FX_DIFFERENCE",
      ]),
      targetId: text,
      amount: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
      fxDifferenceTry: optionalDecimal,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.etsyPayoutReconciliation.create({
    data: { ...value, confirmed: true },
  });
  await audit({
    entityType: "EtsyPayoutReconciliation",
    entityId: record.id,
    action: "CONFIRMED",
    actor: admin,
    after: {
      payoutId: record.payoutId,
      targetType: record.targetType,
      amount: value.amount,
    },
  });
  revalidatePath("/etsy-payouts");
}

export async function createExpenseAction(formData: FormData) {
  const admin = await actor("/expenses");
  const value = z
    .object({
      businessProfileId: text,
      expenseDate: date,
      supplierName: optionalText,
      description: text,
      category: text,
      subcategory: optionalText,
      netAmount: decimal,
      vatAmount: decimal,
      grossAmount: decimal,
      currency: text.transform((v) => v.toUpperCase()),
      exchangeRate: optionalDecimal,
      grossAmountTry: decimal,
      paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID", "REFUNDED"]),
      documentType: optionalText,
      documentNumber: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const expense = await prisma.expense.create({
    data: {
      ...value,
      deductibilityStatus: "UNKNOWN",
      vatDeductibilityStatus: "UNKNOWN",
      accountantReviewStatus: "PENDING_ACCOUNTANT_CONFIRMATION",
    },
  });
  await audit({
    entityType: "Expense",
    entityId: expense.id,
    action: "CREATED",
    actor: admin,
    after: {
      category: expense.category,
      grossAmount: value.grossAmount,
      currency: expense.currency,
      deductibilityStatus: "UNKNOWN",
    },
  });
  revalidatePath("/expenses");
}

export async function createRecurringExpenseAction(formData: FormData) {
  const admin = await actor("/expenses");
  const value = z
    .object({
      businessProfileId: text,
      name: text,
      category: text,
      expectedAmount: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
      recurrenceRule: text,
      nextDueAt: optionalDate,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.recurringExpense.create({ data: value });
  await audit({
    entityType: "RecurringExpense",
    entityId: record.id,
    action: "CREATED",
    actor: admin,
    after: { name: record.name, recurrenceRule: record.recurrenceRule },
  });
  revalidatePath("/expenses");
}

export async function createFixedAssetAction(formData: FormData) {
  const admin = await actor("/expenses");
  const value = z
    .object({
      businessProfileId: text,
      name: text,
      category: text,
      acquisitionDate: date,
      acquisitionCost: positiveDecimal,
      currency: text.transform((v) => v.toUpperCase()),
      acquisitionCostTry: positiveDecimal,
      carryingValue: positiveDecimal,
      usefulLifeMonths: optionalPositiveInt,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const asset = await prisma.fixedAsset.create({ data: value });
  await audit({
    entityType: "FixedAsset",
    entityId: asset.id,
    action: "CREATED",
    actor: admin,
    after: {
      name: asset.name,
      costTry: value.acquisitionCostTry,
      review: "PENDING_ACCOUNTANT_CONFIRMATION",
    },
  });
  revalidatePath("/expenses");
}

export async function createMaterialAction(formData: FormData) {
  const admin = await actor("/materials");
  const value = z
    .object({
      sku: text,
      name: text,
      unit: text,
      reorderPoint: optionalDecimal,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const material = await prisma.material.create({ data: value });
  await audit({
    entityType: "Material",
    entityId: material.id,
    action: "CREATED",
    actor: admin,
    after: { sku: material.sku, name: material.name },
  });
  revalidatePath("/materials");
}

export async function receiveMaterialLotAction(formData: FormData) {
  const admin = await actor("/materials");
  const value = z
    .object({
      materialId: text,
      purchasedAt: date,
      quantity: positiveDecimal,
      unitCostTry: positiveDecimal,
      supplierName: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const lot = await prisma.$transaction(async (tx) => {
    const created = await tx.materialPurchaseLot.create({
      data: { ...value, remaining: value.quantity },
    });
    await tx.materialInventoryTransaction.create({
      data: {
        materialId: value.materialId,
        transactionAt: value.purchasedAt,
        type: "PURCHASE_RECEIPT",
        quantity: value.quantity,
        referenceType: "MaterialPurchaseLot",
        referenceId: created.id,
      },
    });
    return created;
  });
  await audit({
    entityType: "MaterialPurchaseLot",
    entityId: lot.id,
    action: "RECEIVED",
    actor: admin,
    after: {
      materialId: value.materialId,
      quantity: value.quantity,
      unitCostTry: value.unitCostTry,
    },
  });
  revalidatePath("/materials");
  revalidatePath("/inventory");
}

export async function createProductionBatchAction(formData: FormData) {
  const admin = await actor("/production");
  const value = z
    .object({
      batchCode: text,
      productTemplateId: text,
      makerPersonId: text,
      startDate: date,
      plannedQuantity: z.coerce.number().int().positive(),
      totalLaborHours: decimal,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const batch = await prisma.productionBatch.create({
    data: { ...value, status: "PLANNED" },
  });
  await audit({
    entityType: "ProductionBatch",
    entityId: batch.id,
    action: "CREATED",
    actor: admin,
    after: {
      batchCode: batch.batchCode,
      plannedQuantity: batch.plannedQuantity,
    },
  });
  revalidatePath("/production");
}

export async function createProductionUnitAction(formData: FormData) {
  const admin = await actor("/production");
  const value = z
    .object({
      batchId: text,
      localSku: text,
      serialNumber: optionalText,
      oneOfOne: checkbox,
      productCostSnapshot: z.string().trim().min(2),
    })
    .parse(Object.fromEntries(formData));
  const snapshot = z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(value.productCostSnapshot)) as Prisma.InputJsonValue;
  const unit = await prisma.productionUnit.create({
    data: {
      batchId: value.batchId,
      localSku: value.localSku,
      serialNumber: value.serialNumber,
      oneOfOne: value.oneOfOne,
      productCostSnapshot: snapshot,
      completedAt: new Date(),
      qualityStatus: "PASSED",
      inventoryStatus: "AVAILABLE",
    },
  });
  await prisma.productionBatch.update({
    where: { id: value.batchId },
    data: { completedQuantity: { increment: 1 } },
  });
  await audit({
    entityType: "ProductionUnit",
    entityId: unit.id,
    action: "COMPLETED",
    actor: admin,
    after: { localSku: unit.localSku, inventoryStatus: unit.inventoryStatus },
  });
  revalidatePath("/production");
  revalidatePath("/inventory");
}

export async function createSalesDocumentAction(formData: FormData) {
  const admin = await actor("/invoices");
  const value = z
    .object({
      orderId: optionalText,
      documentType: text,
      documentNumber: optionalText,
      currency: text.transform((v) => v.toUpperCase()),
      netAmount: decimal,
      vatAmount: decimal,
      grossAmount: decimal,
    })
    .parse(Object.fromEntries(formData));
  const document = await prisma.salesDocument.create({
    data: {
      ...value,
      validationJson: {
        issuerConfirmed: false,
        taxTreatmentConfirmed: false,
        providerSubmissionSupported: false,
      },
    },
  });
  await audit({
    entityType: "SalesDocument",
    entityId: document.id,
    action: "DRAFT_CREATED",
    actor: admin,
    after: { type: document.documentType, status: document.status },
  });
  revalidatePath("/invoices");
}

export async function createCustomsProfileAction(formData: FormData) {
  const admin = await actor("/customs-etgb");
  const value = z
    .object({
      name: text,
      originCountry: z.string().length(2),
      destinationCountry: z.string().length(2),
      incoterm: optionalText,
      effectiveFrom: date,
      source: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const profile = await prisma.customsProfile.create({
    data: {
      ...value,
      originCountry: value.originCountry.toUpperCase(),
      destinationCountry: value.destinationCountry.toUpperCase(),
    },
  });
  await audit({
    entityType: "CustomsProfile",
    entityId: profile.id,
    action: "CREATED",
    actor: admin,
    after: {
      route: `${profile.originCountry}-${profile.destinationCountry}`,
      confirmation: profile.confirmationStatus,
    },
  });
  revalidatePath("/customs-etgb");
}

export async function createTariffVersionAction(formData: FormData) {
  const admin = await actor("/customs-etgb");
  const value = z
    .object({
      hsCode: text,
      productDescription: text,
      material: optionalText,
      originCountry: z.string().length(2),
      destinationCountry: z.string().length(2),
      dutyRate: optionalDecimal,
      effectiveFrom: date,
      source: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const tariff = await prisma.tariffVersion.create({
    data: {
      ...value,
      originCountry: value.originCountry.toUpperCase(),
      destinationCountry: value.destinationCountry.toUpperCase(),
    },
  });
  await audit({
    entityType: "TariffVersion",
    entityId: tariff.id,
    action: "CREATED",
    actor: admin,
    after: { hsCode: tariff.hsCode, confirmation: tariff.confirmationStatus },
  });
  revalidatePath("/customs-etgb");
}

export async function createMicroExportCaseAction(formData: FormData) {
  const admin = await actor("/customs-etgb");
  const value = z
    .object({
      orderId: optionalText,
      exporterName: text,
      shipmentId: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.microExportCase.create({ data: value });
  await audit({
    entityType: "MicroExportCase",
    entityId: record.id,
    action: "CREATED",
    actor: admin,
    after: { orderId: record.orderId, etgbStatus: record.etgbStatus },
  });
  revalidatePath("/customs-etgb");
}

export async function createTaxRuleAction(formData: FormData) {
  const admin = await actor("/taxes");
  const value = z
    .object({
      name: text,
      taxType: text,
      rate: optionalDecimal,
      threshold: optionalDecimal,
      currency: optionalText,
      effectiveFrom: date,
      source: optionalText,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const rule = await prisma.taxRuleVersion.create({ data: value });
  await audit({
    entityType: "TaxRuleVersion",
    entityId: rule.id,
    action: "CREATED",
    actor: admin,
    after: { taxType: rule.taxType, confirmation: rule.confirmationStatus },
  });
  revalidatePath("/taxes");
}

export async function createTaxObligationAction(formData: FormData) {
  const admin = await actor("/taxes");
  const value = z
    .object({
      taxType: text,
      periodStart: date,
      periodEnd: date,
      dueDate: date,
      estimatedAmount: optionalDecimal,
      currency: text.transform((v) => v.toUpperCase()),
    })
    .parse(Object.fromEntries(formData));
  const obligation = await prisma.taxObligation.create({ data: value });
  await audit({
    entityType: "TaxObligation",
    entityId: obligation.id,
    action: "CREATED",
    actor: admin,
    after: { taxType: obligation.taxType, dueDate: obligation.dueDate },
  });
  revalidatePath("/taxes");
}

export async function upsertVatPeriodAction(formData: FormData) {
  const admin = await actor("/taxes");
  const value = z
    .object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
      outputVat: decimal,
      inputVat: decimal,
      estimatedPayable: decimal,
      filedPayable: optionalDecimal,
    })
    .parse(Object.fromEntries(formData));
  const period = await prisma.vatPeriod.upsert({
    where: { year_month: { year: value.year, month: value.month } },
    update: {
      outputVat: value.outputVat,
      inputVat: value.inputVat,
      estimatedPayable: value.estimatedPayable,
      filedPayable: value.filedPayable,
    },
    create: value,
  });
  await audit({
    entityType: "VatPeriod",
    entityId: period.id,
    action: "UPSERTED",
    actor: admin,
    after: {
      year: period.year,
      month: period.month,
      estimatedPayable: value.estimatedPayable,
      filed: Boolean(value.filedPayable),
    },
  });
  revalidatePath("/taxes");
}

export async function upsertIncomeTaxEstimateAction(formData: FormData) {
  const admin = await actor("/taxes");
  const value = z
    .object({
      year: z.coerce.number().int().min(2020).max(2100),
      period: text,
      taxableBusinessBase: decimal,
      salaryIncomeIncluded: checkbox,
      estimatedTax: decimal,
      currency: text.transform((v) => v.toUpperCase()),
      assumptions: text,
    })
    .parse(Object.fromEntries(formData));
  const assumptionsJson = {
    professionalInput: value.assumptions,
    automaticLegalConclusion: false,
  } satisfies Prisma.InputJsonValue;
  const estimate = await prisma.incomeTaxEstimate.upsert({
    where: { year_period: { year: value.year, period: value.period } },
    update: {
      taxableBusinessBase: value.taxableBusinessBase,
      salaryIncomeIncluded: value.salaryIncomeIncluded,
      estimatedTax: value.estimatedTax,
      currency: value.currency,
      assumptionsJson,
    },
    create: {
      year: value.year,
      period: value.period,
      taxableBusinessBase: value.taxableBusinessBase,
      salaryIncomeIncluded: value.salaryIncomeIncluded,
      estimatedTax: value.estimatedTax,
      currency: value.currency,
      assumptionsJson,
    },
  });
  await audit({
    entityType: "IncomeTaxEstimate",
    entityId: estimate.id,
    action: "UPSERTED",
    actor: admin,
    after: {
      year: estimate.year,
      period: estimate.period,
      estimatedTax: value.estimatedTax,
      salaryIncomeIncluded: estimate.salaryIncomeIncluded,
    },
  });
  revalidatePath("/taxes");
}

export async function createSgkMonthAction(formData: FormData) {
  const admin = await actor("/sgk");
  const value = z
    .object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
      fourAActive: z.enum(["UNKNOWN", "YES", "NO"]),
      fourBStatus: text,
      debtAmount: optionalDecimal,
      paymentAmount: optionalDecimal,
      notes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const record = await prisma.sgkMonthStatus.upsert({
    where: { year_month: { year: value.year, month: value.month } },
    update: {
      fourAActive:
        value.fourAActive === "UNKNOWN" ? null : value.fourAActive === "YES",
      fourBStatus: value.fourBStatus,
      debtAmount: value.debtAmount,
      paymentAmount: value.paymentAmount,
      notes: value.notes,
    },
    create: {
      year: value.year,
      month: value.month,
      fourAActive:
        value.fourAActive === "UNKNOWN" ? null : value.fourAActive === "YES",
      fourBStatus: value.fourBStatus,
      debtAmount: value.debtAmount,
      paymentAmount: value.paymentAmount,
      notes: value.notes,
    },
  });
  await audit({
    entityType: "SgkMonthStatus",
    entityId: record.id,
    action: "UPSERTED",
    actor: admin,
    after: {
      year: record.year,
      month: record.month,
      confirmation: record.confirmationStatus,
    },
  });
  revalidatePath("/sgk");
}

export async function createAccountantPeriodAction(formData: FormData) {
  const admin = await actor("/accountant");
  const value = z
    .object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
      expectedDocuments: z.coerce.number().int().nonnegative(),
    })
    .parse(Object.fromEntries(formData));
  const period = await prisma.accountantPeriod.upsert({
    where: { year_month: { year: value.year, month: value.month } },
    update: { expectedDocuments: value.expectedDocuments },
    create: value,
  });
  await audit({
    entityType: "AccountantPeriod",
    entityId: period.id,
    action: "UPSERTED",
    actor: admin,
    after: {
      year: period.year,
      month: period.month,
      expectedDocuments: period.expectedDocuments,
    },
  });
  revalidatePath("/accountant");
}

export async function updateAccountantPeriodStatusAction(formData: FormData) {
  const admin = await actor("/accountant");
  const value = z
    .object({
      id: text,
      status: z.enum([
        "OPEN",
        "COLLECTING",
        "READY",
        "SENT_TO_ACCOUNTANT",
        "ACCOUNTANT_REVIEW",
        "COMPLETED",
        "LOCKED",
        "REOPENED",
      ]),
      accountantNotes: optionalText,
    })
    .parse(Object.fromEntries(formData));
  const period = await prisma.accountantPeriod.update({
    where: { id: value.id },
    data: {
      status: value.status,
      accountantNotes: value.accountantNotes,
      sentAt: value.status === "SENT_TO_ACCOUNTANT" ? new Date() : undefined,
      lockedAt:
        value.status === "LOCKED"
          ? new Date()
          : value.status === "REOPENED"
            ? null
            : undefined,
    },
  });
  await audit({
    entityType: "AccountantPeriod",
    entityId: period.id,
    action: "STATUS_CHANGED",
    actor: admin,
    after: { status: period.status },
  });
  revalidatePath("/accountant");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { createExchangeRate } from "@/lib/server/repositories/exchange-rate-repository";
import {
  createProductCostVersion,
  createReportingCurrencyVersion,
  saveProductShippingOverride,
  saveWorkspaceShippingDefault,
} from "@/lib/server/repositories/profitability-repository";
import { recalculateProduct } from "@/lib/server/services/profitability-service";

const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);
const country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const decimal = z.string().trim().regex(/^\d+(?:\.\d+)?$/);
const optionalDecimal = z.union([decimal, z.literal("")]).transform((value) => value || null);

export async function recalculateProductAction(formData: FormData) {
  const input = z.object({ productId: z.string().min(1), destinationCountry: country }).parse(Object.fromEntries(formData));
  await recalculateProduct(await requireWorkspaceContext(), input.productId, input.destinationCountry);
  revalidatePath(`/app/products/${input.productId}`);
  revalidatePath("/app");
}

export async function saveProductCostsAction(formData: FormData) {
  const input = z.object({ productId: z.string().min(1), materialCost: decimal, labourHours: decimal, cashLabourRate: decimal, economicLabourRate: optionalDecimal, packagingCost: decimal, otherDirectCost: decimal, wastageRate: decimal }).parse(Object.fromEntries(formData));
  await createProductCostVersion(await requireWorkspaceContext(), input);
  revalidatePath(`/app/products/${input.productId}`);
  revalidatePath("/app/products");
}

export async function saveProductShippingAction(formData: FormData) {
  const input = z.object({ productId: z.string().min(1), destinationCountry: country, shippingCost: optionalDecimal, shippingCurrency: currency, customsResponsibility: z.enum(["SELLER", "BUYER", "UNKNOWN"]), sellerPaidCustomsCost: optionalDecimal, customsCurrency: z.union([currency, z.literal("")]).transform((value) => value || null) }).parse(Object.fromEntries(formData));
  await saveProductShippingOverride(await requireWorkspaceContext(), input);
  revalidatePath(`/app/products/${input.productId}`);
  revalidatePath("/app/products");
}

export async function saveWorkspaceShippingAction(formData: FormData) {
  const input = z.object({ destinationCountry: country, shippingCost: optionalDecimal, shippingCurrency: currency, customsResponsibility: z.enum(["SELLER", "BUYER", "UNKNOWN"]), sellerPaidCustomsCost: optionalDecimal, customsCurrency: z.union([currency, z.literal("")]).transform((value) => value || null), targetMarginPercent: decimal }).parse(Object.fromEntries(formData));
  await saveWorkspaceShippingDefault(await requireWorkspaceContext(), input);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

export async function saveExchangeRateAction(formData: FormData) {
  const input = z.object({ baseCurrency: currency, quoteCurrency: currency, rate: decimal, capturedAt: z.string().datetime() }).parse(Object.fromEntries(formData));
  await createExchangeRate(await requireWorkspaceContext(), { ...input, source: "MANUAL_WORKSPACE_SETTING", capturedAt: new Date(input.capturedAt) });
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

export async function saveReportingCurrencyAction(formData: FormData) {
  const { reportingCurrency } = z.object({ reportingCurrency: currency }).parse(Object.fromEntries(formData));
  await createReportingCurrencyVersion(await requireWorkspaceContext(), reportingCurrency);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

export async function queueWorkspaceCalculationAction() {
  const context = await requireWorkspaceContext();
  const minute = Math.floor(Date.now() / 60_000);
  await inngest.send({ id: `profitability:${context.workspaceId}:${minute}`, name: "profitability/workspace.recalculate", data: { workspaceId: context.workspaceId } });
  revalidatePath("/app");
}

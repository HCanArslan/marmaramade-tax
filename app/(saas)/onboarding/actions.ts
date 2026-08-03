"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { chooseBusiness, chooseCosts, chooseMarket, completeOnboarding, confirmEtsy } from "@/lib/server/services/onboarding-service";

const decimal = z.string().trim().regex(/^\d+(?:\.\d{1,4})?$/).refine((value) => Number(value) >= 0 && Number(value) <= 1_000_000);
const currency = z.enum(["TRY", "USD", "EUR", "GBP", "CAD", "AUD"]);
const country = z.enum(["TR", "US", "EU", "GB", "CA", "AU", "OTHER"]);

function onboardingError(step: number): never {
  redirect(`/onboarding?error=invalid&step=${step}`);
}

export async function confirmEtsyAction() {
  const context = await requireWorkspaceContext();
  try { await confirmEtsy(context); } catch { onboardingError(1); }
  redirect("/onboarding");
}

export async function businessAction(formData: FormData) {
  const input = z.object({
    businessType: z.enum(["NO_REGISTERED_BUSINESS", "ARTISAN_EXEMPTION", "SOLE_PROPRIETORSHIP", "LIMITED_OR_CORPORATION", "OTHER_OR_UNKNOWN"]),
    reportingCurrency: currency,
    acknowledgement: z.literal("accepted"),
  }).safeParse(Object.fromEntries(formData));
  if (!input.success) onboardingError(2);
  const context = await requireWorkspaceContext();
  try { await chooseBusiness(context, input.data); } catch { onboardingError(2); }
  redirect("/onboarding");
}

export async function costsAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const input = z.object({
    averageLaborHours: decimal,
    hourlyLaborValue: decimal,
    packagingCost: decimal,
    materialWastagePercentage: decimal.refine((value) => Number(value) <= 100),
    exportHandlingCost: decimal,
    monthlyOverhead: z.union([decimal, z.literal("")]),
    currency,
    confirmApply: z.literal("accepted"),
  }).safeParse(raw);
  if (!input.success) onboardingError(3);
  const context = await requireWorkspaceContext();
  try { await chooseCosts(context, { ...input.data, monthlyOverhead: input.data.monthlyOverhead || null }); } catch { onboardingError(3); }
  redirect("/onboarding");
}

export async function marketAction(formData: FormData) {
  const input = z.object({
    targetMarket: country.exclude(["TR"]),
    sellerCountry: country,
    originCountry: country,
    shippingCost: z.union([decimal, z.literal("")]),
    shippingCurrency: currency,
    customsResponsibility: z.enum(["SELLER", "BUYER", "UNKNOWN"]),
    reportingCurrency: currency,
    marketplaceCurrency: currency,
  }).safeParse(Object.fromEntries(formData));
  if (!input.success) onboardingError(4);
  const context = await requireWorkspaceContext();
  try { await chooseMarket(context, { ...input.data, shippingCost: input.data.shippingCost || null }); } catch { onboardingError(4); }
  redirect("/onboarding");
}

export async function completeAction(formData: FormData) {
  const accepted = z.object({ terms: z.literal("accepted"), privacy: z.literal("accepted"), estimates: z.literal("accepted") }).safeParse(Object.fromEntries(formData));
  if (!accepted.success) onboardingError(5);
  const context = await requireWorkspaceContext();
  try { await completeOnboarding(context); } catch { onboardingError(5); }
  redirect("/app");
}

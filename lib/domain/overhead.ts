import Decimal from "decimal.js";
import type { DecimalInput } from "./money";

export interface MonthlyOverheadAmounts {
  accountantTry: DecimalInput;
  socialSecurityTry: DecimalInput;
  softwareTry: DecimalInput;
  bankingTry: DecimalInput;
  officeTry: DecimalInput;
  otherTry: DecimalInput;
  etsyPlusTry: DecimalInput;
}

export interface RecurringBusinessCostInput {
  amount: DecimalInput;
  currency: "TRY" | "USD";
  billingFrequency: "MONTHLY" | "ANNUAL";
  vatRate: DecimalInput;
}

export const ANNUAL_BUSINESS_BUDGET_IDS = {
  mukellef: "annual_budget_mukellef",
  chatgpt: "annual_budget_chatgpt",
  packaging: "annual_budget_packaging",
  etsy: "annual_budget_etsy",
} as const;

export const ANNUAL_BUSINESS_BUDGET_DEFAULTS = {
  mukellefMonthlyNetTry: "2999",
  mukellefVatRate: "20",
  chatgptMonthlyGrossUsd: "24",
  packagingAnnualTry: "1500",
  etsyMonthlyTry: "480",
} as const;

export const annualBusinessBudgetIds = Object.values(
  ANNUAL_BUSINESS_BUDGET_IDS,
);

export function monthStartUtc(value: Date, timeZone = "Europe/Istanbul") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function monthlyOverheadTotalTry(values: MonthlyOverheadAmounts) {
  return [
    values.accountantTry,
    values.socialSecurityTry,
    values.softwareTry,
    values.bankingTry,
    values.officeTry,
    values.otherTry,
    values.etsyPlusTry,
  ].reduce<Decimal>((total, value) => total.plus(value), new Decimal(0));
}

export function annualizeRecurringBusinessCost(
  input: RecurringBusinessCostInput,
  usdTryRate: DecimalInput,
) {
  const amount = Decimal.max(0, input.amount);
  const vatRate = Decimal.max(0, input.vatRate).div(100);
  const periods = input.billingFrequency === "MONTHLY" ? 12 : 1;
  const annualNetNative = amount.mul(periods);
  const annualVatNative = annualNetNative.mul(vatRate);
  const annualGrossNative = annualNetNative.plus(annualVatNative);
  const annualGrossTry =
    input.currency === "USD"
      ? annualGrossNative.mul(usdTryRate)
      : annualGrossNative;
  return {
    annualNetNative,
    annualVatNative,
    annualGrossNative,
    annualGrossTry,
  };
}

export function resolveAnnualPlanOverhead(
  annualOverheadTry: DecimalInput,
  plannedUnits: DecimalInput,
) {
  const totalPlanOverheadTry = Decimal.max(0, annualOverheadTry);
  const units = Decimal.max(0, plannedUnits);
  return {
    allocationMethod: "MANUAL_PER_ORDER" as const,
    manualOverheadPerOrderTry: units.gt(0)
      ? totalPlanOverheadTry.div(units)
      : new Decimal(0),
    totalPlanOverheadTry,
  };
}

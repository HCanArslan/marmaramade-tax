import Decimal from "decimal.js";
import type { DecimalInput } from "./money";
import type { OverheadAllocationMethod } from "./types";

export type PlanOverheadTreatment = "FULL_PERIOD" | "PER_ORDER" | "EXCLUDED";

export interface MonthlyOverheadAmounts {
  accountantTry: DecimalInput;
  socialSecurityTry: DecimalInput;
  softwareTry: DecimalInput;
  bankingTry: DecimalInput;
  officeTry: DecimalInput;
  otherTry: DecimalInput;
  etsyPlusTry: DecimalInput;
}

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

export function resolvePlanOverhead(input: {
  treatment: PlanOverheadTreatment;
  monthlyOverheadTry: DecimalInput;
  horizonMonths: DecimalInput;
  plannedUnits: DecimalInput;
  configuredMethod: OverheadAllocationMethod;
  expectedMonthlyOrders: DecimalInput;
  actualMonthlyOrders: DecimalInput;
  manualOverheadPerOrderTry: DecimalInput;
}) {
  const monthly = Decimal.max(0, input.monthlyOverheadTry);
  const months = Decimal.max(0, input.horizonMonths);
  const units = Decimal.max(0, input.plannedUnits);

  if (input.treatment === "EXCLUDED")
    return {
      allocationMethod: "NONE" as const,
      manualOverheadPerOrderTry: new Decimal(0),
      totalPlanOverheadTry: new Decimal(0),
    };

  if (input.treatment === "FULL_PERIOD") {
    const totalPlanOverheadTry = monthly.mul(months);
    return {
      allocationMethod: "MANUAL_PER_ORDER" as const,
      manualOverheadPerOrderTry: units.gt(0)
        ? totalPlanOverheadTry.div(units)
        : new Decimal(0),
      totalPlanOverheadTry,
    };
  }

  const divisor =
    input.configuredMethod === "ACTUAL_SALES"
      ? new Decimal(input.actualMonthlyOrders)
      : new Decimal(input.expectedMonthlyOrders);
  const configuredManualPerOrder = Decimal.max(
    0,
    input.manualOverheadPerOrderTry,
  );
  const perOrder =
    input.configuredMethod === "NONE"
      ? new Decimal(0)
      : input.configuredMethod === "MANUAL_PER_ORDER"
        ? configuredManualPerOrder
        : divisor.gt(0)
          ? monthly.div(divisor)
          : new Decimal(0);
  return {
    allocationMethod: input.configuredMethod,
    manualOverheadPerOrderTry: configuredManualPerOrder,
    totalPlanOverheadTry: perOrder.mul(units),
  };
}

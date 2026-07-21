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

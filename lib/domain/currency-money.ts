import Decimal from "decimal.js";

export type CurrencyCode = string;
export type GenericMoney = Readonly<{
  amount: Decimal;
  currency: CurrencyCode;
}>;

export const SUPPORTED_CURRENCY_CODES = [
  "TRY",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
] as const;

export function normalizeCurrencyCode(currency: CurrencyCode) {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Currency code must be a three-letter ISO-style code.");
  }
  return normalized;
}

export function genericMoney(
  amount: Decimal.Value,
  currency: CurrencyCode,
): GenericMoney {
  return Object.freeze({
    amount: new Decimal(amount),
    currency: normalizeCurrencyCode(currency),
  });
}

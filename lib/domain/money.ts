import Decimal from "decimal.js";

export type CurrencyCode = "TRY" | "USD";
export type DecimalInput = Decimal.Value;
export type Money = Readonly<{ amount: Decimal; currency: CurrencyCode }>;

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const d = (value: DecimalInput = 0) => new Decimal(value);
export const money = (amount: DecimalInput, currency: CurrencyCode): Money => ({ amount: d(amount), currency });

export function convert(value: Money, usdTryRate: DecimalInput, to: CurrencyCode): Money {
  if (value.currency === to) return money(value.amount, to);
  const rate = d(usdTryRate);
  if (rate.lte(0)) throw new Error("Exchange rate must be positive");
  return money(to === "TRY" ? value.amount.mul(rate) : value.amount.div(rate), to);
}

export const sum = (values: DecimalInput[]) => values.reduce<Decimal>((total, value) => total.plus(value), d(0));
export const pct = (amount: DecimalInput, percentage: DecimalInput) => d(amount).mul(d(percentage).div(100));
export const roundMoney = (value: DecimalInput) => d(value).toDecimalPlaces(2);

export function formatMoney(value: DecimalInput, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(d(value).toNumber());
}

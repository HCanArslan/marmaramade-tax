import { genericMoney, type GenericMoney } from "./currency-money";
import type { ExchangeRate } from "./exchange-rate";

export type ConversionDirection = "BASE_TO_QUOTE" | "QUOTE_TO_BASE";

export type MoneyConversion = Readonly<{
  original: GenericMoney;
  reporting: GenericMoney;
  rate: ExchangeRate;
  direction: ConversionDirection;
}>;

export function convertWithExchangeRate(
  original: GenericMoney,
  rate: ExchangeRate,
  reportingCurrency: string,
): MoneyConversion {
  const target = reportingCurrency.trim().toUpperCase();
  if (original.currency === target) {
    return Object.freeze({
      original,
      reporting: genericMoney(original.amount, target),
      rate,
      direction: "BASE_TO_QUOTE" as const,
    });
  }
  if (original.currency === rate.baseCurrency && target === rate.quoteCurrency) {
    return Object.freeze({
      original,
      reporting: genericMoney(original.amount.mul(rate.rate), target),
      rate,
      direction: "BASE_TO_QUOTE" as const,
    });
  }
  if (original.currency === rate.quoteCurrency && target === rate.baseCurrency) {
    return Object.freeze({
      original,
      reporting: genericMoney(original.amount.div(rate.rate), target),
      rate,
      direction: "QUOTE_TO_BASE" as const,
    });
  }
  throw new Error("Exchange rate does not cover the requested currency pair.");
}

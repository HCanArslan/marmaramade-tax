import Decimal from "decimal.js";
import { normalizeCurrencyCode, type CurrencyCode } from "./currency-money";

export type ExchangeRate = Readonly<{
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  rate: Decimal;
  capturedAt: Date;
  source?: string;
}>;

export function exchangeRate(input: {
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  rate: Decimal.Value;
  capturedAt: Date;
  source?: string;
}): ExchangeRate {
  const rate = new Decimal(input.rate);
  if (!rate.isFinite() || rate.lte(0)) {
    throw new Error("Exchange rate must be positive.");
  }
  if (Number.isNaN(input.capturedAt.getTime())) {
    throw new Error("Exchange-rate capture time is invalid.");
  }
  return Object.freeze({
    baseCurrency: normalizeCurrencyCode(input.baseCurrency),
    quoteCurrency: normalizeCurrencyCode(input.quoteCurrency),
    rate,
    capturedAt: new Date(input.capturedAt.getTime()),
    ...(input.source ? { source: input.source } : {}),
  });
}

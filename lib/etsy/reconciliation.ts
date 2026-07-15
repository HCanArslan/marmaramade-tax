import Decimal from "decimal.js";
export function reconcileFee(expected: Decimal.Value, actual: Decimal.Value) {
  const expectedValue = new Decimal(expected); const actualValue = new Decimal(actual); const difference = actualValue.minus(expectedValue);
  return { expected: expectedValue, actual: actualValue, difference, differencePercentage: expectedValue.eq(0) ? null : difference.div(expectedValue).mul(100) };
}

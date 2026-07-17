import Decimal from "decimal.js";

export type ProgressiveTaxBracket = {
  lowerBound: Decimal.Value;
  upperBound: Decimal.Value | null;
  rate: Decimal.Value;
};

export function calculateProgressiveTax(
  taxableBase: Decimal.Value,
  brackets: ProgressiveTaxBracket[],
) {
  const base = Decimal.max(new Decimal(taxableBase), 0);
  const ordered = [...brackets].sort((a, b) =>
    new Decimal(a.lowerBound).cmp(b.lowerBound),
  );
  let coveredThrough = new Decimal(0);
  let tax = new Decimal(0);

  const lines = ordered.map((bracket) => {
    const lower = new Decimal(bracket.lowerBound);
    const upper =
      bracket.upperBound === null ? null : new Decimal(bracket.upperBound);
    const taxableInBracket = Decimal.max(
      Decimal.min(base, upper ?? base).minus(lower),
      0,
    );
    const amount = taxableInBracket.mul(bracket.rate).div(100);
    if (upper) coveredThrough = Decimal.max(coveredThrough, upper);
    else if (base.gte(lower)) coveredThrough = base;
    tax = tax.plus(amount);
    return {
      lowerBound: lower,
      upperBound: upper,
      rate: new Decimal(bracket.rate),
      taxableAmount: taxableInBracket,
      tax: amount,
    };
  });

  return {
    tax,
    lines,
    fullyCovered: base.lte(coveredThrough),
    uncoveredBase: Decimal.max(base.minus(coveredThrough), 0),
  };
}

export function calculateFlatTax(
  taxableBase: Decimal.Value,
  rate: Decimal.Value,
) {
  return Decimal.max(new Decimal(taxableBase), 0).mul(rate).div(100);
}

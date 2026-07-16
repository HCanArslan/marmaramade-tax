import Decimal from "decimal.js";
import { calculate, solvePrice } from "@/lib/domain/calculator";
import type { CalculatorInput } from "@/lib/domain/types";

export function planAverageProduct(input: CalculatorInput, targetProfitUsd: Decimal.Value) {
  const unit = calculate(input);
  const profit = unit.totals.estimatedAfterReserveProfit;
  const target = new Decimal(targetProfitUsd);
  if (profit.lte(0)) return { feasible: false as const, unitProfitUsd: profit, requiredUnits: null, minimumPriceUsd: solvePrice(input, { kind: "profitUsd", value: Decimal.max(target, 0.01) }) };
  const requiredUnits = target.div(profit).ceil().toNumber();
  return { feasible: true as const, unitProfitUsd: profit, requiredUnits, requiredRevenueUsd: unit.totals.grossRevenue.mul(requiredUnits), requiredLaborHours: new Decimal(input.laborHours).mul(requiredUnits), productsPerWeek: new Decimal(requiredUnits).div(4.345).toDecimalPlaces(2), calculation: unit };
}

export type MixProduct = { id: string; profitUsd: Decimal.Value; laborHours: Decimal.Value; stock: number; reproducible?: boolean };

export function optimizeProductMix(products: MixProduct[], constraints: { targetProfitUsd: Decimal.Value; maxUnits?: number; maxLaborHours?: Decimal.Value; maxStates?: number }) {
  const target = new Decimal(constraints.targetProfitUsd);
  const maxStates = constraints.maxStates ?? 50000;
  let visited = 0;
  let best: { quantities: number[]; profit: Decimal; labor: Decimal; units: number } | null = null;
  const search = (index: number, quantities: number[], profit: Decimal, labor: Decimal, units: number) => {
    if (++visited > maxStates) return;
    if (profit.gte(target) && (!best || units < best.units || (units === best.units && labor.lt(best.labor)))) best = { quantities: [...quantities], profit, labor, units };
    if (index >= products.length || (best && units >= best.units)) return;
    const product = products[index];
    const cap = Math.min(product.stock, constraints.maxUnits === undefined ? product.stock : Math.max(0, constraints.maxUnits - units));
    for (let q = 0; q <= cap; q += 1) {
      const nextLabor = labor.plus(new Decimal(product.laborHours).mul(q));
      if (constraints.maxLaborHours !== undefined && nextLabor.gt(constraints.maxLaborHours)) break;
      quantities[index] = q;
      search(index + 1, quantities, profit.plus(new Decimal(product.profitUsd).mul(q)), nextLabor, units + q);
    }
    quantities[index] = 0;
  };
  search(0, Array(products.length).fill(0), new Decimal(0), new Decimal(0), 0);
  return { result: best, exact: visited <= maxStates, visitedStates: Math.min(visited, maxStates), capped: visited > maxStates };
}

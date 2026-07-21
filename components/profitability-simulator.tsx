"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/domain/money";
import {
  analyzeProfitability,
  overheadSensitivity,
  profitabilityRecommendations,
  solveProfitabilityTarget,
  type ProfitabilityRiskFlag,
  type ProfitabilityTargetKind,
  type ProfitabilityThresholds,
} from "@/lib/domain/profitability";
import type { CalculatorInput } from "@/lib/domain/types";
import type { CalculatorProductPreset } from "./calculator-workspace";

const riskLabels: Record<ProfitabilityRiskFlag, string> = {
  CRITICAL_MARGIN: "Critical margin",
  LOW_PROFIT: "Low profit",
  NEGATIVE_PROFIT: "Negative profit",
  ECONOMIC_LOSS: "Economic loss",
  LABOUR_DATA_MISSING: "Labour data missing",
  SHIPPING_HEAVY: "Shipping-heavy",
  OVERHEAD_HEAVY: "Overhead-heavy",
  CUSTOMS_SENSITIVE: "Customs-sensitive",
};

function productInput(
  base: CalculatorInput,
  product: CalculatorProductPreset,
  price: Decimal.Value,
  discount: Decimal.Value,
  sellerPaysCustoms: boolean,
): CalculatorInput {
  const proposed = new Decimal(price || 0);
  return {
    ...base,
    itemSubtotalUsd: proposed,
    sellerFundedDiscountUsd: proposed.mul(discount || 0).div(100),
    materialCostTry: product.materialCostTry,
    laborHours: product.laborHours,
    laborHourlyRateTry: product.laborHourlyRateTry,
    packagingCostTry: product.packagingCostTry,
    additionalDirectCostTry: product.additionalDirectCostTry,
    internationalShippingUsd: product.internationalShippingUsd,
    shippingInsuranceUsd: product.shippingInsuranceUsd,
    customsDutyUsd: product.customsDutyUsd,
    additionalTariffUsd: product.additionalTariffUsd,
    carrierProcessingFeeUsd: product.carrierProcessingFeeUsd,
    brokerageFeeUsd: product.brokerageFeeUsd,
    customsClearanceFeeUsd: product.customsClearanceFeeUsd,
    destinationFeesUsd: product.destinationFeesUsd,
    includeCustomsInSellerProfit: sellerPaysCustoms,
    etgbCostUsd: product.etgbCostUsd,
    includeEtgbInSellerProfit: product.includeEtgbInSellerProfit,
  };
}

const optionalMoney = (value: Decimal | null) =>
  value ? formatMoney(value, "USD") : "Not configured";
const optionalPercent = (value: Decimal | null) =>
  value ? `${value.toFixed(1)}%` : "N/A";

export function ProfitabilitySimulator({
  products,
  baseInput,
  thresholds,
  targetsSource,
}: {
  products: CalculatorProductPreset[];
  baseInput: CalculatorInput;
  thresholds: ProfitabilityThresholds;
  targetsSource: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId) ?? products[0];
  const [price, setPrice] = useState(product?.discountedPrice ?? "0");
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [sellerPaysCustoms, setSellerPaysCustoms] = useState(false);
  const [targetKind, setTargetKind] =
    useState<ProfitabilityTargetKind>("cashProfit");
  const [targetValue, setTargetValue] = useState("30");

  const chooseProduct = (id: string) => {
    setProductId(id);
    const selected = products.find((item) => item.id === id);
    if (selected) setPrice(selected.discountedPrice);
  };
  const analysis = useMemo(() => {
    if (!product) return null;
    const base = productInput(
      baseInput,
      product,
      price || 0,
      discount || 0,
      sellerPaysCustoms,
    );
    const without = analyzeProfitability({
      calculatorInput: { ...base, includeCustomsInSellerProfit: false },
      economicHourlyRateTry: product.economicHourlyRateTry,
      quantity,
      thresholds,
    });
    const withCustoms = analyzeProfitability({
      calculatorInput: { ...base, includeCustomsInSellerProfit: true },
      economicHourlyRateTry: product.economicHourlyRateTry,
      quantity,
      thresholds,
    });
    return analyzeProfitability({
      calculatorInput: base,
      economicHourlyRateTry: product.economicHourlyRateTry,
      quantity,
      thresholds,
      customsSensitive:
        without.cashProfit.gt(0) && withCustoms.cashProfit.lt(0),
    });
  }, [
    baseInput,
    discount,
    price,
    product,
    quantity,
    sellerPaysCustoms,
    thresholds,
  ]);
  const solver = useMemo(() => {
    if (!product) return null;
    return solveProfitabilityTarget({
      calculatorInput: productInput(
        baseInput,
        product,
        price || 0,
        discount || 0,
        sellerPaysCustoms,
      ),
      economicHourlyRateTry: product.economicHourlyRateTry,
      target: { kind: targetKind, value: targetValue || 0 },
      discountPercent: discount,
      thresholds,
    });
  }, [
    baseInput,
    discount,
    price,
    product,
    sellerPaysCustoms,
    targetKind,
    targetValue,
    thresholds,
  ]);
  const minimumCashSolver = useMemo(() => {
    if (!product) return null;
    return solveProfitabilityTarget({
      calculatorInput: productInput(
        baseInput,
        product,
        price || 0,
        discount || 0,
        sellerPaysCustoms,
      ),
      economicHourlyRateTry: product.economicHourlyRateTry,
      target: {
        kind: "cashProfit",
        value: thresholds.minimumCashProfitUsd,
      },
      discountPercent: discount,
      thresholds,
    });
  }, [baseInput, discount, price, product, sellerPaysCustoms, thresholds]);
  const quickScenarios = useMemo(() => {
    if (!product) return [];
    const current = new Decimal(product.discountedPrice);
    const scenarios = [0, 10, 20, 30].map((increase) => ({
      key: `increase-${increase}`,
      label: increase === 0 ? "Current price" : `Current + $${increase}`,
      scenarioPrice: current.plus(increase),
    }));
    scenarios.push({
      key: "custom",
      label: "Custom price",
      scenarioPrice: new Decimal(price || 0),
    });
    return scenarios.map(({ key, label, scenarioPrice }) => {
      const result = analyzeProfitability({
        calculatorInput: productInput(
          baseInput,
          product,
          scenarioPrice,
          discount || 0,
          sellerPaysCustoms,
        ),
        economicHourlyRateTry: product.economicHourlyRateTry,
        thresholds,
      });
      return { key, label, price: scenarioPrice, result };
    });
  }, [baseInput, discount, price, product, sellerPaysCustoms, thresholds]);
  const sensitivity = useMemo(
    () =>
      product
        ? overheadSensitivity({
            calculatorInput: productInput(
              baseInput,
              product,
              price || 0,
              discount || 0,
              sellerPaysCustoms,
            ),
            economicHourlyRateTry: product.economicHourlyRateTry,
            quantity,
            thresholds,
          })
        : [],
    [
      baseInput,
      discount,
      price,
      product,
      quantity,
      sellerPaysCustoms,
      thresholds,
    ],
  );

  if (!product || !analysis)
    return (
      <section className="card p-5">
        No USD product is available for simulation.
      </section>
    );
  const t = analysis.calculation.totals;
  const recommendations = profitabilityRecommendations(analysis, thresholds);
  if (
    analysis.cashProfit.lt(thresholds.minimumCashProfitUsd) &&
    minimumCashSolver?.success &&
    minimumCashSolver.price &&
    minimumCashSolver.price.gt(price || 0)
  )
    recommendations.push(
      `Increase price by approximately ${formatMoney(
        minimumCashSolver.price.minus(price || 0),
        "USD",
      )} to reach the configured minimum cash-profit target.`,
    );
  return (
    <section className="space-y-5">
      <div className="card p-5 sm:p-6">
        <p className="eyebrow">Interactive price simulator</p>
        <h3 className="mt-1 text-xl font-semibold">
          Test prices without changing Etsy
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Every scenario runs through the canonical Etsy fee, VAT, reserve,
          logistics, overhead, and product-cost engine.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs text-stone-500 xl:col-span-2">
            Product
            <select
              className="field mt-1"
              value={product.id}
              onChange={(e) => chooseProduct(e.target.value)}
            >
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <SimInput
            label="Proposed buyer price"
            value={price}
            onChange={setPrice}
            suffix="USD"
          />
          <SimInput
            label="Planned quantity"
            value={quantity}
            onChange={setQuantity}
            suffix="units"
          />
          <SimInput
            label="Optional discount"
            value={discount}
            onChange={setDiscount}
            suffix="%"
          />
          <label className="flex items-center gap-2 rounded-xl border px-3 text-sm">
            <input
              type="checkbox"
              checked={sellerPaysCustoms}
              onChange={(e) => setSellerPaysCustoms(e.target.checked)}
            />{" "}
            Customs seller-paid
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SimMetric
          label="Cash profit"
          value={formatMoney(analysis.cashProfit, "USD")}
          hint="Configured expenses expected to result in payment."
        />
        <SimMetric
          label="Economic profit"
          value={optionalMoney(analysis.economicProfit)}
          hint="Cash profit less imputed unpaid production labour."
        />
        <SimMetric
          label="Cash margin"
          value={optionalPercent(analysis.cashMarginPercent)}
          hint="Cash profit ÷ seller revenue."
        />
        <SimMetric
          label="Economic margin"
          value={optionalPercent(analysis.economicMarginPercent)}
          hint="Economic profit ÷ seller revenue."
        />
        <SimMetric
          label="Cash profit / hour"
          value={optionalMoney(analysis.cashProfitPerHour)}
          hint="Cash profit per unit ÷ production hours."
        />
        <SimMetric
          label="Economic profit / hour"
          value={optionalMoney(analysis.economicProfitPerHour)}
          hint="Economic profit per unit ÷ production hours."
        />
        <SimMetric
          label="Grade"
          value={`Grade ${analysis.grade}`}
          hint="Uses both configured cash-profit and margin thresholds."
        />
        <SimMetric
          label="Planned production time"
          value={
            analysis.plannedProductionHours
              ? `${analysis.plannedProductionHours.toFixed(2)} hours`
              : "Production time not configured."
          }
          hint={`Source: ${product.productionHoursSource}`}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-semibold">Quick price comparison</h3>
          <p className="mt-1 text-xs text-stone-500">
            Percentage-based fees are recalculated at every price.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="p-4">Scenario</th>
                <th>Buyer price</th>
                <th>Cash profit</th>
                <th>Economic profit</th>
                <th>Cash margin</th>
                <th>Economic margin</th>
                <th>Change vs current</th>
              </tr>
            </thead>
            <tbody>
              {quickScenarios.map((scenario) => (
                <tr className="border-t" key={scenario.key}>
                  <td className="p-4 font-medium">{scenario.label}</td>
                  <td>{formatMoney(scenario.price, "USD")}</td>
                  <td>{formatMoney(scenario.result.cashProfit, "USD")}</td>
                  <td>{optionalMoney(scenario.result.economicProfit)}</td>
                  <td>{optionalPercent(scenario.result.cashMarginPercent)}</td>
                  <td>
                    {optionalPercent(scenario.result.economicMarginPercent)}
                  </td>
                  <td>
                    {formatMoney(
                      scenario.result.cashProfit.minus(
                        quickScenarios[0]?.result.cashProfit ?? 0,
                      ),
                      "USD",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <p className="eyebrow">Target-price solver</p>
          <h3 className="mt-1 font-semibold">
            Solve through the real pricing engine
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-stone-500">
              Target
              <select
                className="field mt-1"
                value={targetKind}
                onChange={(e) =>
                  setTargetKind(e.target.value as ProfitabilityTargetKind)
                }
              >
                <option value="cashProfit">Cash profit (USD)</option>
                <option value="economicProfit">Economic profit (USD)</option>
                <option value="cashMargin">Cash margin (%)</option>
                <option value="economicMargin">Economic margin (%)</option>
              </select>
            </label>
            <SimInput
              label="Target value"
              value={targetValue}
              onChange={setTargetValue}
              suffix={targetKind.includes("Margin") ? "%" : "USD"}
            />
          </div>
          {solver?.success && solver.price ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 className="mr-2 inline" size={17} /> Suggested buyer
              price <strong>{formatMoney(solver.price, "USD")}</strong>
              <button
                className="ml-3 rounded-lg border border-emerald-300 px-2 py-1 text-xs"
                onClick={() => setPrice(solver.price!.toFixed(2))}
              >
                Use suggested price
              </button>
              <p className="mt-2 text-xs">
                Bounded binary search · {solver.iterations} iterations · $0.01
                tolerance · no listing mutation.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {solver?.reason ?? "Enter a valid target."}
            </p>
          )}
          <p className="mt-3 text-[11px] text-stone-500">
            Minimum targets source: {targetsSource}
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Alerts and recommendations</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <GradeBadge grade={analysis.grade} />
            {analysis.riskFlags.map((flag) => (
              <span
                className="pill border-amber-200 bg-amber-50 text-amber-900"
                key={flag}
              >
                {riskLabels[flag]}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {recommendations.map((message) => (
              <li className="rounded-lg bg-stone-50 p-3" key={message}>
                {message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="card">
        <summary className="cursor-pointer p-5 font-semibold">
          Detailed deductions and data quality
        </summary>
        <div className="grid gap-px border-t bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          <Breakdown
            label="Seller revenue"
            value={formatMoney(t.grossRevenue, "USD")}
          />
          <Breakdown
            label="Etsy fees + fee VAT"
            value={formatMoney(t.totalEtsyFees, "USD")}
          />
          <Breakdown
            label="Materials"
            value={formatMoney(t.materialCostUsd, "USD")}
          />
          <Breakdown
            label="Cash labour"
            value={formatMoney(t.laborUsd, "USD")}
            source={product.paidLaborRateSource}
          />
          <Breakdown
            label="Economic labour"
            value={optionalMoney(analysis.economicLabourCostUsd)}
            source={product.economicHourlyRateSource}
          />
          <Breakdown
            label="Packaging"
            value={formatMoney(t.packagingCostUsd, "USD")}
          />
          <Breakdown
            label="Other direct"
            value={formatMoney(t.additionalDirectCostUsd, "USD")}
          />
          <Breakdown
            label="International shipping"
            value={formatMoney(t.internationalShippingUsd, "USD")}
          />
          <Breakdown
            label="ETGB"
            value={
              product.etgbStatus === "UNKNOWN_PENDING_CONFIRMATION"
                ? "Not configured"
                : t.etgbCostUsd.eq(0)
                  ? "$0.00 · Confirmed included/free"
                  : formatMoney(t.etgbCostUsd, "USD")
            }
          />
          <Breakdown
            label="Customs"
            value={
              sellerPaysCustoms
                ? formatMoney(t.customsAndTariffUsd, "USD")
                : "Not deducted"
            }
          />
          <Breakdown
            label="Allocated overhead"
            value={formatMoney(t.allocatedBusinessOverheadUsd, "USD")}
            source={`Expected orders: ${baseInput.expectedMonthlyOrders}`}
          />
          <Breakdown
            label="Tax reserve"
            value={formatMoney(t.taxReserve, "USD")}
          />
        </div>
        <div className="border-t p-5 text-sm text-amber-900">
          {analysis.warnings.map((warning) => (
            <p key={warning}>• {warning}</p>
          ))}
        </div>
      </details>

      <div className="card overflow-hidden">
        <div className="border-b p-5">
          <h3 className="font-semibold">Overhead allocation sensitivity</h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Monthly overhead does not disappear when order volume is low. This
            analysis shows how fixed monthly costs are distributed across
            expected orders.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="p-4">Expected orders</th>
                <th>Overhead/order</th>
                <th>Plan overhead</th>
                <th>Cash profit</th>
                <th>Cash margin</th>
                <th>Economic profit</th>
                <th>Economic margin</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row) => (
                <tr className="border-t" key={row.volume}>
                  <td className="p-4 font-medium">
                    {row.volume}
                    {row.volume === Number(baseInput.expectedMonthlyOrders)
                      ? " · current"
                      : ""}
                  </td>
                  <td>{formatMoney(row.overheadPerOrder, "USD")}</td>
                  <td>{formatMoney(row.totalAllocatedOverhead, "USD")}</td>
                  <td>{formatMoney(row.cashProfit, "USD")}</td>
                  <td>{optionalPercent(row.cashMarginPercent)}</td>
                  <td>{optionalMoney(row.economicProfit)}</td>
                  <td>{optionalPercent(row.economicMarginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SimInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <label className="text-xs text-stone-500">
      {label}
      <div className="relative mt-1">
        <input
          className="field pr-14"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-3 top-3 text-[10px] font-semibold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}
function SimMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card p-4" title={hint}>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-stone-400">{hint}</p>
    </div>
  );
}
function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className="pill border-jade/30 bg-jade/5 font-semibold text-jade"
      aria-label={`Profitability grade ${grade}`}
    >
      Grade {grade}
    </span>
  );
}
function Breakdown({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: string;
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
      {source && (
        <p className="mt-1 text-[11px] text-stone-400">Source: {source}</p>
      )}
    </div>
  );
}

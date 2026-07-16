"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { AlertTriangle, ChevronDown, Info, RotateCcw } from "lucide-react";
import { calculate, solvePrice } from "@/lib/domain/calculator";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { formatMoney } from "@/lib/domain/money";
import type { CalculatorInput } from "@/lib/domain/types";

type Tab = "quick" | "reverse" | "plan";

export interface CalculatorProductPreset {
  id: string;
  productId: string;
  sku: string;
  title: string;
  listingTitle: string;
  currency: string;
  originalPrice: string;
  discountedPrice: string;
  discountAmount: string;
  discountPercentage: string;
  discountSource: "ETSY" | "MANUAL" | "NONE";
  availableQuantity: number;
  state: string;
  materialCostTry: string;
  laborHours: string;
  laborHourlyRateTry: string;
  packagingCostTry: string;
  additionalDirectCostTry: string;
}

interface CalculatorExchangeRate {
  rate: string;
  asOf: string;
  source: string;
  fallback: boolean;
}

export function CalculatorWorkspace({
  products,
  exchangeRate,
  planningDefaults,
}: {
  products: CalculatorProductPreset[];
  exchangeRate: CalculatorExchangeRate;
  planningDefaults: Partial<CalculatorInput>;
}) {
  const [input, setInput] = useState<CalculatorInput>({
    ...defaultCalculatorInput,
    ...planningDefaults,
    usdTryRate: exchangeRate.rate,
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [planQuantities, setPlanQuantities] = useState<Record<string, string>>(
    {},
  );
  const [tab, setTab] = useState<Tab>("quick");
  const [targetProfit, setTargetProfit] = useState("50");
  const [targetMargin, setTargetMargin] = useState("30");
  const calculationInput = input;
  const result = useMemo(() => calculate(calculationInput), [calculationInput]);
  const set = (key: keyof CalculatorInput, value: string | boolean) =>
    setInput((current) => ({ ...current, [key]: value }));
  const reverseProfit = useMemo(
    () =>
      solvePrice(calculationInput, {
        kind: "profitUsd",
        value: targetProfit || 0,
      }),
    [calculationInput, targetProfit],
  );
  const reverseMargin = useMemo(
    () =>
      solvePrice(calculationInput, {
        kind: "margin",
        value: targetMargin || 0,
      }),
    [calculationInput, targetMargin],
  );
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );
  const selectProduct = (id: string) => {
    setSelectedProductId(id);
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setInput((current) => ({
      ...current,
      ...(product.currency === "USD"
        ? {
            itemSubtotalUsd: product.originalPrice,
            sellerFundedDiscountUsd: product.discountAmount,
          }
        : {}),
      materialCostTry: product.materialCostTry,
      laborHours: product.laborHours,
      laborHourlyRateTry: product.laborHourlyRateTry,
      packagingCostTry: product.packagingCostTry,
      additionalDirectCostTry: product.additionalDirectCostTry,
    }));
  };
  const reset = () => {
    setInput({
      ...defaultCalculatorInput,
      ...planningDefaults,
      usdTryRate: exchangeRate.rate,
    });
    setSelectedProductId("");
  };
  const planRows = useMemo(
    () =>
      products.map((product) => {
        const quantity = Math.max(
          0,
          Math.floor(Number(planQuantities[product.id] || 0)),
        );
        const calculation =
          product.currency === "USD"
            ? calculate({
                ...calculationInput,
                itemSubtotalUsd: product.originalPrice,
                sellerFundedDiscountUsd: product.discountAmount,
                materialCostTry: product.materialCostTry,
                laborHours: product.laborHours,
                laborHourlyRateTry: product.laborHourlyRateTry,
                packagingCostTry: product.packagingCostTry,
                additionalDirectCostTry: product.additionalDirectCostTry,
              })
            : null;
        return { product, quantity, calculation };
      }),
    [calculationInput, planQuantities, products],
  );
  const planTotals = useMemo(
    () =>
      planRows.reduce(
        (totals, row) => {
          if (!row.calculation || row.quantity === 0) return totals;
          const quantity = new Decimal(row.quantity);
          return {
            units: totals.units + row.quantity,
            revenue: totals.revenue.plus(
              row.calculation.totals.grossRevenue.mul(quantity),
            ),
            fees: totals.fees.plus(
              row.calculation.totals.totalEtsyFees.mul(quantity),
            ),
            profit: totals.profit.plus(
              row.calculation.totals.estimatedAfterReserveProfit.mul(quantity),
            ),
          };
        },
        {
          units: 0,
          revenue: new Decimal(0),
          fees: new Decimal(0),
          profit: new Decimal(0),
        },
      ),
    [planRows],
  );
  const useAllAvailable = () =>
    setPlanQuantities(
      Object.fromEntries(
        products.map((product) => [
          product.id,
          String(product.availableQuantity),
        ]),
      ),
    );
  const clearPlan = () => setPlanQuantities({});

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Calculation workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">
            Price and sales planning with every fee visible.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Choose a synchronized product to load its Etsy price and saved cost
            version. The result also uses the latest saved monthly overhead,
            planning tax reserve, exchange rate, shipping quote, and customs
            quote when those records exist.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm"
        >
          <RotateCcw size={15} /> Reset example
        </button>
      </header>
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border bg-white p-1">
        {(["quick", "reverse", "plan"] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === item ? "bg-[#18342e] text-white" : "text-stone-500 hover:bg-stone-50"}`}
          >
            {item === "quick"
              ? "Quick calculator"
              : item === "reverse"
                ? "Reverse pricing"
                : "Sales plan"}
          </button>
        ))}
      </div>
      {tab !== "plan" && (
        <section className="card p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)] lg:items-end">
            <label>
              <span className="mb-1.5 block text-xs font-medium text-stone-600">
                Product
              </span>
              <select
                className="field"
                value={selectedProductId}
                onChange={(event) => selectProduct(event.target.value)}
              >
                <option value="">Choose an Etsy product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.listingTitle}
                  </option>
                ))}
              </select>
            </label>
            {selectedProduct ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <strong>
                  {selectedProduct.currency}{" "}
                  {new Decimal(selectedProduct.discountedPrice).toFixed(2)}
                </strong>
                {new Decimal(selectedProduct.discountPercentage).gt(0)
                  ? ` after ${new Decimal(selectedProduct.discountPercentage).toDecimalPlaces(2).toString()}% ${selectedProduct.discountSource === "ETSY" ? "Etsy" : "local"} discount`
                  : " · no active discount"}
                <span className="mt-1 block text-emerald-800/70">
                  Etsy pricing and the latest local product cost are loaded.
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
                Select a product to prefill its Etsy price and discount.
              </div>
            )}
          </div>
          {selectedProduct && selectedProduct.currency !== "USD" && (
            <p className="mt-3 text-xs text-amber-700">
              <AlertTriangle className="mr-1 inline" size={14} />
              This calculator currently uses USD revenue, so the{" "}
              {selectedProduct.currency} Etsy price was not copied into the USD
              sale fields.
            </p>
          )}
        </section>
      )}
      {tab === "quick" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-5">
            <InputSection
              title="Sale & marketplace"
              hint="USD revenue and Etsy triggers"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Sale price"
                  value={input.itemSubtotalUsd}
                  suffix="USD"
                  onChange={(v) => set("itemSubtotalUsd", v)}
                />
                <NumberField
                  label="Shipping charged"
                  value={input.shippingChargedToBuyerUsd}
                  suffix="USD"
                  onChange={(v) => set("shippingChargedToBuyerUsd", v)}
                />
                <NumberField
                  label="Seller discount"
                  value={input.sellerFundedDiscountUsd}
                  suffix="USD"
                  onChange={(v) => set("sellerFundedDiscountUsd", v)}
                />
                <div>
                  <NumberField
                    label="USD / TRY rate"
                    value={input.usdTryRate}
                    suffix="TRY"
                    onChange={(v) => set("usdTryRate", v)}
                  />
                  <p
                    className={`mt-1.5 text-[11px] ${exchangeRate.fallback ? "text-amber-700" : "text-stone-400"}`}
                  >
                    {exchangeRate.source} · {exchangeRate.asOf} · refreshed
                    weekly
                  </p>
                </div>
                <Toggle
                  label="Currency conversion"
                  checked={input.currencyConversionRequired}
                  onChange={(v) => set("currencyConversionRequired", v)}
                />
                <Toggle
                  label="Offsite Ads (15%)"
                  checked={input.offsiteAdAttributed}
                  onChange={(v) => set("offsiteAdAttributed", v)}
                />
              </div>
            </InputSection>
            <InputSection
              title="Product & business costs"
              hint="Selected product + saved monthly planning inputs"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Materials"
                  value={input.materialCostTry}
                  suffix="TRY"
                  onChange={(v) => set("materialCostTry", v)}
                />
                <NumberField
                  label="Labor hours"
                  value={input.laborHours}
                  suffix="HRS"
                  onChange={(v) => set("laborHours", v)}
                />
                <NumberField
                  label="Labor hourly value"
                  value={input.laborHourlyRateTry}
                  suffix="TRY"
                  onChange={(v) => set("laborHourlyRateTry", v)}
                />
                <NumberField
                  label="Packaging"
                  value={input.packagingCostTry}
                  suffix="TRY"
                  onChange={(v) => set("packagingCostTry", v)}
                />
                <NumberField
                  label="Other direct cost"
                  value={input.additionalDirectCostTry}
                  suffix="TRY"
                  onChange={(v) => set("additionalDirectCostTry", v)}
                />
                <NumberField
                  label="Monthly overhead"
                  value={input.monthlyOverheadTry}
                  suffix="TRY"
                  onChange={(v) => set("monthlyOverheadTry", v)}
                />
                <NumberField
                  label="Expected monthly orders"
                  value={input.expectedMonthlyOrders}
                  suffix="ORDERS"
                  onChange={(v) => set("expectedMonthlyOrders", v)}
                />
                <NumberField
                  label="Income-tax planning reserve"
                  value={input.taxReserveRate}
                  suffix="%"
                  onChange={(v) => set("taxReserveRate", v)}
                />
              </div>
              <p className="mt-3 flex gap-2 text-xs text-stone-500">
                <Info size={14} className="shrink-0" /> Labor is an economic
                planning value. The tax percentage is a reserve, not a filed or
                accountant-confirmed tax calculation.
              </p>
            </InputSection>
            <InputSection
              title="Shipping & DDP customs"
              hint="Latest saved quote or manual input"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="International shipping"
                  value={input.internationalShippingUsd}
                  suffix="USD"
                  onChange={(v) => set("internationalShippingUsd", v)}
                />
                <NumberField
                  label="Customs duty"
                  value={input.customsDutyUsd}
                  suffix="USD"
                  onChange={(v) => set("customsDutyUsd", v)}
                />
                <NumberField
                  label="Additional tariff"
                  value={input.additionalTariffUsd}
                  suffix="USD"
                  onChange={(v) => set("additionalTariffUsd", v)}
                />
                <NumberField
                  label="Carrier processing"
                  value={input.carrierProcessingFeeUsd}
                  suffix="USD"
                  onChange={(v) => set("carrierProcessingFeeUsd", v)}
                />
                <NumberField
                  label="Domestic transfer"
                  value={input.domesticTransferCostTry}
                  suffix="TRY"
                  onChange={(v) => set("domesticTransferCostTry", v)}
                />
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <span className="pill border-emerald-200 bg-white text-emerald-700">
                    Saved planning inputs
                  </span>
                  <p className="mt-2 text-xs leading-4 text-emerald-800">
                    Zero means no dated quote has been loaded yet.
                  </p>
                </div>
              </div>
              <p className="mt-3 flex gap-2 text-xs text-stone-500">
                <Info size={14} className="shrink-0" /> Carrier processing is a
                destination customs charge, not a ShipEntegra service.
              </p>
            </InputSection>
          </div>
          <ResultPanel result={result} />
        </div>
      )}
      {tab === "reverse" && (
        <ReverseView
          input={input}
          targetProfit={targetProfit}
          targetMargin={targetMargin}
          setTargetProfit={setTargetProfit}
          setTargetMargin={setTargetMargin}
          reverseProfit={reverseProfit}
          reverseMargin={reverseMargin}
        />
      )}
      {tab === "plan" && (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">Monthly scenario</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Plan selected products or sell all available listings
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  Each planned unit uses its Etsy price and discount plus the
                  shipping, customs and fee assumptions currently entered in the
                  Quick calculator.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={useAllAvailable}
                  className="rounded-xl bg-jade px-4 py-2.5 text-xs font-medium text-white"
                >
                  Use all available
                </button>
                <button
                  onClick={clearPlan}
                  className="rounded-xl border bg-white px-4 py-2.5 text-xs font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PlanMetric
              label="Planned units"
              value={String(planTotals.units)}
            />
            <PlanMetric
              label="Seller revenue"
              value={formatMoney(planTotals.revenue, "USD")}
            />
            <PlanMetric
              label="Etsy fees + fee VAT"
              value={formatMoney(planTotals.fees, "USD")}
            />
            <PlanMetric
              label="Estimated profit after saved costs and reserve"
              value={`${formatMoney(planTotals.profit, "USD")} · ${formatMoney(planTotals.profit.mul(input.usdTryRate), "TRY")}`}
            />
          </section>
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-400">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th>State / available</th>
                    <th>Planned quantity</th>
                    <th>Buyer price</th>
                    <th>Profit per unit</th>
                    <th>Planned profit</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map(({ product, quantity, calculation }) => (
                    <tr className="border-t" key={product.id}>
                      <td className="px-5 py-4">
                        <strong className="block">{product.sku}</strong>
                        <span className="mt-1 block max-w-md text-xs text-stone-500">
                          {product.listingTitle}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${product.state === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"}`}
                        >
                          {product.state}
                        </span>
                        <span className="ml-2 text-xs text-stone-500">
                          {product.availableQuantity}
                        </span>
                      </td>
                      <td>
                        <input
                          aria-label={`Planned quantity for ${product.sku}`}
                          className="field w-28"
                          type="number"
                          min="0"
                          step="1"
                          value={planQuantities[product.id] || ""}
                          placeholder="0"
                          onChange={(event) =>
                            setPlanQuantities((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        {product.currency}{" "}
                        {new Decimal(product.discountedPrice).toFixed(2)}
                      </td>
                      <td>
                        {calculation
                          ? formatMoney(
                              calculation.totals.estimatedAfterReserveProfit,
                              "USD",
                            )
                          : "USD only"}
                      </td>
                      <td className="font-semibold">
                        {calculation
                          ? formatMoney(
                              calculation.totals.estimatedAfterReserveProfit.mul(
                                quantity,
                              ),
                              "USD",
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <AlertTriangle className="mr-1.5 inline" size={14} />
            This is a planning scenario, not a filed tax calculation. Each row
            uses its own saved product cost. Business overhead, tax reserve,
            shipping, and customs use the current Quick calculator values.
          </div>
        </div>
      )}
    </div>
  );
}

function InputSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-stone-400">{hint}</span>
      </div>
      {children}
    </section>
  );
}
function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: Decimal.Value;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone-600">
        {label}
      </span>
      <div className="relative">
        <input
          className="field pr-14"
          type="number"
          min="0"
          step="0.01"
          value={String(value)}
          onChange={(e) => onChange(e.target.value || "0")}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-stone-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border bg-stone-50/50 px-3 py-2.5 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-jade"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ResultPanel({ result }: { result: ReturnType<typeof calculate> }) {
  const t = result.totals;
  return (
    <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
      <div className="overflow-hidden rounded-2xl bg-[#18342e] text-white shadow-soft">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-medium text-white/50">
            Estimated profit after saved costs and reserve
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {formatMoney(t.estimatedAfterReserveProfit, "USD")}
          </p>
          <p className="mt-2 text-sm text-[#dbe8b6]">
            {formatMoney(t.estimatedAfterReserveProfitTry, "TRY")} ·{" "}
            {t.afterReserveMargin.toFixed(1)}% margin
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/10">
          <ResultStat
            label="Seller revenue"
            value={formatMoney(t.grossRevenue, "USD")}
          />
          <ResultStat
            label="Etsy fees + VAT"
            value={formatMoney(t.totalEtsyFees, "USD")}
          />
          <ResultStat
            label="Shipping + customs"
            value={formatMoney(
              t.internationalShippingUsd.plus(t.customsAndTariffUsd),
              "USD",
            )}
          />
          <ResultStat
            label="Profit · TRY"
            value={formatMoney(t.estimatedAfterReserveProfitTry, "TRY")}
          />
        </div>
      </div>
      <div className="card p-5">
        <p className="eyebrow">Profit waterfall</p>
        <div className="mt-3">
          <Waterfall
            label="Gross seller revenue"
            value={t.grossRevenue}
            positive
          />
          <Waterfall label="Etsy base fees" value={t.etsyBaseFees} />
          <Waterfall label="Seller-fee VAT" value={t.etsyFeeVatUsd} />
          <Waterfall
            label="International shipping"
            value={t.internationalShippingUsd}
          />
          <Waterfall label="Customs & tariffs" value={t.customsAndTariffUsd} />
        </div>
      </div>
      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5">
          <div>
            <p className="font-semibold">Calculation inspector</p>
            <p className="mt-1 text-xs text-stone-400">
              {result.lines.length} auditable lines
            </p>
          </div>
          <ChevronDown className="transition group-open:rotate-180" size={17} />
        </summary>
        <div className="max-h-[420px] overflow-auto border-t px-5 pb-3">
          {result.lines.map((line, i) => (
            <div
              key={`${line.name}-${i}`}
              className="border-b py-3 last:border-0"
            >
              <div className="flex justify-between gap-3 text-sm">
                <span>{line.name}</span>
                <strong>
                  {line.nativeCurrency === "USD" ? "$" : "₺"}
                  {new Decimal(line.nativeAmount).toFixed(2)}
                </strong>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-stone-400">
                {line.formula}
                {line.base ? ` · Base ${line.base}` : ""}
                {line.rate ? ` · Rate ${line.rate}%` : ""} · @{" "}
                {result.assumptions[0].replace("USD/TRY snapshot: ", "")}
              </p>
            </div>
          ))}
        </div>
      </details>
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-semibold text-sky-900">Assumptions used</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-sky-800/80">
          {result.assumptions.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#18342e] p-4">
      <p className="text-[10px] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function Waterfall({
  label,
  value,
  positive,
}: {
  label: string;
  value: Decimal;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center border-b py-2.5 text-sm last:border-0">
      <span
        className={`mr-2 h-1.5 w-1.5 rounded-full ${positive ? "bg-jade" : "bg-coral"}`}
      />
      <span className="flex-1 text-stone-600">{label}</span>
      <span className="font-medium">
        {positive ? "" : "−"}${value.toFixed(2)}
      </span>
    </div>
  );
}

function ReverseView({
  input,
  targetProfit,
  targetMargin,
  setTargetProfit,
  setTargetMargin,
  reverseProfit,
  reverseMargin,
}: {
  input: CalculatorInput;
  targetProfit: string;
  targetMargin: string;
  setTargetProfit: (v: string) => void;
  setTargetMargin: (v: string) => void;
  reverseProfit: Decimal;
  reverseMargin: Decimal;
}) {
  const psychological = (v: Decimal) => v.ceil().minus("0.01");
  const scenarios = [
    ["No Offsite Ads", false, "0"],
    ["Offsite Ads · 15%", true, "15"],
    ["Offsite Ads · 12%", true, "12"],
  ] as const;
  return (
    <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
      <div className="card p-6">
        <p className="eyebrow">Your target</p>
        <h2 className="mt-1 text-xl font-semibold">Solve backwards</h2>
        <div className="mt-6 space-y-5">
          <NumberField
            label="Desired after-reserve profit"
            value={targetProfit}
            suffix="USD"
            onChange={setTargetProfit}
          />
          <NumberField
            label="Desired margin"
            value={targetMargin}
            suffix="%"
            onChange={setTargetMargin}
          />
        </div>
        <p className="mt-6 text-xs leading-5 text-stone-500">
          Binary search range $0.01–$10,000 · $0.01 tolerance · up to 200
          iterations.
        </p>
      </div>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceCard
            title="Target profit price"
            exact={reverseProfit}
            rounded={psychological(reverseProfit)}
          />
          <PriceCard
            title="Target margin price"
            exact={reverseMargin}
            rounded={psychological(reverseMargin)}
          />
        </div>
        <div className="card overflow-hidden">
          <div className="border-b p-5">
            <p className="eyebrow">Recommended-price scenarios</p>
            <h3 className="mt-1 font-semibold">Offsite Ads impact</h3>
          </div>
          {scenarios.map(([label, on, rate]) => {
            const price = solvePrice(
              {
                ...input,
                offsiteAdAttributed: on,
                offsiteAdsRate: rate,
              },
              { kind: "profitUsd", value: targetProfit || 0 },
            );
            return (
              <div
                key={label}
                className="flex items-center justify-between border-b px-5 py-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    Exact {formatMoney(price, "USD")}
                  </p>
                </div>
                <strong className="text-lg">
                  {formatMoney(psychological(price), "USD")}
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function PriceCard({
  title,
  exact,
  rounded,
}: {
  title: string;
  exact: Decimal;
  rounded: Decimal;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{formatMoney(exact, "USD")}</p>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-cream p-3 text-sm">
        <span>Psychological</span>
        <strong>{formatMoney(rounded, "USD")}</strong>
      </div>
    </div>
  );
}

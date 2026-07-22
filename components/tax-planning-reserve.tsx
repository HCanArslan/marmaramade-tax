"use client";

import { useState } from "react";
import Decimal from "decimal.js";
import { updateMicroExportBenefitPlanningAction } from "@/app/actions/operations";
import { calculateIncomeTaxPlanningReserve } from "@/lib/domain/income-tax-planning";

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

export function TaxPlanningReserve({
  reserveRate,
  initialBenefitEnabled,
}: {
  reserveRate: string;
  initialBenefitEnabled: boolean;
}) {
  const [businessProfit, setBusinessProfit] = useState("100000");
  const [benefitEnabled, setBenefitEnabled] = useState(initialBenefitEnabled);
  const result = calculateIncomeTaxPlanningReserve({
    businessProfit: businessProfit || 0,
    reserveRate,
    useMicroExportBenefit: benefitEnabled,
  });
  const money = (value: Decimal) => tryFormatter.format(value.toNumber());

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Nakit planlama aracı</p>
          <h2 className="mt-1 text-xl font-semibold">
            Gelir Vergisi Planlama Rezervi
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Bu bir yasal vergi veya tahakkuk değildir. Gelecekteki olası gelir
            vergisi ödemeleri için ayrılan nakit planlama rezervidir.
          </p>
        </div>
        <span className="pill border-amber-200 bg-amber-50 text-amber-800">
          Planlama varsayımı
        </span>
      </div>

      <form
        action={updateMicroExportBenefitPlanningAction}
        className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end"
      >
        <label className="text-xs text-stone-600">
          Planlanan ticari kâr (TRY)
          <input
            aria-label="Planlanan ticari kâr TRY"
            className="field mt-1"
            min="0"
            step="0.01"
            type="number"
            value={businessProfit}
            onChange={(event) => setBusinessProfit(event.target.value)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border bg-stone-50 px-4 py-3 text-sm">
          <input
            checked={benefitEnabled}
            className="h-4 w-4 accent-jade"
            name="useMicroExportBenefit"
            type="checkbox"
            onChange={(event) => setBenefitEnabled(event.target.checked)}
          />
          Mikro İhracat Gelir Vergisi İndirimini Kullan
        </label>
        <button className="rounded-xl bg-jade px-4 py-3 text-sm text-white">
          Varsayımı kaydet
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Ticari kâr (değişmez)"
          value={money(result.businessProfit)}
        />
        <Metric
          label="İndirim olmadan planlama matrahı"
          value={money(result.taxablePlanningBaseWithoutBenefit)}
        />
        <Metric
          label="%50 indirim varsayımıyla matrah"
          value={money(result.taxablePlanningBaseWithBenefit)}
        />
        <Metric
          label="Kullanılan tahmini matrah"
          value={money(result.taxablePlanningBase)}
        />
        <Metric
          label={`Tahmini rezerv (%${new Decimal(reserveRate || 0).toString()})`}
          value={money(result.reserve)}
        />
      </div>

      <p className="mt-4 rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-600">
        İndirim açıkken yalnızca planlama matrahı ticari kârın %50&apos;sine
        iner. Ticari kâr değişmez. Uygulama koşulları ve nihai uygunluk
        muhasebeciniz tarafından doğrulanmalıdır.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs leading-5 text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

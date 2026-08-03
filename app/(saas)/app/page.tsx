import Decimal from "decimal.js";
import Link from "next/link";
import { queueWorkspaceCalculationAction } from "./profitability-actions";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { loadProfitability } from "@/lib/server/services/profitability-service";

const money = (value: Decimal | null, currency: string) => value === null ? "—" : `${value.toDecimalPlaces(2).toFixed(2)} ${currency}`;

export default async function SaasDashboardPage() {
  const view = await loadProfitability(await requireWorkspaceContext());
  const currency = view.businessProfile?.reportingCurrency ?? view.costDefault?.reportingCurrency ?? "USD";
  const calculated = view.products.filter((row) => row.calculation.result);
  const ranked = [...calculated].sort((a, b) => b.calculation.result!.finalCashProfit.comparedTo(a.calculation.result!.finalCashProfit));
  const actions = [...new Set(view.products.flatMap((row) => row.calculation.missingFields))];
  const costs = [
    ["Etsy", view.portfolio.totalEtsyFees], ["Ürün", view.portfolio.totalProductCost], ["Kargo", view.portfolio.totalShipping], ["Gümrük", view.portfolio.totalCustoms],
  ] as const;
  const totalCosts = costs.reduce((sum, [, value]) => sum.plus(value), new Decimal(0));
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Profitability dashboard</p><h1 className="mt-2 text-3xl font-semibold">Kârlılık genel görünümü</h1><p className="mt-2 text-sm text-stone-600">Eksik ürünler sıfır kâr gibi gösterilmez; toplamların dışında tutulur.</p></div><form action={queueWorkspaceCalculationAction}><button className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium">Tüm ürünleri arka planda hesapla</button></form></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="İçe aktarılan ürün" value={String(view.products.length)}/><Metric label="Hesaplanan / hariç" value={`${view.portfolio.includedCount} / ${view.portfolio.excludedCount}`}/><Metric label="Brüt gelir" value={money(view.portfolio.totalRevenue, currency)}/><Metric label="Ortalama nakit marj" value={view.averageMargin ? `%${view.averageMargin.toDecimalPlaces(1).toFixed(1)}` : "—"}/></div>
    <div className="grid gap-4 lg:grid-cols-3"><Metric label="Nakit kâr" value={money(view.portfolio.cashProfit, currency)}/><Metric label="Ekonomik kâr" value={money(view.portfolio.economicProfit, currency)}/><Metric label="Zarar eden ürün" value={String(view.lossMaking)}/></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5"><h2 className="font-semibold">Maliyet bileşimi</h2>{totalCosts.eq(0) ? <p className="mt-3 text-sm text-stone-600">Hesaplanabilir ürün oluştuğunda maliyet dağılımı burada görünür.</p> : <div className="mt-4 space-y-3">{costs.map(([label, value]) => <div key={label}><div className="flex justify-between text-sm"><span>{label}</span><span>{money(value, currency)}</span></div><div className="mt-1 h-2 rounded bg-stone-100"><div className="h-2 rounded bg-jade" style={{width:`${value.div(totalCosts).mul(100).toFixed(2)}%`}}/></div></div>)}</div>}</section>
      <section className="card p-5"><h2 className="font-semibold">Eksik veri eylemleri</h2>{actions.length ? <ul className="mt-3 space-y-2 text-sm text-stone-700">{actions.map((item)=><li key={item}>• {item}</li>)}</ul> : <p className="mt-3 text-sm text-emerald-700">Temel hesaplama girdileri hazır.</p>}<Link className="mt-4 inline-flex text-sm font-medium underline" href="/app/products?status=needs-attention">Eksik ürünleri aç</Link></section>
      <Ranked title="En yüksek nakit kâr" rows={ranked.slice(0,5)} currency={currency}/><Ranked title="En düşük marj" rows={[...calculated].sort((a,b)=>(a.calculation.result!.cashMarginPercent ?? new Decimal(0)).comparedTo(b.calculation.result!.cashMarginPercent ?? new Decimal(0))).slice(0,5)} currency={currency}/>
    </div>
    <section className="card p-5"><h2 className="font-semibold">Etsy durumu</h2><p className="mt-2 text-sm text-stone-600">{view.connection ? `${view.connection.shopName ?? "Etsy mağazası"} · ${view.connection.status} · son çalışma ${view.connection.syncRuns[0]?.status ?? "yok"}` : "Aktif Etsy bağlantısı bulunamadı."}</p></section>
  </div>;
}

function Metric({label,value}:{label:string;value:string}) { return <div className="card p-5"><p className="text-xs text-stone-500">{label}</p><p className="mt-2 break-words text-xl font-semibold">{value}</p></div>; }
function Ranked({title,rows,currency}:{title:string;rows:Awaited<ReturnType<typeof loadProfitability>>["products"];currency:string}) { return <section className="card p-5"><h2 className="font-semibold">{title}</h2>{rows.length ? <div className="mt-3 divide-y">{rows.map(({product,calculation})=><Link href={`/app/products/${product.id}`} className="flex justify-between gap-3 py-2 text-sm" key={product.id}><span className="truncate">{product.title}</span><span>{money(calculation.result!.finalCashProfit,currency)}</span></Link>)}</div> : <p className="mt-3 text-sm text-stone-600">Henüz hesaplanmış ürün yok.</p>}</section>; }

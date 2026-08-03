import Link from "next/link";
import { ChevronRight, ShieldCheck, Store } from "lucide-react";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { loadOnboarding } from "@/lib/server/services/onboarding-service";
import { businessAction, completeAction, confirmEtsyAction, costsAction, marketAction } from "./actions";
import { SyncRefresh } from "@/components/onboarding/sync-refresh";

const steps = ["Etsy", "İşletme", "Maliyetler", "Pazar", "İlk sonuç"];
const field = "field";
const primary = "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-jade px-5 py-3 text-sm font-semibold text-white sm:w-auto";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const context = await requireWorkspaceContext();
  const view = await loadOnboarding(context);
  const query = await searchParams;
  const state = view.state!;
  const step = state.status === "COMPLETED" ? 5 : Math.min(5, Math.max(1, state.currentStep));

  return <main className="min-h-screen bg-cream px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4"><Link href="/" className="font-semibold tracking-tight">MarmaraLedge</Link><span className="text-xs text-stone-500">Güvenli başlangıç · Secure setup</span></header>
      <section className="card overflow-hidden">
        <div className="border-b border-stone-200 px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">5 adımda ilk sonuç</p><h1 className="mt-1 text-2xl font-semibold">Mağazanızı kârlılık takibine hazırlayın</h1></div><span className="shrink-0 text-sm font-semibold">{step}/5</span></div>
          <div className="mt-5 grid grid-cols-5 gap-1.5" aria-label="Onboarding progress">{steps.map((label, index) => { const number=index+1; const complete=state.completedSteps.includes(number); return <div key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${complete || number === step ? "bg-jade" : "bg-stone-200"}`}/><span className="mt-1 hidden truncate text-[10px] text-stone-500 sm:block">{label}</span></div>; })}</div>
        </div>
        <div className="p-5 sm:p-8">
          {query.error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Bilgiler kaydedilemedi. Alanları kontrol edip yeniden deneyin.</p>}
          {step === 1 ? <EtsyStep view={view}/> : null}
          {step === 2 ? <BusinessStep view={view}/> : null}
          {step === 3 ? <CostsStep view={view}/> : null}
          {step === 4 ? <MarketStep view={view}/> : null}
          {step === 5 ? <ReviewStep view={view} completed={state.status === "COMPLETED"}/> : null}
        </div>
      </section>
      <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-5 text-stone-500">Tüm değerleri daha sonra Ayarlar’dan değiştirebilirsiniz. MarmaraLedge tahmin sunar; hukuk veya vergi danışmanlığı değildir.</p>
    </div>
  </main>;
}

function EtsyStep({ view }: { view: Awaited<ReturnType<typeof loadOnboarding>> }) {
  const connection=view.connection; const sync=connection?.syncRuns[0]; const ready=connection?.status === "ACTIVE" && view.importedListings > 0;
  return <div><p className="eyebrow">Adım 1</p><h2 className="mt-2 text-2xl font-semibold">Etsy mağazanızı bağlayın</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">MarmaraLedge ürün ve siparişlerinizi salt okunur erişimle içe aktarır. İlanları, fiyatları, stokları veya mağaza ayarlarını değiştiremez.</p>
    {connection ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><Store className="text-emerald-700"/><div><p className="font-semibold">{connection.shopName ?? "Etsy mağazası"} bağlı</p><p className="mt-1 text-sm text-emerald-900/70">{view.importedListings} ilan içe aktarıldı · Senkronizasyon: {sync?.status ?? "Hazır"}</p><SyncRefresh status={sync?.status ?? null}/></div></div></div> : <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5"><p className="font-semibold">Henüz Etsy mağazası bağlı değil</p><p className="mt-1 text-sm text-stone-500">İlk sürümde gerçek sonuç için Etsy bağlantısı gereklidir.</p></div>}
    <div className="mt-7">{ready ? <form action={confirmEtsyAction}><button className={primary}>Bağlantıyı onayla <ChevronRight size={16}/></button></form> : <Link prefetch={false} className={primary} href="/api/etsy/oauth/start?redirectTo=%2Fonboarding">Etsy’yi bağla <ChevronRight size={16}/></Link>}</div>
  </div>;
}

function BusinessStep({ view }: { view: Awaited<ReturnType<typeof loadOnboarding>> }) {
  const active=view.businessProfile;
  const options=[
    ["NO_REGISTERED_BUSINESS","Kayıtlı bir işletmem yok"],["ARTISAN_EXEMPTION","Esnaf muaflığını kullanıyorum"],["SOLE_PROPRIETORSHIP","Şahıs işletmem var"],["LIMITED_OR_CORPORATION","Limited veya anonim şirketim var"],["OTHER_OR_UNKNOWN","Diğer / Emin değilim"],
  ];
  return <form action={businessAction}><p className="eyebrow">Adım 2</p><h2 className="mt-2 text-2xl font-semibold">Şu anda nasıl faaliyet gösteriyorsunuz?</h2><p className="mt-2 text-sm text-stone-600">Seçiminiz yalnızca planlama varsayımı olarak kullanılır.</p><fieldset className="mt-6 grid gap-3 sm:grid-cols-2">{options.map(([value,label])=><label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-4 hover:border-jade"><input className="mt-1" type="radio" name="businessType" value={value} defaultChecked={active?.businessType===value} required/><span className="text-sm font-medium">{label}</span></label>)}</fieldset><label className="mt-5 block max-w-xs"><span className="mb-1.5 block text-xs font-medium">Raporlama para birimi</span><select className={field} name="reportingCurrency" defaultValue={active?.reportingCurrency ?? "USD"}><option>USD</option><option>TRY</option><option>EUR</option><option>GBP</option></select></label><label className="mt-5 flex items-start gap-3 text-sm leading-6"><input className="mt-1.5" type="checkbox" name="acknowledgement" value="accepted" required/><span>Bu seçimi mevcut planlama profilim olarak kullanın. MarmaraLedge’in hukuk veya vergi danışmanlığı değil, tahmin sunduğunu anlıyorum.</span></label><button className={`${primary} mt-7`}>Devam et <ChevronRight size={16}/></button></form>;
}

function CostsStep({ view }: { view: Awaited<ReturnType<typeof loadOnboarding>> }) {
  const d=view.costDefault;
  return <form action={costsAction}><p className="eyebrow">Adım 3</p><h2 className="mt-2 text-2xl font-semibold">Ortalama maliyetleri bir kez girin</h2><p className="mt-2 text-sm text-stone-600">Eksik ürünlere uygulanır; mevcut özel maliyetler asla değiştirilmez.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><NumberField name="averageLaborHours" label="Ürün başına ortalama emek süresi" unit="saat" value={d?.averageLaborHours?.toString() ?? "1"}/><NumberField name="hourlyLaborValue" label="Saatlik emek değeri" unit="TRY" value={d?.hourlyLabourValue.toString() ?? "0"}/><NumberField name="packagingCost" label="Ortalama paketleme maliyeti" unit="TRY" value={d?.packagingCost.toString() ?? "0"}/><NumberField name="materialWastagePercentage" label="Malzeme fire oranı" unit="%" value={d?.materialWastagePercentage.toString() ?? "0"}/><NumberField name="exportHandlingCost" label="Ortalama ihracat / ETGB gideri" unit="TRY" value={d?.exportHandlingCost.toString() ?? "0"}/><NumberField name="monthlyOverhead" label="Aylık genel gider (opsiyonel)" unit="TRY" value={d?.monthlyOverheadKnown ? d.monthlyOverhead.toString() : ""} optional/></div><input type="hidden" name="currency" value="TRY"/><div className="mt-6 rounded-xl bg-stone-50 p-4 text-sm"><p className="font-semibold">Önizleme</p><p className="mt-1 text-stone-600">{view.affectedProductCount} ürün eksik alanlar için bu varsayımları alacak. Malzeme maliyeti bilinmiyorsa eksik kalacak.</p></div><label className="mt-4 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="confirmApply" value="accepted" required/><span>Yalnızca eksik değerleri doldur.</span></label><button className={`${primary} mt-7`}>Eksiklere uygula <ChevronRight size={16}/></button></form>;
}

function NumberField({name,label,unit,value,optional=false}:{name:string;label:string;unit:string;value:string;optional?:boolean}) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><div className="relative"><input className={`${field} pr-14`} name={name} type="number" min="0" step="0.01" defaultValue={value} required={!optional} placeholder={optional ? "Bilmiyorum" : undefined}/><span className="pointer-events-none absolute right-3 top-3 text-xs text-stone-400">{unit}</span></div>{optional&&<span className="mt-1 block text-[11px] text-stone-500">Boş bırakırsanız bilinmiyor olarak saklanır.</span>}</label>; }

function MarketStep({ view }: { view: Awaited<ReturnType<typeof loadOnboarding>> }) {
  const d=view.costDefault; const market=d?.targetMarket || "US"; const shopCurrency=view.connection?.shopCurrency || d?.marketplaceCurrency || "USD";
  return <form action={marketAction}><p className="eyebrow">Adım 4</p><h2 className="mt-2 text-2xl font-semibold">En çok nereye satış yapıyorsunuz?</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><SelectField name="targetMarket" label="Birincil hedef pazar" value={market} options={[["US","Amerika Birleşik Devletleri"],["EU","Avrupa Birliği"],["GB","Birleşik Krallık"],["CA","Kanada"],["AU","Avustralya"],["OTHER","Diğer"]]}/><SelectField name="customsResponsibility" label="Gümrük ödemesi varsayımı" value={d?.customsResponsibility || "UNKNOWN"} options={[["BUYER","Alıcı öder"],["SELLER","Satıcı öder"],["UNKNOWN","Henüz bilmiyorum"]]}/><NumberField name="shippingCost" label="Satıcının ödediği varsayılan kargo" unit={shopCurrency} value={d?.defaultShippingCost?.toString() ?? ""} optional/><SelectField name="reportingCurrency" label="Raporlama para birimi" value={d?.reportingCurrency || "USD"} options={[["USD","USD"],["TRY","TRY"],["EUR","EUR"],["GBP","GBP"]]}/></div><input type="hidden" name="sellerCountry" value="TR"/><input type="hidden" name="originCountry" value="TR"/><input type="hidden" name="shippingCurrency" value={shopCurrency}/><input type="hidden" name="marketplaceCurrency" value={shopCurrency}/><p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Ürün bazlı kargo ve tarife bilgileri daha sonra eklendiğinde hedef ülke sonuçları daha ayrıntılı olur.</p><button className={`${primary} mt-7`}>İlk sonucu hazırla <ChevronRight size={16}/></button></form>;
}

function SelectField({name,label,value,options}:{name:string;label:string;value:string;options:string[][]}) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span><select className={field} name={name} defaultValue={value}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }

function ReviewStep({ view, completed }: { view: Awaited<ReturnType<typeof loadOnboarding>>; completed: boolean }) {
  const result=view.firstResult; const money=(value:{toDecimalPlaces:(n:number)=>unknown})=>String(value.toDecimalPlaces(2));
  return <div><p className="eyebrow">Adım 5</p><h2 className="mt-2 text-2xl font-semibold">İlk görünümünüz hazır</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Review label="Bağlı mağaza" value={view.connection?.shopName || "Etsy"}/><Review label="İçe aktarılan ilan" value={String(view.importedListings)}/><Review label="İşletme profili" value={view.businessProfile?.businessType || "Eksik"}/><Review label="Hedef pazar" value={view.costDefault?.targetMarket || "Eksik"}/><Review label="Raporlama" value={view.reportingCurrency}/><Review label="Veri durumu" value={view.completeness.readiness}/></div><section className="mt-6 rounded-2xl bg-[#18342e] p-5 text-white"><div className="flex items-center gap-2"><ShieldCheck size={18}/><h3 className="font-semibold">Güvenli ilk sonuç</h3></div>{result.included > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><Review dark label="Tahmini gelir" value={`${money(result.revenue)} ${view.reportingCurrency}`}/><Review dark label="Tahmini nakit kâr" value={`${money(result.cashProfit)} ${view.reportingCurrency}`}/><Review dark label="Tahmini ekonomik kâr" value={`${money(result.economicProfit)} ${view.reportingCurrency}`}/></div> : <p className="mt-4 text-sm leading-6 text-white/75">Mağazanız bağlı. Güvenilir kâr hesaplamak için eksik ürün maliyeti ve kargo bilgilerini tamamlayın.</p>}<p className="mt-4 text-xs text-white/60">{result.included} ürün dahil · {result.excluded} ürün eksik veri nedeniyle hariç</p>{result.warnings.length>0&&<ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-100">{result.warnings.map(w=><li key={w}>{w}</li>)}</ul>}</section>
    {completed ? <Link className={`${primary} mt-7`} href="/app">Panelimi aç <ChevronRight size={16}/></Link> : <form action={completeAction} className="mt-6 space-y-3"><Consent name="terms">Taslak <Link className="underline" href="/terms" target="_blank">Kullanım Koşulları</Link>’nı kabul ediyorum.</Consent><Consent name="privacy">Taslak <Link className="underline" href="/privacy" target="_blank">Gizlilik Politikası</Link>’nı kabul ediyorum.</Consent><Consent name="estimates">Finansal ve vergi çıktılarının tahmin olduğunu anlıyorum.</Consent><button className={`${primary} mt-3`}>Panelimi aç <ChevronRight size={16}/></button></form>}
  </div>;
}

function Review({label,value,dark=false}:{label:string;value:string;dark?:boolean}) { return <div className={`rounded-xl p-3 ${dark?"bg-white/10":"border border-stone-200 bg-white"}`}><p className={`text-[11px] uppercase tracking-wide ${dark?"text-white/50":"text-stone-500"}`}>{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>; }
function Consent({name,children}:{name:string;children:React.ReactNode}) { return <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1.5" type="checkbox" name={name} value="accepted" required/><span>{children}</span></label>; }

import Link from "next/link";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { loadOnboarding } from "@/lib/server/services/onboarding-service";

export default async function SaasDashboardPage() {
  const view = await loadOnboarding(await requireWorkspaceContext());
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="eyebrow">Workspace dashboard</p><h1 className="mt-2 text-3xl font-semibold">Mağaza görünümü</h1><p className="mt-2 text-sm text-stone-600">İçe aktarılan gerçek veriler ve güvenli ilk sonuç sınırı.</p></header>
      <div className="grid gap-4 sm:grid-cols-3"><Metric label="İlanlar" value={String(view.importedListings)}/><Metric label="Bağlı ürünler" value={String(view.linkedProducts)}/><Metric label="Veri durumu" value={view.completeness.readiness}/></div>
      <section className="card p-5"><h2 className="font-semibold">Sonraki en iyi adım</h2>{view.completeness.blockingGaps.length ? <><p className="mt-2 text-sm text-stone-600">Ayrıntılı kârlılık için: {view.completeness.blockingGaps.join(", ")}.</p><Link className="mt-4 inline-flex rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white" href="/app/products">Eksik ürünleri görüntüle</Link></> : <p className="mt-2 text-sm text-stone-600">İlk tahmin için gerekli temel bilgiler hazır.</p>}</section>
    </div>
  );
}

function Metric({label,value}:{label:string;value:string}) { return <div className="card p-5"><p className="text-xs text-stone-500">{label}</p><p className="mt-2 break-words text-xl font-semibold">{value}</p></div>; }

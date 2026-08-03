import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { loadOnboarding } from "@/lib/server/services/onboarding-service";

export default async function SaasProductsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const view = await loadOnboarding(await requireWorkspaceContext());
  const { status } = await searchParams;
  const shippingKnown = view.costDefault?.defaultShippingCost !== null && view.costDefault?.defaultShippingCost !== undefined;
  const products = view.products.map((product) => ({ product, ready: Boolean(product.costVersions[0]?.materialCostTry !== null && product.costVersions[0]?.materialCostTry !== undefined && (product.costVersions[0]?.laborHours ?? product.onboardingDefaults?.laborHours) && shippingKnown) }));
  const shown = status === "needs-attention" ? products.filter((item) => !item.ready) : products;
  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="eyebrow">Products</p><h1 className="mt-2 text-3xl font-semibold">Ürünler</h1><p className="mt-2 text-sm text-stone-600">İçe aktarılan {view.importedListings} ilan ile {view.linkedProducts} bağlı ürün ayrı ayrı izlenir.</p></header><div className="flex gap-2 text-sm"><a className="rounded-lg border bg-white px-3 py-2" href="/app/products">Tümü</a><a className="rounded-lg border bg-white px-3 py-2" href="/app/products?status=needs-attention">Eksik bilgili</a></div><div className="grid gap-3">{shown.map(({product,ready})=><article className="card flex items-center justify-between gap-4 p-4" key={product.id}><div className="min-w-0"><h2 className="truncate font-medium">{product.title}</h2><p className="mt-1 text-xs text-stone-500">{product.onboardingDefaults ? "Onboarding varsayımları uygulandı" : product.costVersions.length ? "Özel maliyet sürümü korunuyor" : "Maliyet bilgisi eksik"}</p></div><span className={`pill shrink-0 ${ready?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-amber-200 bg-amber-50 text-amber-800"}`}>{ready?"İlk tahmine hazır":"Eksik veri"}</span></article>)}</div></div>;
}

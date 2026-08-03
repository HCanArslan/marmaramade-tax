import Link from "next/link";
import { restartOnboardingAction } from "./actions";

export default function SaasSettingsPage() {
  return <div className="mx-auto max-w-3xl space-y-6"><header><p className="eyebrow">Workspace settings</p><h1 className="mt-2 text-3xl font-semibold">Ayarlar</h1><p className="mt-2 text-sm text-stone-600">Planlama profilini, maliyet varsayımlarını ve hedef pazarı daha sonra değiştirebilirsiniz.</p></header><section className="card p-5"><h2 className="font-semibold">Başlangıç ayarları</h2><p className="mt-2 text-sm leading-6 text-stone-600">Beş adımı yeniden açmak mevcut ürünleri, özel maliyetleri, profil geçmişini veya Etsy verilerini silmez.</p><form action={restartOnboardingAction}><button className="mt-4 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium">Başlangıç ayarlarını düzenle</button></form></section><section className="card p-5"><h2 className="font-semibold">Etsy</h2><Link className="mt-3 inline-flex text-sm underline" href="/app/settings/etsy">Bağlantı ve senkronizasyon ayarları</Link></section></div>;
}

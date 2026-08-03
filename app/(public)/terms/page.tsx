import Link from "next/link";

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20"><p className="eyebrow">Draft · Legal review pending</p><h1 className="mt-3 text-4xl font-semibold">Kullanım Koşulları / Terms of Service</h1><div className="mt-8 space-y-5 text-sm leading-7 text-stone-600"><p>Bu metin ürün ön izlemesi için hazırlanmış taslaktır ve hukuki incelemeden geçmemiştir.</p><p>MarmaraLedge finansal planlama tahminleri sunar. Çıktılar hukuk, vergi, muhasebe veya yatırım danışmanlığı değildir; resmi beyan veya uygunluk kararı oluşturmaz.</p><p>Kullanıcı, bağladığı çalışma alanı ve mağaza verilerini kullanma yetkisine sahip olduğunu kabul eder. Etsy erişimi salt okunurdur.</p><p>Public signup remains closed while these draft terms await review.</p></div><Link className="mt-8 inline-flex underline" href="/">Ana sayfaya dön</Link></main>;
}

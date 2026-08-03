import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20"><p className="eyebrow">Draft · Legal review pending</p><h1 className="mt-3 text-4xl font-semibold">Gizlilik Politikası / Privacy Policy</h1><div className="mt-8 space-y-5 text-sm leading-7 text-stone-600"><p>Bu metin ürün ön izlemesi için hazırlanmış taslaktır ve hukuki incelemeden geçmemiştir.</p><p>MarmaraLedge hesap, çalışma alanı, ürün, sipariş ve planlama verilerini hizmeti sunmak ve güvenliğini sağlamak için işler. Etsy kimlik bilgileri sunucuda şifreli tutulur ve istemciye gönderilmez.</p><p>Onboarding analitiği ürün adları, alıcı bilgileri, OAuth belirteçleri, vergi kimlikleri veya ham finansal değerleri içermez. Pazarlama izni bu kabulün parçası değildir.</p><p>Public signup remains closed while this draft policy awaits review.</p></div><Link className="mt-8 inline-flex underline" href="/">Ana sayfaya dön</Link></main>;
}

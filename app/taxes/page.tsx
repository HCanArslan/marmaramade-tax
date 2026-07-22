import {
  createTaxObligationAction,
  createTaxRuleAction,
  upsertIncomeTaxEstimateAction,
} from "@/app/actions/operations";
import { TaxPlanningReserve } from "@/components/tax-planning-reserve";
import { requireAdmin } from "@/lib/auth/require-admin";
import { microExportBenefitEnabledFromTaxBase } from "@/lib/domain/income-tax-planning";
import { prisma } from "@/lib/prisma";

const microExportIncomeTaxSource =
  "https://gib.gov.tr/mevzuat/kanun/433/ozelge/21796";
const exportVatSource = "https://www.gib.gov.tr/mevzuat/kanun/436/teblig/9083";
const incomeTariffSource =
  "https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf";
const provisionalTaxSource =
  "https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgecici-vergi-oranlari.pdf";

export default async function TaxesPage() {
  await requireAdmin({ redirectTo: "/taxes" });
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const [rules, obligations, vat, estimates] = await Promise.all([
    prisma.taxRuleVersion.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { lowerBound: "asc" }],
    }),
    prisma.taxObligation.findMany({ orderBy: { dueDate: "asc" } }),
    prisma.vatPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.incomeTaxEstimate.findMany({
      orderBy: [{ year: "desc" }, { period: "desc" }],
    }),
  ]);
  const planningRule = rules.find(
    (rule) => rule.purpose === "PLANNING_RESERVE" && rule.isPlanningDefault,
  );
  const reserveRate = planningRule?.rate?.toString() ?? "0";
  const benefitEnabled = microExportBenefitEnabledFromTaxBase(
    planningRule?.taxBase,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Şahıs işletmesi · Etsy mikro ihracat</p>
        <h1 className="mt-2 text-3xl font-semibold">Vergi Planlaması</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">
          Vergi oranı ezberlemek yerine mikro ihracat avantajını, planlanan
          vergi matrahını ve gelecekteki ödemeler için ayrılacak nakdi görün.
          Buradaki sonuçlar beyanname, tahakkuk veya hukuki uygunluk kararı
          değildir.
        </p>
      </header>

      <section>
        <div className="mb-4">
          <p className="eyebrow">Planlama avantajları</p>
          <h2 className="mt-1 text-2xl font-semibold">
            Mikro İhracat Vergi Avantajları
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <BenefitCard
            badge="Potansiyel olarak uygun · Potentially eligible"
            title="%50 Gelir Vergisi İndirimi"
          >
            <p>
              GVK 89/16 kapsamında şartlar sağlandığında ETGB/BGB ile
              gerçekleştirilen mal ihracatından elde edilen ticari kazancın
              %50&apos;si yıllık gelir vergisi beyannamesinde indirim konusu
              yapılabilir.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              {[
                "Şahıs işletmesi (gerçek kişi)",
                "ETGB/BGB ile ihracat",
                "Fiziksel mal ihracatı",
                "Yıllık gelir vergisi beyannamesi",
              ].map((requirement) => (
                <p
                  className="rounded-lg bg-emerald-50 px-3 py-2"
                  key={requirement}
                >
                  ✓ {requirement}
                </p>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Bu daha düşük bir vergi oranı değildir; otomatik veya garanti
              değildir. Nihai uygunluk muhasebeciniz tarafından doğrulanmalıdır.
            </div>
            <Source href={microExportIncomeTaxSource}>
              GİB · GVK 89/16 mikro ihracat indirimi
            </Source>
          </BenefitCard>

          <BenefitCard
            badge="Planlama modu: KDV iadelerini yok say"
            title="İhracat KDV'si"
          >
            <p>
              İhracat teslimleri, gerekli ihracat şartları ve belgeleri
              sağlandığında genel olarak tam istisna kapsamında değerlendirilir.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="Hesaplanan çıkış KDV'si" value="%0" />
              <Metric label="Fatura davranışı" value="Çıkış KDV'si eklenmez" />
            </div>
            <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">
              <strong>Girdi KDV iadeleri: planlamada yok sayılır.</strong>
              <br />
              Uygulama KDV iadesi hesaplamaz, iade tahmini veya projeksiyonu
              üretmez. Bu süreç muhasebeci yönetiminde belge ve beyan gerektirir
              ve işletmenin erken aşamasında planlama sonucuna dahil edilmez.
            </div>
            <Source href={exportVatSource}>GİB · KDV ihracat istisnası</Source>
          </BenefitCard>
        </div>
      </section>

      <TaxPlanningReserve
        initialBenefitEnabled={benefitEnabled}
        reserveRate={reserveRate}
      />

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Bu uygulama yalnızca planlama tahmini sağlar.</strong>
        <p className="mt-2">Gerçek vergi yükümlülükleri şunlara bağlıdır:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Muhasebeci incelemesi</li>
          <li>Yıllık beyanname</li>
          <li>Yasal uygunluk şartları</li>
          <li>ETGB/BGB kanıtları</li>
          <li>Güncel Türkiye vergi mevzuatı</li>
        </ul>
      </section>

      <details className="card overflow-hidden">
        <summary className="cursor-pointer border-b p-5 font-semibold">
          Gelişmiş Vergi Kuralları
        </summary>
        <div className="space-y-6 p-5">
          <p className="text-sm leading-6 text-stone-600">
            Vergi kuralı oluşturma, dilim düzenleme, geçici vergi tahminleri ve
            teyit edilmiş yükümlülük kayıtları gelişmiş ayarlardır. Muhasebeci
            teyidi olmadan yasal borç olarak değerlendirmeyin.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            <Box title="Vergi kuralı ekle veya sürümle">
              <form
                action={createTaxRuleAction}
                className="grid gap-3 sm:grid-cols-2"
              >
                <I n="name" p="Kural adı" />
                <Select
                  n="taxType"
                  p="Vergi türü"
                  options={[
                    ["ANNUAL_INCOME_TAX", "Yıllık gelir vergisi"],
                    ["PROVISIONAL_INCOME_TAX", "Geçici gelir vergisi"],
                    ["EXPORT_VAT", "ETGB ihracat KDV'si"],
                    [
                      "INCOME_TAX_SAFETY_RESERVE",
                      "Gelir vergisi planlama rezervi",
                    ],
                  ]}
                />
                <Select
                  n="purpose"
                  p="Amaç"
                  options={[
                    ["LEGAL_RATE", "Yasal oran"],
                    ["PLANNING_RESERVE", "Hesaplayıcı planlama rezervi"],
                    ["VAT_TREATMENT", "KDV uygulaması"],
                  ]}
                />
                <Select
                  n="calculationMethod"
                  p="Hesaplama"
                  options={[
                    ["FLAT_RATE", "Sabit oran"],
                    ["PROGRESSIVE_BRACKET", "Artan oranlı dilim"],
                    ["FULL_EXEMPTION_EXPORT", "Tam ihracat istisnası"],
                  ]}
                />
                <I n="taxBase" p="Vergi matrahı tanımı" r={false} />
                <I n="rate" p="Oran %" r={false} t="number" />
                <I n="lowerBound" p="Alt sınır TRY" r={false} t="number" />
                <I n="upperBound" p="Üst sınır TRY" r={false} t="number" />
                <I n="currency" p="Para birimi" r={false} v="TRY" />
                <I n="effectiveFrom" p="Geçerlilik başlangıcı" t="date" />
                <I n="evidenceRequirement" p="Gerekli kanıt" r={false} />
                <I n="source" p="Resmî/profesyonel kaynak URL" r={false} />
                <I n="notes" p="Notlar" r={false} />
                <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
                  <input name="isPlanningDefault" type="checkbox" /> Bu oranı
                  hesaplayıcıda varsayılan planlama rezervi olarak kullan
                </label>
                <B />
              </form>
            </Box>

            <Box title="Teyit edilmiş vergi yükümlülüğü">
              <form
                action={createTaxObligationAction}
                className="grid gap-3 sm:grid-cols-2"
              >
                <I n="taxType" p="Vergi türü" />
                <I n="periodStart" p="Dönem başlangıcı" t="date" />
                <I n="periodEnd" p="Dönem sonu" t="date" />
                <I n="dueDate" p="Teyit edilmiş son tarih" t="date" />
                <I n="estimatedAmount" p="Tahmini tutar" r={false} t="number" />
                <I n="currency" p="Para birimi" v="TRY" />
                <B />
              </form>
            </Box>

            <Box title="Üç aylık geçici gelir vergisi tahmini">
              <form
                action={upsertIncomeTaxEstimateAction}
                className="grid gap-3 sm:grid-cols-2"
              >
                <I n="year" p="Takvim yılı" v={currentYear} t="number" />
                <I n="period" p="Dönem, örn. 2026-Q3" />
                <I
                  n="taxableBusinessBase"
                  p="Vergiye tabi ticari kâr TRY"
                  t="number"
                />
                <I n="estimatedTax" p="Tahmini vergi" r={false} t="number" />
                <I n="currency" p="Para birimi" v="TRY" />
                <I n="assumptions" p="Varsayımlar / muhasebeci notları" />
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input name="salaryIncomeIncluded" type="checkbox" /> Ücret
                  geliri dahil
                </label>
                <B />
              </form>
              <Source href={provisionalTaxSource}>
                GİB geçici vergi oranları
              </Source>
            </Box>

            <Box title="Kayıtlı kurallar">
              {rules.length === 0 ? (
                <Empty />
              ) : (
                rules.map((rule) => (
                  <div className="border-b py-3 text-sm" key={rule.id}>
                    <p className="font-medium">{rule.name}</p>
                    <p className="mt-1 text-stone-600">
                      {rule.taxType} · {rule.calculationMethod} ·{" "}
                      {rule.rate?.toFixed(2) ?? "oran yok"}%
                      {rule.isPlanningDefault
                        ? " · Hesaplayıcı varsayılanı"
                        : ""}
                    </p>
                  </div>
                ))
              )}
              <Source href={incomeTariffSource}>
                GİB 2026 gelir vergisi tarifesi
              </Source>
            </Box>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Rows
              title="Teyit edilmiş yükümlülükler"
              rows={obligations.map(
                (item) =>
                  `${item.taxType} · son tarih ${item.dueDate.toLocaleDateString("tr-TR")} · ${item.status} · ${item.estimatedAmount?.toFixed(2) ?? "—"}`,
              )}
            />
            <Rows
              title="Kayıtlı KDV dönemleri (salt okunur)"
              rows={vat.map(
                (item) =>
                  `${item.year}-${String(item.month).padStart(2, "0")} · tahmini ödenecek ${item.estimatedPayable.toFixed(2)} TRY`,
              )}
            />
            <Rows
              title="Gelir vergisi tahminleri"
              rows={estimates.map(
                (item) =>
                  `${item.year} ${item.period} · ${item.estimatedTax.toFixed(2)} ${item.currency}`,
              )}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

function BenefitCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <article className="card p-5 sm:p-6">
      <span className="pill border-emerald-200 bg-emerald-50 text-emerald-800">
        {badge}
      </span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-stone-600">{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Rows({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Box title={title}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        rows.map((row, index) => (
          <p className="border-b py-3 text-sm" key={index}>
            {row}
          </p>
        ))
      )}
    </Box>
  );
}

function Empty() {
  return <p className="text-sm text-stone-500">Henüz kayıt yok.</p>;
}

function Source({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="mt-3 block text-xs font-medium text-jade underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children} ↗
    </a>
  );
}

function I({
  n,
  p,
  v,
  r = true,
  t = "text",
}: {
  n: string;
  p: string;
  v?: string;
  r?: boolean;
  t?: string;
}) {
  return (
    <label className="text-xs text-stone-600">
      {p}
      <input
        aria-label={p}
        className="field mt-1"
        name={n}
        placeholder={p}
        defaultValue={v}
        required={r}
        type={t}
        step={t === "number" ? "0.01" : undefined}
      />
    </label>
  );
}

function Select({
  n,
  p,
  options,
}: {
  n: string;
  p: string;
  options: [string, string][];
}) {
  return (
    <label className="text-xs text-stone-600">
      {p}
      <select aria-label={p} className="field mt-1" name={n}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function B() {
  return (
    <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
      Kaydet
    </button>
  );
}

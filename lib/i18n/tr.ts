export const tr = {
  shell: {
    dashboard: "Gösterge paneli",
    mainNavigation: "Ana menü",
    profitabilityLedger: "Kârlılık kayıt sistemi",
    localDatabase: "Yerel veritabanı",
    collapse: "Daralt",
    expand: "Genişlet",
  },
  finance: {
    sellerRevenue: "Satıcı geliri",
    buyerPrice: "Müşteri satış fiyatı",
    variableCosts: "Değişken giderler",
    contributionProfit: "Katkı kârı",
    fixedBusinessCosts: "Sabit işletme giderleri",
    preTaxProfit: "Vergi öncesi kâr",
    taxPlanningReserve: "Vergi planlama rezervi",
    cashProfit: "Nakit kâr",
    economicProfit: "Ekonomik kâr",
    profitPerUnit: "Ürün başına kâr",
    profitMargin: "Kâr marjı",
    breakEven: "Başabaş noktası",
    plannedUnits: "Planlanan adet",
    salesProjection: "Satış projeksiyonu",
    customsScenario: "Gümrük senaryosu",
    deductionAudit: "Gider dökümü",
    notConfigured: "Yapılandırılmamış",
    notApplicable: "Uygulanamaz",
    notDeducted: "Düşülmedi",
    includedInOverhead: "Sabit giderlere dahil",
    currentProductMix: "Mevcut ürün karması",
  },
} as const;

export const navigationTr = [
  {
    href: "/inventory",
    label: "Stok",
    children: [
      ["/products", "Ürünler"],
      ["/materials", "Malzemeler"],
      ["/production", "Üretim"],
    ],
  },
  {
    href: "/orders",
    label: "Satış ve planlama",
    children: [
      ["/invoices", "Faturalar"],
      ["/calculator", "Hesaplayıcı"],
      ["/goals", "Aylık hedefler"],
      ["/sales-plan", "Satış planı"],
    ],
  },
  {
    href: "/etsy-import",
    label: "Etsy",
    children: [
      ["/fees", "Ücretler"],
      ["/etsy-payouts", "Ödemeler"],
      ["/reconciliation", "Mutabakat"],
    ],
  },
  {
    href: "/shipping",
    label: "Kargo ve ihracat",
    children: [
      ["/shipentegra", "ShipEntegra"],
      ["/customs", "Gümrük tahminleri"],
      ["/customs-etgb", "Gümrük ve ETGB"],
      ["/documents", "Belgeler"],
    ],
  },
  {
    href: "/banking",
    label: "Finans",
    children: [
      ["/expenses", "Giderler"],
      ["/cash-flow", "Nakit akışı"],
      ["/reports", "Raporlar"],
    ],
  },
  {
    href: "/business",
    label: "İşletme",
    children: [
      ["/formation", "Kuruluş"],
      ["/tax-exemption", "Vergi muafiyeti"],
      ["/accountant", "Muhasebeci"],
      ["/taxes", "Vergiler"],
      ["/sgk", "SGK"],
      ["/compliance", "Uyumluluk"],
    ],
  },
  {
    href: "/settings",
    label: "Ayarlar",
    children: [
      ["/settings/etsy", "Etsy entegrasyonu"],
      ["/settings/shipentegra", "ShipEntegra entegrasyonu"],
      ["/settings/security", "Güvenlik"],
      ["/audit-log", "Denetim kaydı"],
    ],
  },
] as const;

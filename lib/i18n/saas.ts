import type { SaasNavigationKey } from "@/lib/saas/navigation";

export type SaasLocale = "tr" | "en";

type SaasMessages = {
  localeName: string;
  productName: string;
  productTagline: string;
  navigationLabel: string;
  navigation: Record<SaasNavigationKey, string>;
  shell: {
    protectedWorkspace: string;
    phaseNotice: string;
  };
};

export const defaultSaasLocale: SaasLocale = "tr";

export const saasMessages: Record<SaasLocale, SaasMessages> = {
  tr: {
    localeName: "Türkçe",
    productName: "MarmaraLedge",
    productTagline: "Etsy kârlılık çalışma alanı",
    navigationLabel: "SaaS ana navigasyonu",
    navigation: {
      dashboard: "Panel",
      products: "Ürünler",
      orders: "Siparişler",
      profit: "Kâr",
      pricing: "Fiyatlandırma",
      scenarios: "Senaryolar",
      reports: "Raporlar",
      settings: "Ayarlar",
      billing: "Faturalandırma",
      help: "Yardım",
    },
    shell: {
      protectedWorkspace: "Korumalı çalışma alanı",
      phaseNotice: "SaaS kabuğu · Prompt 1",
    },
  },
  en: {
    localeName: "English",
    productName: "MarmaraLedge",
    productTagline: "Etsy profitability workspace",
    navigationLabel: "SaaS primary navigation",
    navigation: {
      dashboard: "Dashboard",
      products: "Products",
      orders: "Orders",
      profit: "Profit",
      pricing: "Pricing",
      scenarios: "Scenarios",
      reports: "Reports",
      settings: "Settings",
      billing: "Billing",
      help: "Help",
    },
    shell: {
      protectedWorkspace: "Protected workspace",
      phaseNotice: "SaaS shell · Prompt 1",
    },
  },
};

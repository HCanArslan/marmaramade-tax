import type { DocumentCategory, OperatingMode } from "@/generated/prisma/client";

export const DEFAULT_ORDER_DOCUMENTS: DocumentCategory[] = [
  "ETSY_ORDER", "ETSY_PAYMENT", "ETSY_LEDGER", "PRODUCT_PHOTO", "PACKAGE_PHOTO",
  "SALES_DOCUMENT", "SHIPENTEGRA_LABEL", "SHIPENTEGRA_INVOICE", "ETGB",
  "CUSTOMS_CALCULATION", "TRACKING_DOCUMENT", "BANK_PAYOUT", "MATERIAL_RECEIPT",
];

export function checklistCompleteness(items: { required: boolean; verified: boolean }[]) {
  const required = items.filter((item) => item.required);
  const verified = required.filter((item) => item.verified).length;
  return { required: required.length, verified, percent: required.length ? Math.round((verified / required.length) * 100) : 100, complete: verified === required.length };
}

export function exemptionLimitStatus(used: number, limit: number) {
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  const level = percent >= 100 ? 100 : percent >= 90 ? 90 : percent >= 75 ? 75 : percent >= 50 ? 50 : 0;
  return { percent, level, message: level === 100 ? "Review transition requirements for the following tax year with the tax office or accountant." : level ? `${level}% artisan exemption limit warning.` : null };
}

export function legalProfileWarnings(profile: { operatingMode: OperatingMode; artisanTaxExemptionEnabled: boolean; artisanTaxExemptionCertificateNumber?: string | null; artisanTaxExemptionExpiryDate?: Date | null; orphanPensionRiskStatus: string; legalSellerName: string; etsyAccountHolderName: string; bankAccountHolderName: string; exporterName: string }, now = new Date()) {
  const warnings: string[] = [];
  if (profile.operatingMode === "ARTISAN_TAX_EXEMPTION") {
    if (["UNKNOWN", "UNDER_REVIEW", "MANUAL_REVIEW_REQUIRED"].includes(profile.orphanPensionRiskStatus)) warnings.push("SGK orphan-pension impact still requires written confirmation.");
    if (!profile.artisanTaxExemptionCertificateNumber) warnings.push("Artisan tax-exemption certificate is missing.");
    if (profile.artisanTaxExemptionExpiryDate && profile.artisanTaxExemptionExpiryDate < now) warnings.push("Artisan tax-exemption certificate has expired.");
  }
  const identities = [profile.etsyAccountHolderName, profile.bankAccountHolderName, profile.exporterName];
  if (identities.some((name) => name.trim().toLocaleLowerCase("tr-TR") !== profile.legalSellerName.trim().toLocaleLowerCase("tr-TR"))) warnings.push("Legal seller, Etsy holder, bank holder, and exporter identities do not all match.");
  return warnings;
}

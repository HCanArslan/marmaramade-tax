import Decimal from "decimal.js";

export type BusinessConsistencyInput = {
  ownerFullName: string;
  etsyLegalSellerName: string;
  bankAccountHolderName: string;
  exporterName: string;
  invoiceIssuerName: string;
  shipEntegraAccountHolderName: string;
  status: string;
  taxOffice?: string | null;
  etgbEnabled: boolean;
  customsRegistrationStatus: string;
  eArchiveEnabled?: boolean | null;
  eInvoiceEnabled?: boolean | null;
  accountantConfirmationStatus: string;
};

const normalized = (value: string) => value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

export function businessConsistencyWarnings(profile: BusinessConsistencyInput) {
  const warnings: string[] = [];
  if (normalized(profile.etsyLegalSellerName) !== normalized(profile.ownerFullName)) warnings.push("Etsy legal seller differs from the active business owner.");
  if (normalized(profile.bankAccountHolderName) !== normalized(profile.ownerFullName)) warnings.push("Bank account holder differs from the legal seller.");
  if (normalized(profile.exporterName) !== normalized(profile.invoiceIssuerName)) warnings.push("Exporter differs from invoice issuer.");
  if (normalized(profile.shipEntegraAccountHolderName) !== normalized(profile.exporterName)) warnings.push("ShipEntegra account holder differs from exporter.");
  if (profile.status === "ACTIVE" && !profile.taxOffice) warnings.push("Business is active but the tax office is missing.");
  if (profile.etgbEnabled && !profile.customsRegistrationStatus.startsWith("CONFIRMED")) warnings.push("ETGB is enabled but customs registration is not confirmed.");
  if (profile.eArchiveEnabled == null && profile.eInvoiceEnabled == null) warnings.push("E-document status is missing.");
  if (profile.accountantConfirmationStatus !== "CONFIRMED_BY_ACCOUNTANT") warnings.push("Accountant confirmation remains pending.");
  return warnings;
}

export function shippingReconciliation(estimate: string, actual: string) {
  const estimated = new Decimal(estimate);
  const reconciled = new Decimal(actual);
  const variance = reconciled.minus(estimated);
  return { estimated, actual: reconciled, variance, variancePercentage: estimated.isZero() ? null : variance.div(estimated).times(100) };
}

export const MAKER_STATUS_WARNING = "Maker and family-contributor status is recorded for operational transparency. Employment, SGK, tax, compensation, and expense treatment must be confirmed separately.";

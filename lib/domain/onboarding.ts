import Decimal from "decimal.js";

export const ONBOARDING_STEP_COUNT = 5;
export const ONBOARDING_SCHEMA_VERSION = 1;

export type CompletenessStatus = "COMPLETE" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE";
export type CompletenessDimension = {
  key: string;
  label: string;
  status: CompletenessStatus;
  blocking: boolean;
};

export type ProductCompletenessInput = {
  materialCost: Decimal.Value | null;
  laborHours: Decimal.Value | null;
  laborRate: Decimal.Value | null;
  packagingCost: Decimal.Value | null;
  shippingCost: Decimal.Value | null;
};

const known = (value: Decimal.Value | null | undefined) => value !== null && value !== undefined;

export function productCompleteness(input: ProductCompletenessInput) {
  const dimensions: CompletenessDimension[] = [
    { key: "material", label: "Material cost", status: known(input.materialCost) ? "COMPLETE" : "MISSING", blocking: true },
    { key: "labour", label: "Labour", status: known(input.laborHours) && known(input.laborRate) ? "COMPLETE" : "MISSING", blocking: true },
    { key: "packaging", label: "Packaging", status: known(input.packagingCost) ? "COMPLETE" : "MISSING", blocking: false },
    { key: "shipping", label: "Shipping", status: known(input.shippingCost) ? "COMPLETE" : "MISSING", blocking: true },
  ];
  return {
    dimensions,
    ready: dimensions.every((item) => !item.blocking || item.status === "COMPLETE"),
  };
}

export function workspaceCompleteness(input: {
  importedListings: number;
  linkedProducts: number;
  products: ProductCompletenessInput[];
  marketplaceFeesAvailable: boolean;
  destinationSelected: boolean;
  businessProfileSelected: boolean;
  tariffConfigured?: boolean;
}) {
  const productStates = input.products.map(productCompleteness);
  const includedProducts = productStates.filter((item) => item.ready).length;
  const dimensions: CompletenessDimension[] = [
    { key: "products_imported", label: "Products imported", status: input.importedListings > 0 ? "COMPLETE" : "MISSING", blocking: true },
    { key: "products_linked", label: "Products linked", status: input.linkedProducts === 0 ? "MISSING" : input.linkedProducts < input.importedListings ? "PARTIAL" : "COMPLETE", blocking: true },
    { key: "product_costs", label: "Product costs", status: includedProducts === 0 ? "MISSING" : includedProducts < input.products.length ? "PARTIAL" : "COMPLETE", blocking: true },
    { key: "marketplace_fees", label: "Marketplace fees", status: input.marketplaceFeesAvailable ? "COMPLETE" : "MISSING", blocking: false },
    { key: "destination", label: "Destination selected", status: input.destinationSelected ? "COMPLETE" : "MISSING", blocking: true },
    { key: "tariff", label: "Tariff/customs", status: input.tariffConfigured ? "COMPLETE" : "PARTIAL", blocking: false },
    { key: "business_profile", label: "Business profile", status: input.businessProfileSelected ? "COMPLETE" : "MISSING", blocking: true },
  ];
  const blockers = dimensions.filter((item) => item.blocking && item.status === "MISSING");
  return {
    dimensions,
    importedListings: input.importedListings,
    linkedProducts: input.linkedProducts,
    includedProducts,
    excludedProducts: input.products.length - includedProducts,
    readiness: blockers.length === 0
      ? (includedProducts === input.products.length ? "Ready for detailed profitability" : "Ready for an initial estimate")
      : blockers.some((item) => item.key === "product_costs") ? "Needs product costs" : "Needs setup details",
    blockingGaps: blockers.map((item) => item.label),
  };
}

export function calculateFirstResult(products: Array<{
  revenue: Decimal.Value | null;
  fees: Decimal.Value | null;
  materialCost: Decimal.Value | null;
  laborHours: Decimal.Value | null;
  laborRate: Decimal.Value | null;
  economicLaborRate: Decimal.Value | null;
  packagingCost: Decimal.Value | null;
  shippingCost: Decimal.Value | null;
  otherKnownCost?: Decimal.Value | null;
}>) {
  const total = { revenue: new Decimal(0), fees: new Decimal(0), knownProductCosts: new Decimal(0), shipping: new Decimal(0), cashProfit: new Decimal(0), economicProfit: new Decimal(0) };
  const warnings = new Set<string>();
  let included = 0;
  for (const product of products) {
    if (![product.revenue, product.materialCost, product.laborHours, product.laborRate, product.shippingCost].every(known)) {
      if (!known(product.materialCost)) warnings.add("Material cost is missing.");
      if (!known(product.shippingCost)) warnings.add("Shipping cost is missing.");
      if (!known(product.laborHours) || !known(product.laborRate)) warnings.add("Labour cost is missing.");
      continue;
    }
    const revenue = new Decimal(product.revenue!);
    const fees = known(product.fees) ? new Decimal(product.fees!) : new Decimal(0);
    if (!known(product.fees)) warnings.add("Known Etsy fees are not available for this preview.");
    const material = new Decimal(product.materialCost!);
    const hours = new Decimal(product.laborHours!);
    const labour = hours.mul(product.laborRate!);
    const economicLabour = hours.mul(product.economicLaborRate ?? product.laborRate!);
    const packaging = new Decimal(product.packagingCost ?? 0);
    const shipping = new Decimal(product.shippingCost!);
    const other = new Decimal(product.otherKnownCost ?? 0);
    const cashCosts = material.plus(packaging).plus(shipping).plus(other).plus(fees);
    const economicCosts = cashCosts.plus(economicLabour);
    total.revenue = total.revenue.plus(revenue);
    total.fees = total.fees.plus(fees);
    total.knownProductCosts = total.knownProductCosts.plus(material).plus(labour).plus(packaging).plus(other);
    total.shipping = total.shipping.plus(shipping);
    total.cashProfit = total.cashProfit.plus(revenue.minus(cashCosts));
    total.economicProfit = total.economicProfit.plus(revenue.minus(economicCosts));
    included += 1;
  }
  return { ...total, included, excluded: products.length - included, warnings: [...warnings] };
}

export const businessPresetFor = (businessType: string) =>
  businessType === "OTHER_OR_UNKNOWN" || businessType === "NO_REGISTERED_BUSINESS"
    ? "NONE"
    : businessType === "ARTISAN_EXEMPTION"
      ? "CONSERVATIVE"
      : "STANDARD";

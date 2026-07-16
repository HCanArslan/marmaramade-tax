import "server-only";

export const SHIPENTEGRA_PRODUCTION_SERVER =
  "https://publicapi.shipentegra.com/v1" as const;

export const shipEntegraEndpoints = {
  token: "/auth/token",
  calculatePrice: "/tools/calculate",
  calculateAllPrices: "/tools/calculate/all",
  tariffSearch: "/tools/tariff-calculator",
  tariffEstimate: "/tools/tariff-calculator/by-carrier",
  createOrder: "/orders",
  listOrders: "/orders/manual",
  order: (id: number) => `/orders/manual/${id}` as const,
  cargoActivities: "/logistics/shipments/activities",
  logisticsFiles: (id: number) => `/logistics/files/${id}` as const,
  shipEntegraLabel: "/logistics/labels/shipentegra",
  upsLabel: "/logistics/labels/shipentegra/ups",
  fedExLabel: "/logistics/labels/shipentegra/fedex",
  dhlEcommerceLabel: "/logistics/labels/shipentegra/dhlecommerce",
  currencies: "/settings/currencies",
  carriers: "/users/carriers",
  stores: "/users/stores",
  markEtgb: "/orders/etgb",
} as const;

export type ShipEntegraReadOperation =
  | "LIST_ORDERS"
  | "FIND_ORDER"
  | "CARGO_ACTIVITIES"
  | "LIST_LOGISTICS_FILES"
  | "EXCHANGE_RATES"
  | "FIND_CARRIERS"
  | "LIST_STORES";

export const ENDPOINT_INVENTORY = [
  ["POST", "/auth/token", "READ_ONLY", "Implemented"],
  [
    "POST",
    "/tools/calculate",
    "QUOTE",
    "Documented; single-carrier wrapper available",
  ],
  ["POST", "/tools/calculate/all", "QUOTE", "Implemented"],
  [
    "POST",
    "/tools/tariff-calculator",
    "QUOTE",
    "Documented; not enabled in shipping flow",
  ],
  [
    "POST",
    "/tools/tariff-calculator/by-carrier",
    "QUOTE",
    "Documented; not enabled in shipping flow",
  ],
  [
    "POST",
    "/orders",
    "SHIPMENT_MUTATION",
    "Implemented with confirmation and local idempotency",
  ],
  ["POST", "/orders/manual", "UNSUPPORTED", "Deprecated March 1, 2026"],
  ["GET", "/orders/manual", "READ_ONLY", "Implemented"],
  ["GET", "/orders/manual/{shipEntegraOrderId}", "READ_ONLY", "Implemented"],
  ["PUT", "/orders/{shipEntegraOrderId}", "SHIPMENT_MUTATION", "Not enabled"],
  [
    "POST",
    "/orders/{shipEntegraOrderId}/hold",
    "SHIPMENT_MUTATION",
    "Not enabled",
  ],
  [
    "POST",
    "/orders/{shipEntegraOrderId}/unhold",
    "SHIPMENT_MUTATION",
    "Not enabled",
  ],
  ["POST", "/orders/post", "SHIPMENT_MUTATION", "Not enabled"],
  [
    "POST",
    "/logistics/labels/shipentegra",
    "DOCUMENT",
    "Implemented with confirmation",
  ],
  [
    "POST",
    "/logistics/labels/shipentegra/ups",
    "DOCUMENT",
    "Documented; not enabled",
  ],
  [
    "POST",
    "/logistics/labels/shipentegra/fedex",
    "DOCUMENT",
    "Documented; not enabled",
  ],
  [
    "POST",
    "/logistics/labels/shipentegra/dhlecommerce",
    "DOCUMENT",
    "Documented; not enabled",
  ],
  ["POST", "/logistics/files", "DOCUMENT", "Not enabled"],
  [
    "GET",
    "/logistics/files/{orderId}",
    "DOCUMENT",
    "Implemented metadata retrieval",
  ],
  [
    "DELETE",
    "/logistics/files/{orderId}",
    "UNSUPPORTED",
    "Destructive; not enabled",
  ],
  ["GET", "/logistics/shipments/activities", "TRACKING", "Implemented"],
  ["GET", "/settings/currencies", "READ_ONLY", "Implemented"],
  ["GET", "/users/carriers", "READ_ONLY", "Implemented"],
  ["GET", "/users/stores", "READ_ONLY", "Implemented"],
  ["PATCH", "/orders/etgb", "SHIPMENT_MUTATION", "Documented; not enabled"],
] as const;

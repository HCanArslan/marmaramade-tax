const enc = encodeURIComponent;
export const ETSY_LISTING_STATES = ["active", "inactive", "sold_out", "draft", "expired"] as const;
export const EtsyEndpoints = {
  shop: (shopId: string) => `shops/${enc(shopId)}`,
  listings: (shopId: string, state: (typeof ETSY_LISTING_STATES)[number], offset: number, limit = 100) => `shops/${enc(shopId)}/listings?state=${state}&limit=${limit}&offset=${offset}&includes=BuyerPrice`,
  listingImages: (listingId: string) => `listings/${enc(listingId)}/images`,
  listingInventory: (listingId: string) => `listings/${enc(listingId)}/inventory`,
  receipts: (shopId: string, offset: number, limit = 100) => `shops/${enc(shopId)}/receipts?limit=${limit}&offset=${offset}`,
  receiptTransactions: (shopId: string, receiptId: string) => `shops/${enc(shopId)}/receipts/${enc(receiptId)}/transactions`,
  payments: (shopId: string, paymentIds: string[]) => `shops/${enc(shopId)}/payments?payment_ids=${paymentIds.map(enc).join(",")}`,
  ledgerPayments: (shopId: string, entryIds: string[]) => `shops/${enc(shopId)}/payment-account/ledger-entries/payments?ledger_entry_ids=${entryIds.map(enc).join(",")}`,
  ledger: (shopId: string, minCreated: number, maxCreated: number, offset: number, limit = 100) => `shops/${enc(shopId)}/payment-account/ledger-entries?min_created=${minCreated}&max_created=${maxCreated}&limit=${limit}&offset=${offset}`,
} as const;

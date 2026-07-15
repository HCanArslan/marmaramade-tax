const enc = encodeURIComponent;
export const EtsyEndpoints = {
  shop: (shopId: string) => `shops/${enc(shopId)}`,
  activeListings: (shopId: string, offset: number, limit = 100) => `shops/${enc(shopId)}/listings?state=active&limit=${limit}&offset=${offset}`,
  listingImages: (listingId: string) => `listings/${enc(listingId)}/images`,
  listingInventory: (listingId: string) => `listings/${enc(listingId)}/inventory`,
  receipts: (shopId: string, offset: number, limit = 100) => `shops/${enc(shopId)}/receipts?limit=${limit}&offset=${offset}`,
  receiptTransactions: (shopId: string, receiptId: string) => `shops/${enc(shopId)}/receipts/${enc(receiptId)}/transactions`,
  payments: (shopId: string, paymentIds: string[]) => `shops/${enc(shopId)}/payments?payment_ids=${paymentIds.map(enc).join(",")}`,
  ledgerPayments: (shopId: string, entryIds: string[]) => `shops/${enc(shopId)}/payment-account/ledger-entries/payments?ledger_entry_ids=${entryIds.map(enc).join(",")}`,
  ledger: (shopId: string, offset: number, limit = 100) => `shops/${enc(shopId)}/payment-account/ledger-entries?limit=${limit}&offset=${offset}`,
} as const;

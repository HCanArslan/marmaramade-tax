export type LedgerCategory = "TRANSACTION" | "LISTING" | "REGULATORY" | "PAYMENT_PROCESSING" | "SELLER_FEE_VAT" | "REFUND" | "DEPOSIT" | "ADVERTISING" | "OTHER";
export function mapLedgerEntry(type: string, description = ""): { category: LedgerCategory; confidence: number; manualReview: boolean } {
  const value = `${type} ${description}`.toLowerCase();
  const rules: Array<[RegExp, LedgerCategory, number]> = [[/transaction fee/,"TRANSACTION",0.98],[/listing fee/,"LISTING",0.98],[/regulatory/,"REGULATORY",0.95],[/processing/,"PAYMENT_PROCESSING",0.9],[/\bvat\b|value added tax/,"SELLER_FEE_VAT",0.9],[/refund/,"REFUND",0.95],[/deposit/,"DEPOSIT",0.9],[/offsite|advertis|etsy ads/,"ADVERTISING",0.85]];
  const match = rules.find(([pattern]) => pattern.test(value));
  return match ? { category: match[1], confidence: match[2], manualReview: match[2] < 0.9 } : { category: "OTHER", confidence: 0, manualReview: true };
}

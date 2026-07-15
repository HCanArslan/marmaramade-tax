import { z } from "zod";
const moneySchema = z.object({ amount: z.number(), divisor: z.number().positive(), currency_code: z.string().min(3).max(3) });
const timestamp = z.number().int().nonnegative().nullable().optional();
const buyerPriceSchema = z.object({
  base_price: moneySchema.nullish(),
  shipping_cost: moneySchema.nullish(),
  is_free_shipping: z.boolean().nullish(),
  original_price: moneySchema.nullish(),
  discounted_price: moneySchema.nullish(),
  discount_amount: moneySchema.nullish(),
  discount_percentage: z.number().nonnegative().nullish(),
  has_discount: z.boolean().nullish(),
  discount_start_epoch: timestamp,
  discount_end_epoch: timestamp,
}).passthrough();
export const etsyShopSchema = z.object({ shop_id: z.number().int().positive(), shop_name: z.string(), title: z.string().nullable().optional(), currency_code: z.string().optional(), url: z.string().url().optional(), create_date: timestamp, update_date: timestamp, active_listing_count: z.number().int().optional(), transaction_sold_count: z.number().int().optional(), review_count: z.number().int().optional(), review_average: z.number().optional() }).passthrough();
export const etsyListingSchema = z.object({
  listing_id: z.number().int().positive(),
  user_id: z.number().optional(),
  shop_id: z.number().optional(),
  title: z.string(),
  description: z.string().optional(),
  state: z.string(),
  quantity: z.number().int(),
  price: moneySchema,
  buyer_price: buyerPriceSchema.nullish(),
  taxonomy_id: z.number().optional(),
  shop_section_id: z.number().nullable().optional(),
  shipping_profile_id: z.number().nullable().optional(),
  return_policy_id: z.number().nullable().optional(),
  url: z.string().url().optional(),
  num_favorers: z.number().int().optional(),
  listing_type: z.string().optional(),
  type: z.string().optional(),
  is_taxable: z.boolean().optional(),
  non_taxable: z.boolean().optional(),
  is_customizable: z.boolean().optional(),
  is_personalizable: z.boolean().optional(),
  tags: z.array(z.string()).nullable().optional(),
  materials: z.array(z.string()).nullable().optional(),
  item_weight: z.number().nullable().optional(),
  item_weight_unit: z.string().nullable().optional(),
  item_length: z.number().nullable().optional(),
  item_width: z.number().nullable().optional(),
  item_height: z.number().nullable().optional(),
  item_dimensions_unit: z.string().nullable().optional(),
  processing_min: z.number().int().nullable().optional(),
  processing_max: z.number().int().nullable().optional(),
  skus: z.array(z.string()).optional(),
  creation_timestamp: timestamp,
  updated_timestamp: timestamp,
  ending_timestamp: timestamp,
}).passthrough();
export const etsyListingImageSchema = z.object({ listing_image_id: z.number().int().positive(), rank: z.number().int(), url_fullxfull: z.string().url(), url_170x135: z.string().url().optional(), updated_timestamp: timestamp }).passthrough();
export const etsyInventorySchema = z.object({ products: z.array(z.object({ product_id: z.number().int().optional(), sku: z.string().optional(), is_deleted: z.boolean().optional(), property_values: z.array(z.object({ property_id: z.number().optional(), property_name: z.string().optional(), values: z.array(z.string()).optional() }).passthrough()).optional(), offerings: z.array(z.object({ quantity: z.number().int().optional(), is_enabled: z.boolean().optional(), price: moneySchema.optional() }).passthrough()).optional() }).passthrough()) }).passthrough();
export const etsyReceiptSchema = z.object({ receipt_id: z.number().int().positive(), create_timestamp: z.number().int(), update_timestamp: timestamp, is_paid: z.boolean().optional(), is_shipped: z.boolean().optional(), country_iso: z.string().nullish(), state: z.string().nullish(), zip: z.string().nullish(), grandtotal: moneySchema, subtotal: moneySchema.nullish(), total_shipping_cost: moneySchema.nullish(), total_tax_cost: moneySchema.nullish(), discount_amt: moneySchema.nullish(), transactions: z.array(z.object({ transaction_id: z.number().int().positive(), listing_id: z.number().int().nullish(), title: z.string(), quantity: z.number().int(), price: moneySchema, sku: z.string().nullish() }).passthrough()).nullish() }).passthrough();
export const etsyPaymentSchema = z.object({ payment_id: z.number().int().positive(), receipt_id: z.number().int().optional(), amount_gross: moneySchema, amount_fees: moneySchema, amount_net: moneySchema, adjusted_gross: moneySchema.optional(), adjusted_fees: moneySchema.optional(), adjusted_net: moneySchema.optional(), posted_gross: moneySchema.optional(), posted_fees: moneySchema.optional(), posted_net: moneySchema.optional(), posted_timestamp: timestamp }).passthrough();
export const etsyLedgerEntrySchema = z.object({ entry_id: z.number().int().positive(), ledger_id: z.number().int().optional(), sequence_number: z.number().optional(), amount: moneySchema, balance: moneySchema.optional(), description: z.string().optional(), reference_type: z.string().optional(), create_date: z.number().int() }).passthrough();
export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ count: z.number().int().nonnegative(), results: z.array(item) }).passthrough();
export type EtsyListingPayload = z.infer<typeof etsyListingSchema>;

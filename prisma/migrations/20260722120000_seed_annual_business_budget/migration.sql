UPDATE "RecurringBusinessCost"
SET "includeInSalesPlan" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" NOT IN (
  'annual_budget_mukellef',
  'annual_budget_chatgpt',
  'annual_budget_packaging',
  'annual_budget_etsy'
);

INSERT INTO "RecurringBusinessCost" (
  "id", "name", "category", "amount", "currency", "billingFrequency",
  "vatRate", "includeInSalesPlan", "effectiveFrom", "notes", "createdAt", "updatedAt"
)
VALUES
  (
    'annual_budget_mukellef', 'Mükellef.co business package', 'ACCOUNTING',
    2999, 'TRY', 'MONTHLY', 20, true, TIMESTAMP '2026-07-22',
    'Company formation, e-invoice, first-year 1,000 credits, e-signature, pre-accounting, digital documents, online accounting, trademark analysis and 1,200 transactions/year.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'annual_budget_chatgpt', 'ChatGPT Plus', 'SOFTWARE',
    24, 'USD', 'MONTHLY', 0, true, TIMESTAMP '2026-07-22',
    'Monthly gross cash price; no additional VAT is added by the plan.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'annual_budget_packaging', 'Annual packaging supplies budget', 'OTHER',
    1500, 'TRY', 'ANNUAL', 0, true, TIMESTAMP '2026-07-22',
    'Annual supplies budget. Legacy monthly overhead and Etsy assumptions are not added to it.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'annual_budget_etsy', 'Etsy business subscription', 'SOFTWARE',
    480, 'TRY', 'MONTHLY', 0, true, TIMESTAMP '2026-07-22',
    'Monthly gross cash price used in the annual sell-all plan.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "amount" = EXCLUDED."amount",
  "currency" = EXCLUDED."currency",
  "billingFrequency" = EXCLUDED."billingFrequency",
  "vatRate" = EXCLUDED."vatRate",
  "includeInSalesPlan" = true,
  "effectiveTo" = NULL,
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;

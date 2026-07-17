ALTER TABLE "TaxRuleVersion"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'LEGAL_RATE',
ADD COLUMN "calculationMethod" TEXT NOT NULL DEFAULT 'FLAT_RATE',
ADD COLUMN "taxBase" TEXT,
ADD COLUMN "lowerBound" DECIMAL(65,30),
ADD COLUMN "upperBound" DECIMAL(65,30),
ADD COLUMN "isPlanningDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "evidenceRequirement" TEXT;

INSERT INTO "TaxRuleVersion" (
  "id", "name", "taxType", "purpose", "calculationMethod", "taxBase",
  "rate", "lowerBound", "upperBound", "currency", "isPlanningDefault",
  "confirmationStatus", "effectiveFrom", "source", "notes", "createdAt", "updatedAt"
)
SELECT
  'tax_2026_income_bracket_1', '2026 Gelir Vergisi Tarifesi - Ilk Dilim',
  'ANNUAL_INCOME_TAX', 'LEGAL_RATE', 'PROGRESSIVE_BRACKET', 'ANNUAL_TAXABLE_INCOME',
  15, 0, 190000, 'TRY', false, 'MANUAL_OVERRIDE', TIMESTAMP '2026-01-01',
  'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf',
  'Official GIB tariff. Threshold is taxable income, not turnover.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleVersion" WHERE "id" = 'tax_2026_income_bracket_1'
);

INSERT INTO "TaxRuleVersion" (
  "id", "name", "taxType", "purpose", "calculationMethod", "taxBase",
  "rate", "lowerBound", "upperBound", "currency", "isPlanningDefault",
  "confirmationStatus", "effectiveFrom", "source", "notes", "createdAt", "updatedAt"
)
SELECT
  'tax_2026_income_bracket_2', '2026 Gelir Vergisi Tarifesi - Ikinci Dilim',
  'ANNUAL_INCOME_TAX', 'LEGAL_RATE', 'PROGRESSIVE_BRACKET', 'ANNUAL_TAXABLE_INCOME',
  20, 190000, 400000, 'TRY', false, 'MANUAL_OVERRIDE', TIMESTAMP '2026-01-01',
  'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf',
  'Official GIB tariff. Only the portion above 190,000 TRY enters this bracket.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleVersion" WHERE "id" = 'tax_2026_income_bracket_2'
);

INSERT INTO "TaxRuleVersion" (
  "id", "name", "taxType", "purpose", "calculationMethod", "taxBase",
  "rate", "currency", "isPlanningDefault", "confirmationStatus", "effectiveFrom",
  "source", "notes", "createdAt", "updatedAt"
)
SELECT
  'tax_2026_provisional_income', '2026 Gecici Gelir Vergisi',
  'PROVISIONAL_INCOME_TAX', 'LEGAL_RATE', 'FLAT_RATE', 'QUARTERLY_TAXABLE_BUSINESS_PROFIT',
  15, 'TRY', false, 'MANUAL_OVERRIDE', TIMESTAMP '2026-01-01',
  'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgecici-vergi-oranlari.pdf',
  '15% provisional tax planning rate; paid provisional tax is credited against annual income tax.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleVersion" WHERE "id" = 'tax_2026_provisional_income'
);

INSERT INTO "TaxRuleVersion" (
  "id", "name", "taxType", "purpose", "calculationMethod", "taxBase",
  "rate", "currency", "isPlanningDefault", "evidenceRequirement", "confirmationStatus",
  "effectiveFrom", "source", "notes", "createdAt", "updatedAt"
)
SELECT
  'tax_2026_etgb_export_vat', 'ETGB Export VAT Full Exemption',
  'EXPORT_VAT', 'VAT_TREATMENT', 'FULL_EXEMPTION_EXPORT', 'ETGB_EXPORT_REVENUE',
  0, 'TRY', false, 'ETGB/customs declaration evidence and closing date', 'MANUAL_OVERRIDE',
  TIMESTAMP '2026-01-01', 'https://www.gib.gov.tr/mevzuat/kanun/436/teblig/9083',
  'Full export exemption under KDVK 11/1-a; this is not an ordinary domestic zero-rate sale.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleVersion" WHERE "id" = 'tax_2026_etgb_export_vat'
);

INSERT INTO "TaxRuleVersion" (
  "id", "name", "taxType", "purpose", "calculationMethod", "taxBase",
  "rate", "currency", "isPlanningDefault", "confirmationStatus", "effectiveFrom",
  "source", "notes", "createdAt", "updatedAt"
)
SELECT
  'tax_2026_income_safety_reserve', '2026 Income-tax Safety Reserve',
  'INCOME_TAX_SAFETY_RESERVE', 'PLANNING_RESERVE', 'FLAT_RATE', 'POSITIVE_PRE_TAX_PROFIT',
  20, 'TRY', true, 'MANUAL_OVERRIDE', TIMESTAMP '2026-01-01',
  'User-approved planning assumption; legal rates sourced from GIB tariff',
  'Conservative cash-planning reserve, not a filed tax liability and not an additional tax.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TaxRuleVersion" WHERE "id" = 'tax_2026_income_safety_reserve'
);

CREATE INDEX "TaxRuleVersion_purpose_isPlanningDefault_effectiveFrom_idx"
ON "TaxRuleVersion"("purpose", "isPlanningDefault", "effectiveFrom");

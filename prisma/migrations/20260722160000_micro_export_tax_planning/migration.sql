UPDATE "TaxRuleVersion"
SET
  "name" = 'Income-tax Planning Reserve',
  "taxBase" = 'MICRO_EXPORT_50_PERCENT_PLANNING_BASE',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'tax_2026_income_safety_reserve';

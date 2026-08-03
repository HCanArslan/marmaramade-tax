# Prompt 3 model classification

This inventory records the Prompt 3 persistence boundary before tenancy schema changes. It is intentionally additive: no existing Prisma model or historical row is removed. A model classified as private-only remains available to the legacy founder ledger but must not be exposed through new SaaS repositories.

## Identity and workspace foundation

Retained as shared authentication or tenant-control infrastructure:

- `User`, `Session`, `Account`, `Verification`, `RateLimit`
- `Workspace`, `Membership`, `UserPreference`, `LegalAcceptance`
- `LegacyWorkspaceAssignment`, `AuthSecurityEvent`

These models are not workspace-owned domain rows themselves. `Membership` and trusted server-side workspace resolution remain the authorization source.

## Retained SaaS core

The following models remain the basis of the SaaS product and receive direct or inherited workspace/shop ownership where Prompt 3 requires it:

- Product and cost data: `Product`, `ProductCostVersion`, `ProductMaterialCost`, `PackageProfile`
- Marketplace fees and rates: `FeeProfile`, `FeeRule`, `ExchangeRateSnapshot`
- Orders and immutable calculations: `Order`, `OrderItem`, `OrderCostSnapshot`, `OrderCostLine`, `OrderAdjustment`
- Planning inputs retained for compatibility: `ShippingQuote`, `CustomsQuote`
- Etsy read-only import: `EtsyConnection`, `EtsyOAuthState`, `EtsySyncRun`, `EtsySyncError`, `EtsyListing`, `EtsyListingImage`, `EtsyListingProductLink`, `EtsyReceipt`, `EtsyReceiptItem`, `EtsyPayment`, `EtsyLedgerEntry`, `EtsyWebhookEvent`, `EtsyImportMapping`
- Operational evidence retained for regression/legacy screens: `CustomsActualCharge`, `EtgbCostRecord`, `ExternalCalculatorComparison`
- Audit and security records retained but not exposed as general SaaS repositories: `AuditLog`, `LoginAttempt`, `AdminSecurityEvent`

`Shop` is added as the new workspace-owned platform boundary above Etsy data. OAuth scopes and the GET-only Etsy policy do not change.

## Transformed into additive SaaS foundations

These existing models and their data remain intact. Prompt 3 adds simpler, workspace-owned successors rather than rewriting history:

- `Marketplace` is superseded for tenant integrations by `Shop`; the legacy lookup table remains.
- `BusinessProfile`, `BusinessProfileVersion`, and `LegalOperatingProfile` remain private/legacy inputs. `WorkspaceBusinessProfile` and `WorkspaceBusinessProfileVersion` provide the non-adjudicative SaaS planning profile.
- `CostAssumptionProfile`, `RecurringBusinessCost`, and `MonthlyOverhead` remain available to legacy calculations. `WorkspaceCostDefaultVersion` provides effective-dated SaaS defaults.
- `AppSetting` remains the legacy global compatibility store. New typed settings use required workspace ownership in `WorkspaceSetting`, avoiding ambiguous nullable compound upserts.
- Legacy `Scenario`, `ScenarioResult`, `ProfitGoal`, `ProfitGoalVersion`, `GoalScenario`, `GoalScenarioProduct`, `GoalScenarioResult`, and `MonthlyActualSummary` remain untouched. New `PortfolioScenario`, `PortfolioScenarioVersion`, `PortfolioScenarioItem`, `PortfolioScenarioAssumption`, `PortfolioScenarioResult`, and `PortfolioScenarioResultLine` form the immutable SaaS scenario foundation.

## Preserved legacy/private-only

These models are not dropped, backfilled into new SaaS repositories, or exposed through the Prompt 3 SaaS data-access surface:

- Legal, compliance, and documents: `LegalOperatingProfile`, `TaxExemptionLimitVersion`, `ComplianceCase`, `StoredDocument`, `DocumentRequirementRule`, `OrderDocumentChecklist`, `OrderDocumentChecklistItem`, `WithholdingRecord`
- Goals and private planning workflow: `ProfitGoal`, `ProfitGoalVersion`, `GoalScenario`, `GoalScenarioProduct`, `GoalScenarioResult`, `MonthlyActualSummary`
- Private business identity and formation: `BusinessProfile`, `BusinessPerson`, `BusinessPersonRole`, `FormationTask`
- Banking and owner accounting: `BankAccount`, `PaymentCard`, `BankTransaction`, `BankTransactionMatch`, `OwnerTransaction`, `Expense`, `RecurringExpense`, `ExpenseAllocation`, `FixedAsset`
- Materials and production operations: `Material`, `MaterialPurchaseLot`, `MaterialInventoryTransaction`, `ProductionBatch`, `ProductionUnit`, `FinishedInventoryTransaction`
- Payouts, documents, and invoicing: `EtsyPayout`, `EtsyPayoutReconciliation`, `SalesDocument`
- Private logistics and shipment mutation: `ShipEntegraConnection`, `ShipEntegraQuote`, `ShipEntegraConfirmation`, `ShipEntegraShipmentOperation`, `ShipEntegraShipment`, `ShipEntegraTrackingEvent`, `ShipEntegraShipmentSnapshot`, `ShipEntegraApiCall`, `ShippingCostAdjustment`
- Customs, export, tax, SGK, and accountant workflows: `CustomsProfile`, `TariffVersion`, `MicroExportCase`, `TaxRuleVersion`, `TaxObligation`, `VatPeriod`, `IncomeTaxEstimate`, `SgkMonthStatus`, `AccountantPeriod`

## Ownership policy

- New ownership columns on existing retained rows start nullable.
- Direct ownership is used where repository filtering or independent record identity requires it; child relations also inherit ownership through their parent.
- Existing MarmaraMade rows are assigned only through the workspace referenced by `LegacyWorkspaceAssignment`.
- Ambiguous or unrelated rows remain unassigned and are reported.
- No financial amount, snapshot, hash, external identifier, effective date, or historical timestamp is recalculated or rewritten.

# Goal planning

The default metric is `REALISTIC_AFTER_TAX_AND_RESERVES`, not official accounting net profit. A goal stores its currency, period, operating profile, planning mode, and exchange-rate assumption. Current exchange rates never silently change saved goals; recalculation creates a new version.

Average-product mode evaluates the full Decimal-safe calculation engine. Units equal the ceiling of target divided by realistic unit profit. When unit profit is non-positive, no misleading count is shown and reverse pricing finds a feasible price.

Product-combination and inventory modes use bounded search over stock, unit, and labor constraints. The optimizer caps visited states to prevent long requests and labels capped output approximate. One-of-one stock is never treated as replenishable unless explicitly configured.

Compare Offsite Ads, shipping/customs bands, and legal operating profiles as separate scenarios. Saved results retain the exact inputs used.

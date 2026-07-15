# Existing SQLite to PostgreSQL migration

This procedure preserves the original `prisma/dev.db`, IDs, Decimal text, timestamps, effective ranges, foreign keys, and immutable snapshot rows. Test it against a copy before production.

## 1. Back up and inventory

Stop writes, copy `prisma/dev.db` to an offline backup, and record row counts for every table. Run SQLite integrity and FK checks:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Export schema-independent table data with a trusted SQLite tool into a protected staging artifact. Do not place the export in Git.

## 2. Create the PostgreSQL target

Create an empty database with UTF-8 encoding and a least-privilege application role. Set `DATABASE_URL`/`DIRECT_URL`, then create final typed tables:

```bash
npm install
npm run db:deploy
```

Do not run the seed against a database containing real migrated records.

## 3. Load to a staging schema

Use `pgloader` or an equivalent audited migration tool to load the SQLite copy into a PostgreSQL `legacy_sqlite` schema—not directly into `public`. Disable no final constraints. Keep source IDs as text and SQLite Decimal representations as text/numeric in staging.

Example starting point (review before running):

```lisp
LOAD DATABASE
  FROM sqlite:///absolute/path/to/dev-copy.db
  INTO postgresql://migration_user:REDACTED@host/database
  WITH data only, create no tables, reset no sequences
  SET search_path to 'legacy_sqlite';
```

Credentials belong in a protected pgpass/environment mechanism, not this file or shell history.

## 4. Insert parents before children

In one PostgreSQL transaction, insert/upsert using original IDs in this order:

1. Product, PackageProfile, Marketplace, FeeProfile, BusinessProfileVersion, ShippingQuote, CustomsQuote, ExchangeRateSnapshot, Scenario, MonthlyOverhead, AppSetting
2. ProductCostVersion, FeeRule, Order, ScenarioResult
3. OrderItem, OrderCostSnapshot
4. OrderCostLine, AuditLog

Use quoted mixed-case Prisma table/column names. Cast Decimal columns explicitly to the exact target `DECIMAL` type, booleans explicitly to boolean, and timestamps with timezone-aware conversion. Use `INSERT ... ON CONFLICT DO NOTHING` keyed by the original primary/unique IDs so a verified rerun is idempotent.

The new auth/Etsy tables start empty.

## 5. Validate before commit

Within the transaction:

- compare every source/staging/final row count;
- compare primary-key sets and unique business keys;
- run orphan checks for every relation;
- compare Decimal aggregates in native TRY and USD;
- compare min/max timestamps and effective ranges;
- hash canonical exports of `OrderCostSnapshot` and `OrderCostLine` rows;
- verify the 34.21 USD shipping and 28.95 USD customs records exactly.

Commit only if every check passes; otherwise roll back. Retain the source backup read-only until production reconciliation is complete.

## 6. Post-migration verification

Run tests/build, sign in, compare historical reports, and inspect representative snapshots. Do not re-run seed or modify historical snapshots to resolve a mismatch—correct the staging/import mapping and repeat on a fresh target.

The legacy SQLite migration is preserved under `prisma/migrations-sqlite-legacy/` for audit evidence; it is not part of PostgreSQL `migrate deploy`.

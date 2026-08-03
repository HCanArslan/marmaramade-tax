# MarmaraLedge SaaS architecture boundaries

Status: Prompt 1 foundation. These boundaries apply until a later reviewed
phase replaces them.

## Route boundaries

Next.js route groups separate layouts without changing public URLs:

- `app/(public)` owns `/`, `/pricing`, `/etsy-kar-hesaplama`, and `/blog`.
  These routes never load the private Ledger shell or private records.
- `app/(auth)` owns `/login`, `/signup`, and `/forgot-password`. Only the
  existing single-admin login is functional. Signup and password reset are
  explicit placeholders until the authentication phase.
- `app/(saas)/app` owns the protected `/app/**` foundation. Its navigation is
  limited to Dashboard, Products, Orders, Profit, Pricing, Scenarios, Reports,
  Settings, Billing, and Help.
- Existing private Ledger routes remain protected and compiled behind the
  legacy `AppShell`. They are excluded from the SaaS navigation. The former
  private root dashboard is retained at `/ledger` because `/` is now public.

The root proxy keeps `/app/**` and every retained legacy route authenticated.
Only the public and authentication foundations, existing authentication APIs,
approved webhooks/callbacks, and health endpoint are excluded from the matcher.

## Protected financial engine

The following reusable Decimal-safe modules are frozen during the SaaS shell
conversion:

- `lib/domain/money.ts`
- `lib/domain/calculator.ts`
- `lib/domain/product-cost.ts`
- `lib/domain/fee-profile.ts`
- `lib/domain/profitability.ts`
- `lib/domain/income-tax-planning.ts`
- `lib/domain/tax-planning.ts`
- `lib/domain/sales-plan.ts`
- `lib/domain/overhead.ts`
- `lib/goals/planner.ts`

Future changes must preserve explicit unknown values, effective-dated inputs,
immutable calculation snapshots, cash/economic profit separation, and exact
Decimal parity fixtures. UI code must call this boundary rather than duplicate
formulas.

## Server data access

Approved locations are:

- `lib/server/db/client.ts`: constructs the Prisma client and is the only new
  location allowed to import the generated client or database adapter.
- `lib/server/repositories/**`: tenant-scoped persistence functions may import
  the database client. The health repository is the first migrated example.
- Future `lib/server/services/**`: orchestration may call repositories, but may
  not import Prisma directly.

`lib/prisma.ts` is a temporary compatibility re-export. The Prompt 0 legacy
callers are listed exactly in `scripts/assert-prisma-boundary.ts`. The allowlist
may only shrink. `npm run guard:prisma-boundary`, also included in `npm run
lint`, rejects new compatibility imports, new direct client imports, stale
allowlist entries, and arbitrary generated Prisma imports.

## Retained, transformed, and excluded surfaces

Retained unchanged:

- Prisma schema, migration history, models, and historical records;
- existing private ERP pages, actions, APIs, and integrations;
- NextAuth v4 single-admin behavior until Prompt 2;
- Etsy OAuth/webhook/read-only safeguards and GET-only marketplace client;
- financial engine modules and calculation parity fixtures.

Transformed reversibly:

- `/` changes from the private dashboard to the public shell;
- the private dashboard moves to `/ledger`;
- `/login` moves into an auth route group without changing its URL;
- root shell selection delegates public/auth/SaaS routes to dedicated layouts;
- Prisma construction moves from `lib/prisma.ts` to `lib/server/db/client.ts`;
- `/api/health` demonstrates repository-backed access.

Excluded from the new SaaS navigation, but not deleted:

- banking, cash flow, invoices, expenses, tax/SGK, formation, compliance,
  private documents, accountant handoff, inventory, materials, production,
  ShipEntegra operations, Etsy reconciliation, and private audit tooling.

## In-place conversion and migration safety

- The `pre-saas-conversion` tag is the code recovery point.
- Prompt 1 makes no schema or data change and creates no migration.
- Before the first additive SaaS migration, take and verify a recoverable
  database backup, inventory every committed migration, and rehearse against a
  non-production copy.
- Future schema work must be additive: nullable columns/tables first, explicit
  backfill with counts and reconciliation, constraints only after verification.
- Never use `prisma db push`, migration reset, destructive seed, or clone
  private production data into SaaS production.

## Rules for later Codex phases

1. Do not create `src/`; use the current root project structure.
2. Do not add a new direct Prisma import. Add or extend a repository instead.
3. Do not remove a legacy allowlist entry until its caller uses a repository.
4. Do not add tenancy columns or Better Auth before Prompt 2 review.
5. Do not generalize USD/TRY formulas before the dedicated currency phase.
6. Do not expose retained private ERP routes in public or SaaS navigation.
7. Run lint, type checking, all tests, Prisma validation, Etsy guard, build,
   and both audits after each phase.

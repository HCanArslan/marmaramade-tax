# MarmaraLedge SaaS architecture boundaries

Status: Prompt 2 identity and tenancy foundation. These boundaries apply until
a later reviewed phase replaces them.

## Route boundaries

Next.js route groups separate layouts without changing public URLs:

- `app/(public)` owns `/`, `/pricing`, `/etsy-kar-hesaplama`, and `/blog`.
  These routes never load the private Ledger shell or private records.
- `app/(auth)` owns `/login`, `/signup`, `/forgot-password`, and
  `/reset-password`. Better Auth is the only production authentication system.
- `app/(saas)/app` owns the protected `/app/**` foundation. Its navigation is
  limited to Dashboard, Products, Orders, Profit, Pricing, Scenarios, Reports,
  Settings, Billing, and Help.
- Existing private Ledger routes remain protected and compiled behind the
  legacy `AppShell`. They are excluded from the SaaS navigation. The former
  private root dashboard is retained at `/ledger` because `/` is now public.

The root proxy performs an optimistic Better Auth cookie check. `/app/**`
performs definitive session, active-workspace, and membership checks. Retained
legacy routes additionally require the database-backed `FOUNDER` system role.
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

## Authentication and tenant context

- Better Auth 1.6.25 owns `User`, `Session`, `Account`, `Verification`, and
  `RateLimit`. Physical core table names follow its generated Prisma mapping.
- The MarmaraLedge domain owns `Workspace`, `Membership`, `UserPreference`,
  `LegalAcceptance`, and `LegacyWorkspaceAssignment`; Better Auth organizations
  are not used as tenants.
- `UserPreference.activeWorkspaceId` is trusted only after membership and
  active-workspace validation. A requested browser workspace ID is never used
  without the same validation.
- Users without memberships go to `/workspace/setup`; users with multiple
  memberships and no valid selection go to `/workspace/select`.
- Workspace roles are `OWNER` and `MEMBER`. Founder/private-Ledger access is a
  separate `SystemRole.FOUNDER`, never inferred from workspace ownership.
- `requireUser`, `requireWorkspaceContext`, `requireWorkspaceMembership`,
  `requireWorkspaceRole`, and the founder compatibility helper are server-only.

Email verification and reset records expire after one hour. Development can
enable an in-memory, non-logging capture with `AUTH_DEV_EMAIL_CAPTURE=true`.
Production capture is prohibited; a transactional email adapter remains a
deployment blocker until the later email phase.

The founder bootstrap is environment-driven and idempotent. Better Auth creates
and hashes the credential account, then one transaction creates or reuses the
founder workspace, OWNER membership, preference, and the
`MARMARAMADE_LEDGER` legacy assignment. Migration SQL contains no identity,
password, or password hash.

## Retained, transformed, and excluded surfaces

Retained unchanged:

- Prisma schema, migration history, models, and historical records;
- existing private ERP pages, actions, APIs, and integrations;
- historical login-attempt/security records, but not the old public NextAuth
  credentials handler;
- Etsy OAuth/webhook/read-only safeguards and GET-only marketplace client;
- financial engine modules and calculation parity fixtures.

Transformed reversibly:

- `/` changes from the private dashboard to the public shell;
- the private dashboard moves to `/ledger`;
- `/login`, signup, verification, reset, and logout use Better Auth;
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
4. Do not tenant-convert legacy domain tables until the reviewed Prompt 3
   migration; use the Prompt 2 workspace boundary for new code.
5. Do not replace protected USD/TRY formulas; extend currency support through
   the additive generic modules until a separately approved refactor.
6. Do not expose retained private ERP routes in public or SaaS navigation.
7. Run lint, type checking, all tests, Prisma validation, Etsy guard, build,
   and both audits after each phase.

## Prompt 3 tenancy and calculation-data boundary

Prompt 3 keeps the legacy ledger intact while adding the SaaS ownership layer:

- Existing retained commerce records receive nullable `workspaceId` columns.
  The `MARMARAMADE_LEDGER` assignment is the only accepted source for legacy
  ownership; no workspace identifier is embedded in migration SQL.
- `Shop` is the workspace-owned platform identity. Etsy imports use compound
  shop/external-ID uniqueness and internal relation IDs, while OAuth scopes and
  GET-only integration policy remain unchanged.
- New server access is limited to tenant-aware repositories under
  `lib/server/repositories/`. Every public repository read accepts trusted
  `WorkspaceContext`, validates membership, and filters by workspace/shop.
- `WorkspaceBusinessProfileVersion` and `WorkspaceCostDefaultVersion` are
  effective-dated planning inputs. `activeKey` is nullable for history and
  unique per parent when set to `ACTIVE`.
- `PortfolioScenarioVersion` is an immutable calculation input after its status
  becomes `CALCULATED`; recalculation creates a new version.
- Generic Decimal money, rate, and conversion modules are additive. Protected
  USD/TRY calculation modules and historical `...Usd` / `...Try` fields remain
  unchanged.

The Prompt 3 migration follows expand-and-contract ordering: nullable columns
and compound indexes are added, the stable-assignment backfill runs, collision
guards execute, and only then are obsolete global external-ID indexes removed.

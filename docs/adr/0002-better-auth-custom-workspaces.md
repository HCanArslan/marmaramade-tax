# ADR 0002: Better Auth with custom workspaces

## Context

The legacy application exposed one credentials-based administrator. MarmaraLedge
needs public accounts, database sessions, multiple workspaces per user, and a
founder-only transition path for retained private Ledger routes.

## Decision

Use Better Auth 1.6.25 with its Prisma adapter for identity, credentials, OAuth
accounts, verification, reset tokens, sessions, cookies, CSRF/origin checks,
and database rate limiting. Use MarmaraLedge-owned `Workspace`, `Membership`,
and `UserPreference` models instead of an authentication-provider organization
plugin. Keep `OWNER`/`MEMBER` tenant roles separate from `SystemRole.FOUNDER`.

Every protected SaaS request derives the user from the server session, resolves
the active workspace from trusted persistence, and validates an active
membership. Retained Ledger authorization uses the founder system role.

## Alternatives

- Retaining NextAuth credentials would leave a second production auth system
  and would not provide the required account/session schema.
- Better Auth organizations would couple product tenancy to the auth provider.
- Client-selected workspace IDs without server membership checks would violate
  the tenant-isolation invariant.

## Consequences

The application gains database-backed, revocable sessions and provider-neutral
tenancy. All new persistence goes through server repositories. Legacy domain
tables remain unscoped until Prompt 3 and remain founder-only in the meantime.
Production email delivery is not claimed in Prompt 2 and must be configured
before unrestricted signup.

## Reversal plan

The custom workspace tables and authorization services are provider-neutral.
A later auth provider can replace Better Auth while preserving users through an
explicit identity mapping and leaving workspace/membership IDs unchanged.
Rollback before production adoption means restoring the pre-phase code commit;
the additive tables can remain unused until a separately reviewed contraction.

# Vercel deployment

## 1. Create the managed database

Vercel no longer offers a first-party Vercel Postgres product for new projects. In the Vercel project, open **Storage / Marketplace**, choose a PostgreSQL provider, and connect it to the project.

The application needs:

- `DATABASE_URL`: the provider's pooled PostgreSQL URL for serverless runtime traffic.
- A direct URL for Prisma migrations. The Vercel Neon integration already creates `DATABASE_URL_UNPOOLED` and `POSTGRES_URL_NON_POOLING`, which the Prisma config detects automatically. For another provider, set `DIRECT_URL` as an explicit override.

Enable SSL through the provider URL. Never expose either variable with a `NEXT_PUBLIC_` prefix.

## 2. Configure Vercel environment variables

Add these to the **Production** environment in Vercel Project Settings:

- `DATABASE_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `AUTH_MAX_FAILED_ATTEMPTS=5`
- `AUTH_LOCKOUT_MINUTES=15`
- `AUTH_SESSION_MAX_AGE_HOURS=8`
- `BLOB_READ_WRITE_TOKEN` (from a private Vercel Blob store)
- `DOCUMENT_MAX_SIZE_MB=25`

When using Neon, leave its automatically managed database variables unchanged. Do not create a duplicate `DATABASE_URL` or copy a pooled URL into `DIRECT_URL`. For a non-Neon provider, add `DIRECT_URL` using that provider's direct connection string.

For a stable custom domain, also set `NEXTAUTH_URL=https://your-domain.example`. Otherwise, enable Vercel's automatically exposed system environment variables so NextAuth can detect the deployment URL.

If Etsy integration is enabled, add:

- `TOKEN_ENCRYPTION_KEY`
- `ETSY_API_KEYSTRING`
- `ETSY_SHARED_SECRET`
- `ETSY_REDIRECT_URI=https://your-domain.example/api/etsy/oauth/callback`
- `ETSY_SCOPES=shops_r listings_r transactions_r`
- `ETSY_RAW_PAYLOAD_RETENTION_DAYS=0`

`ETSY_WEBHOOK_SIGNING_SECRET` is optional until an Etsy webhook is registered. OAuth and manual synchronization do not use it; add it later before enabling webhook delivery.

Use a stable production domain for Etsy. Do not register changing preview URLs as the primary callback.

If ShipEntegra is enabled, add `SHIPENTEGRA_CLIENT_ID`, `SHIPENTEGRA_CLIENT_SECRET`, `SHIPENTEGRA_ENVIRONMENT=production`, `SHIPENTEGRA_OPERATION_MODE=ADMIN_CONFIRMED_SHIPMENT`, `SHIPENTEGRA_REQUEST_TIMEOUT_MS`, `SHIPENTEGRA_TRACKING_SYNC_ENABLED`, `SHIPENTEGRA_TRACKING_SYNC_HOURS`, and `CRON_SECRET`. Production requests remain server-only, and shipment creation remains fail-closed until ShipEntegra confirms the documented-response gaps listed in `SHIPENTEGRA_INTEGRATION.md`. The committed `vercel.json` schedules tracking once daily at 03:00 UTC so it remains compatible with Vercel Hobby; the route requires the cron bearer secret.

## 3. Apply the database migration

Before sending production traffic to a new database, use the provider credentials in a trusted terminal or protected CI release job and run:

```powershell
npm ci
npm run db:deploy
```

This applies only committed migrations. Do not use `prisma db push` or `prisma migrate reset` in production.

For a brand-new empty demo database only, you may run `npm run db:seed`. The seed replaces existing application data and is blocked on Vercel production unless `ALLOW_PRODUCTION_SEED=true` is explicitly present. Remove that variable immediately after the intentional first seed.

## 4. Deploy

Import the GitHub repository into Vercel. Vercel detects Next.js automatically. The repository pins the deployment runtime to the Node.js 22 major release.

The standard settings are sufficient:

- Install command: `npm install` or `npm ci`
- Build command: `npm run build`
- Output: detected automatically by Next.js

Prisma Client is generated during installation and again before the build. The build script runs `prisma migrate deploy` only when `VERCEL_ENV=production`; preview and local builds never migrate the production schema. This supports Vercel integrations whose database credentials are intentionally non-downloadable.

## 5. Post-deployment checks

1. Open `/api/health` and confirm a successful response.
2. Confirm `/` redirects an unauthenticated browser to `/login`.
3. Sign in with `ADMIN_EMAIL` and the password represented by `ADMIN_PASSWORD_HASH`.
4. Confirm HTTPS secure cookies and the security headers.
5. If Etsy is enabled, verify the exact callback, read-only scopes, and a listings-only sync.
6. Run `npm audit`, `npm test`, and `npm run guard:etsy-readonly` in CI for each release.

Preview deployments should use a separate preview database or branch when they execute database writes. Do not point untrusted pull-request previews at the production database.

## Compliance migration and rollback note

Apply `20260716110000_complete_ledger_compliance_goals` with `npm run db:deploy`. It is additive: existing required columns are unchanged and the new legal-profile link on orders is nullable for safe backfill. A rollback should first export the new compliance/document/goal metadata, stop application writes, remove the added foreign keys and tables in reverse dependency order, then remove the added columns and enums. Blob objects are not deleted by a database rollback; retain or remove them through the authenticated archive workflow.

Apply `20260716170000_sole_proprietorship_shipentegra_operations` only after a database backup. It is additive, adds the confirmed Hamit/Selda operational roles, and does not rewrite orders, Etsy data, OAuth tokens, snapshots, or documents.

# Vercel deployment

## 1. Create the managed database

Vercel no longer offers a first-party Vercel Postgres product for new projects. In the Vercel project, open **Storage / Marketplace**, choose a PostgreSQL provider, and connect it to the project.

The application needs:

- `DATABASE_URL`: the provider's pooled PostgreSQL URL for serverless runtime traffic.
- `DIRECT_URL`: the provider's direct PostgreSQL URL for Prisma migrations. If the provider supplies only one URL, it can be used for both, but a direct migration URL is preferred.

Enable SSL through the provider URL. Never expose either variable with a `NEXT_PUBLIC_` prefix.

## 2. Configure Vercel environment variables

Add these to the **Production** environment in Vercel Project Settings:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `AUTH_MAX_FAILED_ATTEMPTS=5`
- `AUTH_LOCKOUT_MINUTES=15`
- `AUTH_SESSION_MAX_AGE_HOURS=8`

For a stable custom domain, also set `NEXTAUTH_URL=https://your-domain.example`. Otherwise, enable Vercel's automatically exposed system environment variables so NextAuth can detect the deployment URL.

If Etsy integration is enabled, add:

- `TOKEN_ENCRYPTION_KEY`
- `ETSY_API_KEYSTRING`
- `ETSY_SHARED_SECRET`
- `ETSY_REDIRECT_URI=https://your-domain.example/api/etsy/oauth/callback`
- `ETSY_SCOPES=shops_r listings_r transactions_r`
- `ETSY_WEBHOOK_SIGNING_SECRET`
- `ETSY_RAW_PAYLOAD_RETENTION_DAYS=0`

Use a stable production domain for Etsy. Do not register changing preview URLs as the primary callback.

## 3. Apply the database migration

Before sending production traffic to a new database, use the provider credentials in a trusted terminal or protected CI release job and run:

```powershell
npm ci
npm run db:deploy
```

This applies only committed migrations. Do not use `prisma db push` or `prisma migrate reset` in production.

For a brand-new empty demo database only, you may run `npm run db:seed`. The seed replaces existing application data and is blocked on Vercel production unless `ALLOW_PRODUCTION_SEED=true` is explicitly present. Remove that variable immediately after the intentional first seed.

## 4. Deploy

Import the GitHub repository into Vercel. Vercel detects Next.js automatically. The repository declares Node.js `>=20.19.0`; Node.js 22 is a suitable Vercel runtime.

The standard settings are sufficient:

- Install command: `npm install` or `npm ci`
- Build command: `npm run build`
- Output: detected automatically by Next.js

Prisma Client is generated during installation and again before the build. Database migrations are deliberately not run inside every Vercel build, avoiding concurrent preview deployments modifying production schema.

## 5. Post-deployment checks

1. Open `/api/health` and confirm a successful response.
2. Confirm `/` redirects an unauthenticated browser to `/login`.
3. Sign in with `ADMIN_EMAIL` and the password represented by `ADMIN_PASSWORD_HASH`.
4. Confirm HTTPS secure cookies and the security headers.
5. If Etsy is enabled, verify the exact callback, read-only scopes, and a listings-only sync.
6. Run `npm audit`, `npm test`, and `npm run guard:etsy-readonly` in CI for each release.

Preview deployments should use a separate preview database or branch when they execute database writes. Do not point untrusted pull-request previews at the production database.

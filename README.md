# MarmaraMade Ledger

Private financial planning and Etsy record keeping for MarmaraMade. The application is built for Vercel and a managed PostgreSQL database.

## Current stack

- Next.js 16.2.10 and React 19.2.7
- NextAuth 4.24.14 (the current stable `next-auth` release)
- Prisma 7.8 with the PostgreSQL driver adapter
- Tailwind CSS 4.3
- Zod 4, Recharts 3, Vitest 4
- Node.js 20.19 or newer

Production packages are pinned, and patched transitive versions are enforced through npm `overrides`. `npm audit` currently reports zero vulnerabilities.

TypeScript 5.9 and ESLint 9 are intentionally used because they are the newest releases supported by the current Prisma/Next ESLint toolchain. TypeScript 7 and ESLint 10 are published, but the current TypeScript ESLint/React plugins cannot safely process them yet.

## Vercel deployment

You do not need PostgreSQL installed on your computer. You **do still need a PostgreSQL database**: Vercel hosts the application, while its Marketplace connects a managed database provider such as Neon or another PostgreSQL service.

Follow [the Vercel deployment guide](docs/VERCEL_DEPLOYMENT.md). In summary:

1. Push this private repository to GitHub and import it into Vercel.
2. Add a PostgreSQL integration from the Vercel Marketplace.
3. Add the required environment variables listed in `.env.example`.
4. Apply the committed schema with `npm run db:deploy` using the production database credentials.
5. Deploy with Vercel's normal `npm run build` command.

Do not put secrets in Git and do not commit `.env`. Vercel environment variables replace `.env` in production.

## Required production variables

```dotenv
DATABASE_URL="postgresql://...pooled runtime connection..."
DIRECT_URL="postgresql://...direct migration connection..."
AUTH_SECRET="a cryptographically random secret"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD_HASH="$2b$12$..."
```

`NEXTAUTH_URL` is optional on Vercel when system environment variables are exposed. If you use a stable custom domain, setting it explicitly to that HTTPS origin is recommended.

Generate the admin password hash locally:

```powershell
npm run auth:hash-password
```

Generate `AUTH_SECRET` with a password manager, `openssl rand -base64 32`, or:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Etsy variables are optional until Etsy integration is enabled. `ETSY_REDIRECT_URI` must then exactly match the stable production callback registered with Etsy.

## Database commands

```powershell
npm run db:deploy   # apply committed migrations; production-safe
npm run db:migrate  # create a migration after intentionally changing schema
npm run db:seed     # destructive demo seed; empty databases only
npm run db:studio
```

The seed deletes and replaces application records. On Vercel production it refuses to run unless `ALLOW_PRODUCTION_SEED=true` is set explicitly. Never leave that variable enabled.

## Development and verification

Point a private `.env` file at a development/preview PostgreSQL database, then run:

```powershell
npm install
npm run db:deploy
npm run dev
```

Quality and security checks:

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit
npm run guard:etsy-readonly
```

## Why the setup exists

- PostgreSQL stores products, cost versions, orders, immutable calculation snapshots, Etsy imports, and persistent login-lockout events.
- Prisma applies versioned SQL migrations and provides typed database access.
- `ADMIN_PASSWORD_HASH` stores a one-way bcrypt hash instead of a plaintext password.
- `AUTH_SECRET` encrypts and signs administrator sessions.
- `TOKEN_ENCRYPTION_KEY` encrypts Etsy OAuth tokens at rest.
- `.env.example` documents variable names safely; `.env` contains private values and is ignored by Git.

See [SECURITY.md](SECURITY.md) and [ETSY_INTEGRATION.md](ETSY_INTEGRATION.md) for the security model and read-only Etsy boundary.

## Disclaimer

This application is for financial planning and record keeping. It does not provide legal, tax, customs, or accounting advice.

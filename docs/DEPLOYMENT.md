# Deployment

Use `npm ci`, `npm run db:deploy`, and `npm run build`. Production must use a pooled runtime database URL and direct migration URL, private Blob credentials, server-only Etsy/ShipEntegra credentials, admin authentication secrets, and a cron secret. Never use Prisma reset or `db push` in production. See `VERCEL_DEPLOYMENT.md` for the complete checklist.

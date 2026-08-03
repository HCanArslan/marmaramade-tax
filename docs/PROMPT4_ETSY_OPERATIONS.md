# Prompt 4 Etsy operations

The application keeps Etsy marketplace access read-only. The only allowed Etsy POST is OAuth token exchange/refresh at the pinned public token endpoint. All resource calls use GET with `x-api-key` and OAuth Bearer headers.

## Production callback

Register this exact, case-sensitive HTTPS callback in the existing Etsy application:

`https://marmaramade-tax.vercel.app/api/etsy/oauth/callback`

Set `ETSY_REDIRECT_URI` to the same exact value. Production validation fails if it differs, including by a trailing slash.

## Activate background delivery

The code is safe to deploy without Inngest credentials: user and webhook requests return an explicit unavailable result and no run is reported as queued. To activate delivery:

1. Create or select the production environment in Inngest.
2. Install the official Inngest integration on the existing Vercel project `marmaramade-tax`, or add its production event/signing keys without printing them.
3. Confirm Vercel production contains `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. Use `INNGEST_SIGNING_KEY_FALLBACK` only during an intentional key rotation.
4. Optionally set `INNGEST_SERVE_ORIGIN=https://marmaramade-tax.vercel.app`.
5. Redeploy and sync `https://marmaramade-tax.vercel.app/api/inngest` in Inngest.
6. Confirm the `etsy-workspace-sync` and `etsy-scheduled-incremental-sync` functions are registered before using **Sync now**.

Inngest invokes the signed route; there is no public cron route. Sync events contain only internal shop and sync-run identifiers. Per-shop concurrency is one.

## Activate Etsy webhooks

1. In the existing Etsy application’s Webhook Portal, configure `https://marmaramade-tax.vercel.app/api/etsy/webhook`.
2. Store its `whsec_...` signing secret as the Vercel production variable `ETSY_WEBHOOK_SIGNING_SECRET`.
3. Subscribe only to supported order events: `order.paid`, `order.canceled`, `order.shipped`, and `order.delivered`.
4. Redeploy, then use Etsy’s portal test delivery and verify a deduplicated `EtsyWebhookEvent` plus a queued follow-up run.

The endpoint validates the raw-body signature and timestamp before parsing, resolves Etsy’s external shop ID server-side, stores no raw payload, and rejects unknown or ambiguous shops.

## Recovery states

- `REAUTH_REQUIRED`: reconnect the affected shop; historical imports remain.
- `SCOPE_VIOLATION`: remove any unapproved scope and reconnect. Only `shops_r listings_r transactions_r` is accepted.
- `ERROR` or `TOKEN_EXPIRED`: inspect the sanitized latest sync error, then retry or reconnect.
- `BACKGROUND_NOT_CONFIGURED`: complete the Inngest steps above; failed delivery is never shown as queued.

Never rotate `TOKEN_ENCRYPTION_KEY` casually. Existing production ciphertext uses the compatible `v1` AES-256-GCM envelope and is preserved by the migration.

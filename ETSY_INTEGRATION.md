# Etsy read-only integration

## Scope contract

The only allowed OAuth scopes are:

```text
shops_r listings_r transactions_r
```

`assertReadOnlyEtsyScopes()` rejects unknown scopes and every scope ending in `_w`. `shops_w`, `listings_w`, `transactions_w`, listing deletion and all other mutation privileges are unsupported. A detected violation changes the connection to `SCOPE_VIOLATION` and disables synchronization.

## Transport boundary

`lib/etsy/client.ts` exposes only `etsyGet()`. It fixes the method to GET, restricts origins to Etsy's API hosts, sets Bearer and `x-api-key` headers server-side, disables caching, and never reaches a client bundle.

The sole outbound Etsy POST exception is `https://api.etsy.com/v3/public/oauth/token` in `lib/etsy/token.ts`, used only for documented authorization-code exchange and refresh grants. Webhook POST is inbound from Etsy and signature-verified; it is not an Etsy marketplace mutation.

Automated tests and `scripts/assert-etsy-readonly.ts` fail when a marketplace POST, PUT, PATCH, DELETE or generic `etsyRequest(method)` is introduced.

## Endpoint inventory

All paths are Open API v3 read operations:

| Resource | GET purpose | Scope |
|---|---|---|
| `/users/{user_id}/shops` | Find the authorized seller's shop after OAuth | `shops_r` |
| `/shops/{shop_id}` | Shop name, title, currency, URL and metrics | `shops_r` |
| `/shops/{shop_id}/listings` | Active listings with offset pagination | `listings_r` |
| `/listings/{listing_id}/images` | Listing images | `listings_r` |
| `/listings/{listing_id}/inventory` | SKU, inventory and variations | `listings_r` |
| `/shops/{shop_id}/receipts` | Shop receipts/orders | `transactions_r` |
| `/shops/{shop_id}/receipts/{receipt_id}/transactions` | Receipt items | `transactions_r` |
| `/shops/{shop_id}/payments` | Known payment records | `transactions_r` |
| `/shops/{shop_id}/payment-account/ledger-entries` | Seller payment-account ledger | `transactions_r` |
| `/shops/{shop_id}/payment-account/ledger-entries/payments` | Payments related to ledger entries | `transactions_r` |

Endpoint availability and response fields depend on Etsy application approval and shop data. The integration validates important normalized fields with Zod and retains sync errors instead of guessing missing values.

## OAuth and token lifecycle

1. Authenticated admin requests connection.
2. Server generates 32-byte random state and 48-byte PKCE verifier.
3. S256 challenge goes to Etsy; encrypted verifier/state hash remain in PostgreSQL for ten minutes.
4. Callback requires the admin session, exact state, unused/unexpired database row, and authorization code.
5. State is atomically consumed before exchange, preventing replay.
6. Access and refresh tokens are encrypted with AES-256-GCM before persistence.
7. Access tokens refresh five minutes before expiry. Refresh tokens never reach the browser.

Changing scopes requires reconnecting. Tokens are never displayed in settings, logs, errors or audit metadata.

## Normalized model mapping

- `EtsyConnection`: shop identity, encrypted tokens, approved scopes and health timestamps.
- `EtsyListing`/`EtsyListingImage`: external listing state and source timestamps/hash. Never overwrites Product.
- `EtsyListingProductLink`: explicit listing-to-local-product link with SKU-conflict flag.
- `EtsyReceipt`/`EtsyReceiptItem`: minimal order/destination and monetary data; no buyer contact/full address.
- `EtsyPayment`: payment, fees and net values.
- `EtsyLedgerEntry`: original type/description plus confidence-scored category and manual review.
- `EtsySyncRun`/`EtsySyncError`: resumable status, counts, partial failure and rate-limit context.
- `EtsyWebhookEvent`: verified event metadata, timestamp, resource URL and payload hash—not raw customer payload.
- `EtsyImportMapping`: reviewed mapping decisions without rewriting fee history.

Every external object has a unique Etsy ID, source timestamp/hash, first/last import times and last-change time. Upserts are idempotent by Etsy ID.

## Sync and reconciliation

Initial full, incremental and resource-specific syncs use offset pagination. 429 and 5xx errors are retried with `Retry-After` or capped exponential backoff; permanent errors stop the resource and produce a partial run.

Unknown ledger descriptions are retained with `OTHER`, zero confidence and manual review. Expected-versus-actual fee comparisons never mutate a FeeProfile. Approved changes create a new effective-dated profile.

Imported receipts remain external. Only explicit admin confirmation—after product links and all local cost/quote/profile selections—creates an Order and immutable snapshot. A later Etsy source-hash change sets `needsReconciliation`; it cannot overwrite the snapshot.

## Webhooks

Supported notifications: `order.paid`, `order.canceled`, `order.shipped`, `order.delivered`. Verification uses the exact raw body and:

```text
signed_content = webhook-id + "." + webhook-timestamp + "." + raw_body
signature = base64(HMAC-SHA256(base64decode(secret without whsec_), signed_content))
```

Timestamps outside five minutes and duplicate `webhook-id` values are rejected/treated idempotently. The event can trigger only a follow-up GET sync.

## Unsupported operations

The application cannot create/edit/renew/deactivate listings, change inventory/prices/shop data, fulfill/ship/cancel/refund orders, add tracking, message buyers, manage webhooks through Etsy, or perform any Etsy mutation. Those workflows remain in Etsy's own UI.

## Known API limitations

- Etsy developer-key approval and access level may limit resources.
- Some payment/ledger descriptions do not map cleanly to MarmaraMade categories.
- Inventory/images may require extra GET calls and may be absent for older listings.
- Etsy source changes do not imply an accounting correction; reconciliation is deliberate.
- Webhook delivery can be delayed/retried, so manual sync remains supported.

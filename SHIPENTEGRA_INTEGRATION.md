# ShipEntegra integration

Audited against the [official ShipEntegra API reference](https://docs.shipentegra.com/) and the supplied OpenAPI 3.1 specification, version 4.0.4, on 16 July 2026.

## Authentication and environments

`POST /auth/token` accepts `clientId` and `clientSecret` and returns bearer access and refresh tokens. Tokens and credentials remain in server-only modules. MarmaraMade is configured only for the official production server, `https://publicapi.shipentegra.com/v1`. Required integration variables are documented in `.env.example`; there is no browser-visible secret.

## Endpoint inventory

| Method and path | Classification | Application status |
|---|---|---|
| `POST /auth/token` | READ_ONLY | Implemented |
| `POST /tools/calculate` | QUOTE | Documented; not used by multi-service UI |
| `POST /tools/calculate/all` | QUOTE | Implemented and persisted |
| tariff calculator endpoints | QUOTE | Documented; not enabled |
| `POST /orders` | SHIPMENT_MUTATION | Guarded but fail-closed: success response is undocumented |
| `POST /orders/manual` | UNSUPPORTED | Deprecated as of 1 March 2026 |
| `GET /orders/manual` and `GET /orders/manual/{id}` | READ_ONLY | Implemented client operations |
| order update, hold, unhold, and post endpoints | SHIPMENT_MUTATION | Not enabled |
| label endpoints under `/logistics/labels/*` | DOCUMENT | Main response mapped; carrier-specific mutations not enabled |
| `POST /logistics/files` | DOCUMENT | Not enabled |
| `GET /logistics/files/{orderId}` | DOCUMENT | Implemented metadata retrieval |
| `DELETE /logistics/files/{id}` | UNSUPPORTED | Destructive; not enabled |
| `GET /logistics/shipments/activities` | TRACKING | Implemented with idempotent events |
| currencies, carriers, and stores | READ_ONLY | Implemented client operations |
| `PATCH /orders/etgb` | SHIPMENT_MUTATION | Documented; not enabled |

The full machine-readable classification is in `lib/shipentegra/endpoints.ts`.

## Quote workflow and DDP handling

The administrator enters destination, dimensions, and actual weight. Decimal arithmetic computes `kgDesi` as the larger of actual weight and volume divided by 5000. `/tools/calculate/all` returns services and price components. Each response is hashed and saved with assumptions, time, expiry, fuel, additional fees, and `incoterm=UNKNOWN`. Postal codes are retained only in partial form. Monthly goals use saved snapshots, not live calls.

The price response does not expose delivery estimates or incoterms. The application never infers DDP from a name. US shipments with unknown or non-DDP treatment require a warning and separate local-customs planning.

## Confirmation, idempotency, and current limitation

The server requires an authenticated administrator, `ADMIN_CONFIRMED_SHIPMENT` mode, a confirmed local Etsy-linked order, items, an effective legal profile, a short-lived one-time token, and an unchanged preview hash. Unique order and external-reference constraints plus a pending operation record prevent duplicates.

Remote creation is disabled because v4.0.4 documents the `POST /orders` request but no success-response schema. Guessing its result would make safe linking and reconciliation impossible. Enable it only after ShipEntegra confirms the contract and matching mocked tests are added.

Use the ready-to-send Turkish checklist in [`docs/SHIPENTEGRA_SUPPORT_REQUEST.md`](docs/SHIPENTEGRA_SUPPORT_REQUEST.md) to obtain the missing production, idempotency, IOSS, label, charging, tracking, and document details in writing. Never send the client secret in a support ticket.

## Tracking, documents, and actual costs

Tracking uses `/logistics/shipments/activities` manually or through the six-hour Vercel Cron. Event IDs hash tracking number, date, and text. Requests have timeouts and rate-limit errors are actionable.

Document types exposed by `/logistics/files` are E-Archive, MSDS, TSCA, FDA, and Other. ETGB download is not documented, so ETGB remains a manual private upload. Label/invoice URLs are accepted only from `files.shipentegra.com` and stored privately with checksums. Actual shipping is an adjustment with an explicit source; it never overwrites the planning quote or immutable order snapshot.

Manual quote, shipment ID, tracking number, actual cost, and document entry remain available. The specification does not establish quote expiry, delivery estimates, quote incoterms, final-charge retrieval, ETGB retrieval, webhooks, idempotency headers, or polling limits; these capabilities are not inferred.

Test locally with mocked responses only: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run db:validate`, `npm run guard:etsy-readonly`, and `npm run build`.

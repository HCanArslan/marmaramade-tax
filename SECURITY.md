# Security policy

## Reporting

Do not open a public issue containing a credential, token, customer record, database dump, or exploit detail. Report suspected vulnerabilities privately to the repository owner with the affected version, impact, safe reproduction steps, and whether any secret may have been exposed. Do not include live secrets in the report.

## Secret-handling rules

- Commit `.env.example` placeholders only; never commit `.env`, Vercel exports, database dumps, OAuth tokens or password hashes from a real deployment.
- Keep `AUTH_SECRET`, `ADMIN_PASSWORD_HASH`, `TOKEN_ENCRYPTION_KEY`, Etsy secrets, webhook secrets and database URLs server-side.
- Never log submitted passwords, authorization headers, OAuth tokens, buyer contact details or full addresses.
- Use a private GitHub repository and least-privilege access to Vercel/PostgreSQL.
- Keep Etsy scopes limited to `shops_r listings_r transactions_r`.
- Run tests, `guard:etsy-readonly`, lint, type checking, build, and a secret scan before release.

## Rotation procedures

### Admin password

1. Run `npm run auth:hash-password` locally.
2. Replace `ADMIN_PASSWORD_HASH` in Vercel without storing the plaintext.
3. Rotate `AUTH_SECRET` to invalidate all current sessions.
4. Redeploy and verify login/lockout events.

### Auth secret

Generate 32+ random bytes, update `AUTH_SECRET`, redeploy, and expect all sessions to end.

### Etsy token revocation

Disconnect the integration in the app, revoke the grant from Etsy's connected-app settings, rotate the Etsy shared secret if compromise is possible, then reconnect. A token-encryption-key compromise requires revocation/reconnection of every stored Etsy token.

### Token-encryption key

Planned rotation requires decrypting with the old key and re-encrypting in a controlled maintenance transaction. If the old key is lost, stored tokens cannot be recovered; revoke and reconnect Etsy. Never merely replace the key while old ciphertext remains.

### Database credentials

Create a new least-privilege PostgreSQL credential, update `DATABASE_URL` and `DIRECT_URL`, deploy/test, terminate old sessions, then revoke the old credential. Review database and Vercel audit logs.

### Webhook secret

Create/rotate the endpoint secret in Etsy's webhook portal, update `ETSY_WEBHOOK_SIGNING_SECRET`, deploy, send a signed test event, then disable the prior endpoint/secret.

## Incident response

1. Contain: disable Etsy sync/webhooks and restrict deployment/database access.
2. Preserve privacy-safe logs and timestamps; do not copy customer data into tickets.
3. Rotate affected database, Auth, Etsy and webhook credentials.
4. Revoke Etsy OAuth grants if token exposure is possible.
5. Inspect login attempts, security events, webhook IDs, sync runs and audit logs.
6. Validate immutable snapshots against backups; never “repair” them by overwriting history.
7. Patch, run the complete security/profitability suite, deploy, and verify read-only scopes.
8. Document scope, impact, remediation and follow-up without publishing secrets.

## Known limitations

- Single-admin JWT sessions cannot selectively revoke one device without rotating `AUTH_SECRET`; the security page provides sign-out and rotation guidance.
- Persistent lockout uses application/database records, not a distributed edge firewall. Add Vercel/WAF limits for defense in depth.
- Webhooks are optional notifications and do not replace reconciliation/manual sync.
- Etsy API availability, approval and field coverage are controlled by Etsy.

import { describe, expect, it, vi } from "vitest";
import { hash, compare } from "bcryptjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decideLogin, normalizeEmail, privacyHash } from "@/lib/auth/security";
import { ALLOWED_ETSY_SCOPES, assertReadOnlyEtsyScopes } from "@/lib/etsy/scopes";
import { etsyGet } from "@/lib/etsy/client";
import { createOAuthState, createPkcePair, safeStateEqual } from "@/lib/etsy/pkce";
import { decryptToken, encryptToken } from "@/lib/etsy/encryption";
import { refreshAccessToken } from "@/lib/etsy/token";
import { assertUsableOAuthState, tokenNeedsRefresh } from "@/lib/etsy/auth";
import { collectOffsetPages } from "@/lib/etsy/pagination";
import { withEtsyRetry } from "@/lib/etsy/rate-limit";
import { EtsyApiError } from "@/lib/etsy/errors";
import { mapLedgerEntry } from "@/lib/etsy/mappers";
import { reconcileFee } from "@/lib/etsy/reconciliation";
import { redactSensitive } from "@/lib/etsy/redaction";
import { validateWebhookEvent, verifyEtsyWebhook } from "@/lib/etsy/webhook";
import { ETSY_LISTING_STATES, EtsyEndpoints } from "@/lib/etsy/endpoints";
import { createHmac, randomBytes } from "node:crypto";

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), "utf8");

describe("single-admin security", () => {
  it("accepts a valid admin login decision", () => expect(decideLogin({ recentFailures: 0, maximumFailures: 5, emailMatches: true, passwordMatches: true })).toEqual({ allowed: true, reason: "SUCCESS" }));
  it("rejects invalid credentials generically", () => expect(decideLogin({ recentFailures: 0, maximumFailures: 5, emailMatches: true, passwordMatches: false })).toEqual({ allowed: false, reason: "INVALID_CREDENTIALS" }));
  it("verifies a strong password hash", async () => { const digest = await hash("a-long-admin-password", 4); expect(await compare("a-long-admin-password", digest)).toBe(true); expect(digest).not.toContain("a-long-admin-password"); });
  it("normalizes admin email", () => expect(normalizeEmail(" Admin@Example.COM ")).toBe("admin@example.com"));
  it("hashes rate-limit identifiers without retaining plaintext", () => expect(privacyHash("admin@example.com", "secret")).not.toContain("admin@example.com"));
  it("locks out at the configured failure threshold", () => expect(decideLogin({ recentFailures: 5, maximumFailures: 5, emailMatches: true, passwordMatches: true })).toEqual({ allowed: false, reason: "LOCKED" }));
  it("does not lock out below the threshold", () => expect(decideLogin({ recentFailures: 4, maximumFailures: 5, emailMatches: true, passwordMatches: true }).reason).toBe("SUCCESS"));
  it("protects every financial page server-side", async () => { const files = ["app/page.tsx","app/products/page.tsx","app/calculator/page.tsx","app/orders/page.tsx","app/shipping/page.tsx","app/customs/page.tsx","app/fees/page.tsx","app/business/page.tsx","app/reports/page.tsx","app/settings/page.tsx","app/etsy-import/page.tsx","app/etsy-import/receipts/[id]/page.tsx","app/reconciliation/page.tsx","app/settings/security/page.tsx","app/settings/etsy/page.tsx"]; for (const file of files) expect(await source(file), file).toContain("requireAdmin("); });
  it("protects the sensitive Etsy sync API", async () => expect(await source("app/api/etsy/sync/route.ts")).toContain("requireAdminApi()"));
  it("protects all sensitive Server Actions", async () => { for (const file of ["app/actions/etsy.ts","app/actions/listings.ts","app/actions/import-receipt.ts"]) expect(await source(file), file).toContain("requireAdmin("); });
  it("contains no plaintext admin password in tracked configuration", async () => { const env = await source(".env.example"); expect(env).toContain("ADMIN_PASSWORD_HASH="); expect(env).not.toMatch(/ADMIN_PASSWORD=(?!_HASH)/); });
});

describe("read-only Etsy boundary", () => {
  it("accepts only the three read scopes", () => expect(() => assertReadOnlyEtsyScopes(ALLOWED_ETSY_SCOPES)).not.toThrow());
  it.each(["shops_w","listings_w","transactions_w","anything_w"])("rejects write scope %s", (scope) => expect(() => assertReadOnlyEtsyScopes([scope])).toThrow());
  it("rejects unknown scopes", () => expect(() => assertReadOnlyEtsyScopes(["profile_r"])).toThrow());
  it("uses GET for marketplace requests", async () => { const fetcher = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => { void url; void init; return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }); }); await etsyGet("shops/1", { accessToken: "token", apiKeyString: "key", sharedSecret: "secret", fetcher: fetcher as typeof fetch }); expect(fetcher.mock.calls[0][1]?.method).toBe("GET"); });
  it("does not expose a generic marketplace method", async () => expect(await source("lib/etsy/client.ts")).not.toContain("etsyRequest"));
  it("contains no marketplace mutation method", async () => { for (const file of ["lib/etsy/client.ts","lib/etsy/endpoints.ts","lib/etsy/sync.ts"]) expect(await source(file), file).not.toMatch(/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i); });
  it("isolates OAuth token POST to the token module", async () => { expect(await source("lib/etsy/token.ts")).toContain('method: "POST"'); expect(await source("lib/etsy/client.ts")).not.toContain('method: "POST"'); });
});

describe("OAuth, tokens and synchronization", () => {
  it("generates strong PKCE verifier and S256 challenge", () => { const pair = createPkcePair(); expect(pair.verifier.length).toBeGreaterThanOrEqual(43); expect(pair.challenge).not.toBe(pair.verifier); });
  it("generates unique OAuth states", () => expect(createOAuthState()).not.toBe(createOAuthState()));
  it("compares returned OAuth state safely", () => { const state = createOAuthState(); expect(safeStateEqual(state, state)).toBe(true); expect(safeStateEqual(state, createOAuthState())).toBe(false); });
  it("rejects an expired OAuth state", () => expect(() => assertUsableOAuthState({ consumedAt: null, expiresAt: new Date(0) })).toThrow());
  it("rejects OAuth callback replay", () => expect(() => assertUsableOAuthState({ consumedAt: new Date(), expiresAt: new Date(Date.now() + 10000) })).toThrow());
  it("encrypts and decrypts tokens with AES-GCM", () => { const key = randomBytes(32).toString("base64"); const encrypted = encryptToken("etsy-secret-token", key); expect(encrypted).not.toContain("etsy-secret-token"); expect(decryptToken(encrypted, key)).toBe("etsy-secret-token"); });
  it("rejects token tampering", () => { const key = randomBytes(32).toString("base64"); const encrypted = encryptToken("token", key); expect(() => decryptToken(`${encrypted}x`, key)).toThrow(); });
  it("refreshes through the OAuth-only token endpoint", async () => { const fetcher = vi.fn(async () => new Response(JSON.stringify({ access_token:"1.access",refresh_token:"1.refresh",expires_in:3600,token_type:"Bearer" }), { status: 200 })); const result = await refreshAccessToken({ clientId:"key",refreshToken:"old" }, fetcher as typeof fetch); expect(result.access_token).toBe("1.access"); expect(fetcher).toHaveBeenCalledOnce(); });
  it("recognizes expired and near-expiry tokens", () => { expect(tokenNeedsRefresh(new Date(Date.now() - 1))).toBe(true); expect(tokenNeedsRefresh(new Date(Date.now() + 60 * 60_000))).toBe(false); });
  it("paginates listings without duplicates", async () => { const result = await collectOffsetPages(async (offset, limit) => ({ count: 3, results: [0,1,2].slice(offset, offset + limit) }), { limit: 2 }); expect(result.results).toEqual([0,1,2]); });
  it("covers every Etsy seller listing state", () => { expect(ETSY_LISTING_STATES).toEqual(["active", "inactive", "sold_out", "draft", "expired"]); for (const state of ETSY_LISTING_STATES) expect(EtsyEndpoints.listings("1", state, 0)).toContain(`state=${state}`); });
  it("renders products from synchronized Etsy records", async () => { const page = await source("app/products/page.tsx"); expect(page).toContain("prisma.etsyListing.findMany"); expect(page).toContain("Sync Etsy listings"); });
  it("includes Etsy's required ledger date range", () => { const endpoint = EtsyEndpoints.ledger("1", 946684800, 1800000000, 0); expect(endpoint).toContain("min_created=946684800"); expect(endpoint).toContain("max_created=1800000000"); });
  it("creates local product shells without overwriting existing links", async () => { const sync = await source("lib/etsy/sync.ts"); expect(sync).toContain("ensureLocalProductLink"); expect(sync).toContain("if (existingLink) return"); expect(sync).toContain("prisma.product.upsert"); });
  it("paginates receipts using the same bounded helper", async () => { const result = await collectOffsetPages(async (offset) => ({ count: 2, results: offset === 0 ? ["a","b"] : [] })); expect(result.results).toEqual(["a","b"]); });
  it("recovers from a transient partial request", async () => { let attempts = 0; const result = await withEtsyRetry(async () => { attempts += 1; if (attempts === 1) throw new EtsyApiError(429, 0, "limited"); return "ok"; }, { sleep: async () => undefined }); expect(result).toBe("ok"); expect(attempts).toBe(2); });
  it("does not retry permanent validation errors", async () => { let attempts = 0; await expect(withEtsyRetry(async () => { attempts += 1; throw new Error("invalid"); }, { sleep: async () => undefined })).rejects.toThrow("invalid"); expect(attempts).toBe(1); });
  it("retains unknown ledger entries for manual review", () => expect(mapLedgerEntry("mystery", "unmapped debit")).toEqual({ category: "OTHER", confidence: 0, manualReview: true }));
  it("maps Etsy payment-processing fees", () => expect(mapLedgerEntry("fee", "Payment processing fee").category).toBe("PAYMENT_PROCESSING"));
  it("keeps imported receipts external until confirmation", async () => expect(await source("lib/etsy/sync.ts")).not.toContain("order.create"));
  it("uses unique Etsy IDs for idempotent imports", async () => { const schema = await source("prisma/schema.prisma"); for (const field of ["etsyListingId","etsyReceiptId","etsyPaymentId","etsyLedgerEntryId","webhookId"]) expect(schema).toMatch(new RegExp(`${field}\\s+String\\s+@unique`)); });
  it("marks changed confirmed receipts for reconciliation", async () => expect(await source("lib/etsy/sync.ts")).toContain("needsReconciliation"));
});

describe("reconciliation, webhooks and privacy", () => {
  it("calculates fee reconciliation differences", () => { const result = reconcileFee("10", "10.5"); expect(result.difference.toString()).toBe("0.5"); expect(result.differencePercentage?.toString()).toBe("5"); });
  it("verifies an official-format webhook signature", () => { const key = randomBytes(32); const secret = `whsec_${key.toString("base64")}`; const rawBody = JSON.stringify({ event_type:"order.paid",resource_url:"https://api.etsy.com/v3/application/shops/1/receipts/2",shop_id:1 }); const timestamp = String(Math.floor(Date.now()/1000)); const webhookId = "evt_1"; const signatureHeader = createHmac("sha256", key).update(`${webhookId}.${timestamp}.${rawBody}`).digest("base64"); expect(verifyEtsyWebhook({ rawBody, webhookId, timestamp, signatureHeader, secret })).toBe(true); });
  it("rejects stale webhook replay", () => { const key = randomBytes(32); expect(verifyEtsyWebhook({ rawBody:"{}",webhookId:"1",timestamp:"1",signatureHeader:"x",secret:`whsec_${key.toString("base64")}`,nowSeconds:1000 })).toBe(false); });
  it("rejects invalid webhook events", () => expect(() => validateWebhookEvent({ event_type:"listing.updated",resource_url:"https://evil.example",shop_id:1 })).toThrow());
  it("redacts customer and token data from logs", () => expect(redactSensitive({ email:"buyer@example.com",address:"secret",accessToken:"token",safe:"ok" })).toEqual({ email:"[REDACTED]",address:"[REDACTED]",accessToken:"[REDACTED]",safe:"ok" }));
  it("uses PostgreSQL in Prisma", async () => expect(await source("prisma/schema.prisma")).toMatch(/provider\s+=\s+"postgresql"/));
  it("keeps immutable snapshots free of updatedAt", async () => { const schema = await source("prisma/schema.prisma"); const block = schema.match(/model OrderCostSnapshot \{([\s\S]*?)\n\}/)?.[1] || ""; expect(block).not.toContain("@updatedAt"); });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { collectOffsetPages, EtsyPaginationError } from "@/lib/etsy/pagination";
import { assertSameReadOnlyScopes, normalizeEtsyScopes } from "@/lib/etsy/scopes";
import { assertExactOAuthCallback, normalizeSafeRedirectPath } from "@/lib/etsy/oauth-security";
import { etsyBackoffMs, readEtsyRateLimitHeaders, withEtsyRetry } from "@/lib/etsy/rate-limit";
import { EtsyApiError } from "@/lib/etsy/errors";
import { EtsyOAuthTokenError, refreshAccessToken } from "@/lib/etsy/token";
import { isStableEtsyJobPayload } from "@/lib/etsy/jobs";
import { validateEtsyReadOnlyBoundary } from "@/scripts/assert-etsy-readonly";

const source = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

describe("Prompt 4 OAuth and job boundaries", () => {
  it("accepts only same-origin relative post-OAuth destinations", () => {
    expect(normalizeSafeRedirectPath("/app/settings/etsy?connected=1")).toBe("/app/settings/etsy?connected=1");
    for (const value of ["https://evil.example", "//evil.example", "\\evil.example", "javascript:alert(1)"])
      expect(normalizeSafeRedirectPath(value)).toBe("/app/settings/etsy");
  });

  it("requires exact callback binding", () => {
    expect(() => assertExactOAuthCallback("https://example.test/callback", "https://example.test/callback")).not.toThrow();
    expect(() => assertExactOAuthCallback("https://example.test/callback/", "https://example.test/callback")).toThrow();
  });

  it("normalizes scopes and rejects missing, unknown, or write grants", () => {
    expect(normalizeEtsyScopes("transactions_r shops_r listings_r")).toEqual(["listings_r", "shops_r", "transactions_r"]);
    expect(() => assertSameReadOnlyScopes("shops_r listings_r transactions_r", "shops_r listings_r")).toThrow();
    expect(() => assertSameReadOnlyScopes("shops_r", "shops_w")).toThrow();
    expect(() => assertSameReadOnlyScopes("shops_r", "profile_r")).toThrow();
  });

  it("allows only stable identifier fields in background payloads", () => {
    expect(isStableEtsyJobPayload({ shopId: "shop", syncRunId: "run" })).toBe(true);
    expect(isStableEtsyJobPayload({ shopId: "shop", syncRunId: "run", accessToken: "secret" })).toBe(false);
  });

  it("binds persisted OAuth state to user, workspace, scopes, intent, and redirect", async () => {
    const repository = await source("lib/server/repositories/etsy-repository.ts");
    for (const field of ["userId", "workspaceId", "requestedScopes", "redirectPath", "intent", "consumedAt", "expiresAt"])
      expect(repository).toContain(field);
    expect(repository).toContain("workspaceId_userId");
    expect(repository).toContain('status !== "ACTIVE"');
  });
});

describe("Prompt 4 pagination and quota behavior", () => {
  it("detects a repeated non-empty page", async () => {
    await expect(collectOffsetPages(async () => ({ count: 3, results: [1] }), { limit: 1 })).rejects.toMatchObject({ code: "REPEATED_PAGE" } satisfies Partial<EtsyPaginationError>);
  });

  it("bounds traversal and rejects malformed oversized pages", async () => {
    await expect(collectOffsetPages(async (offset) => ({ count: 100, results: [offset] }), { limit: 1, maxPages: 2 })).rejects.toMatchObject({ code: "MAX_PAGES" });
    await expect(collectOffsetPages(async () => ({ count: 2, results: [1, 2] }), { limit: 1 })).rejects.toMatchObject({ code: "MALFORMED_PAGE" });
  });

  it("persists progress callbacks without duplicating overlap results", async () => {
    const checkpoints: number[] = [];
    const result = await collectOffsetPages(async (offset) => ({ count: 3, results: ["a", "b", "c"].slice(offset, offset + 2) }), { limit: 2, onPage: ({ nextOffset }) => { checkpoints.push(nextOffset); } });
    expect(result.results).toEqual(["a", "b", "c"]);
    expect(checkpoints).toEqual([2, 3]);
  });

  it("captures QPS, rolling daily quota, and Retry-After headers", () => {
    const state = readEtsyRateLimitHeaders(new Headers({ "x-limit-per-second": "10", "x-remaining-this-secon": "0", "x-limit-per-day": "1000", "x-remaining-today": "12", "retry-after": "7" }));
    expect(state).toMatchObject({ qpsLimit: 10, qpsRemaining: 0, dailyLimit: 1000, dailyRemaining: 12, retryAfterSeconds: 7 });
  });

  it("honors Retry-After and bounds jittered exponential backoff", () => {
    expect(etsyBackoffMs(0, 9, () => 0)).toBe(9000);
    expect(etsyBackoffMs(20, null, () => 0)).toBe(22500);
  });

  it("retries 429 but not authorization failures", async () => {
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;
    await withEtsyRetry(async () => { attempts += 1; if (attempts === 1) throw new EtsyApiError(429, 0, "limited"); return true; }, { sleep, random: () => 0 });
    expect(attempts).toBe(2);
    await expect(withEtsyRetry(async () => { throw new EtsyApiError(401, null, "unauthorized"); }, { sleep })).rejects.toMatchObject({ status: 401 });
  });
});

describe("Prompt 4 token, webhook, and read-only regression contracts", () => {
  it("classifies invalid grants without retaining provider detail", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant", error_description: "token secret" }), { status: 400 }));
    let failure: EtsyOAuthTokenError;
    try {
      await refreshAccessToken({ clientId: "key", refreshToken: "secret" }, fetcher as typeof fetch);
      throw new Error("Expected refresh failure.");
    } catch (error) {
      failure = error as EtsyOAuthTokenError;
    }
    expect(failure).toMatchObject({ code: "invalid_grant", requiresReauthorization: true });
    expect(failure.message).not.toContain("token secret");
    expect(failure.message).not.toContain("secret");
  });

  it("uses a compare-and-swap refresh lease and token generation", async () => {
    const repository = await source("lib/server/repositories/etsy-repository.ts");
    expect(repository).toContain("refreshLeaseUntil");
    expect(repository).toContain("expectedTokenVersion");
    expect(repository).toContain("tokenVersion: { increment: 1 }");
  });

  it("keeps jobs tenant-resolved and the callback free of foreground sync", async () => {
    const callback = await source("app/api/etsy/oauth/callback/route.ts");
    expect(callback).toContain("queueWorkspaceEtsySync");
    expect(callback).not.toContain("executeEtsySyncRun");
    expect(await source("lib/inngest/etsy-functions.ts")).toContain('key: "event.data.shopId"');
  });

  it("enforces the expanded Etsy read-only guard", async () => {
    expect(await validateEtsyReadOnlyBoundary()).toEqual([]);
  });

  it("keeps unknown receipt/payment source values nullable", async () => {
    const schema = await source("prisma/schema.prisma");
    expect(schema).toMatch(/subtotalAmount\s+Decimal\?/);
    expect(schema).toMatch(/giftWrapAmount\s+Decimal\?/);
    expect(await source("lib/etsy/sync.ts")).toContain("giftWrapAmount: null");
  });
});

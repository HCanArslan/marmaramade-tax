import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("Better Auth proxy", () => {
  it.each(["/api/inngest", "/api/inngest/health"])(
    "allows the Inngest infrastructure path %s without a user session",
    async (pathname) => {
      vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => null }));
      const { proxy } = await import("@/proxy");
      const response = proxy(new NextRequest(`https://example.test${pathname}`));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("redirects an unauthenticated app request with a local callback", async () => {
    vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => null }));
    const { proxy } = await import("@/proxy");
    const response = proxy(new NextRequest("https://example.test/app/reports?q=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?callbackUrl=%2Fapp%2Freports%3Fq%3D1",
    );
  });

  it("does not exempt another protected API route or a lookalike path", async () => {
    vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => null }));
    const { proxy } = await import("@/proxy");
    for (const pathname of ["/api/documents/private", "/api/inngest-forged"]) {
      const response = proxy(new NextRequest(`https://example.test${pathname}`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login?callbackUrl=");
    }
  });

  it("allows a cookie-bearing request to reach definitive server checks", async () => {
    vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => "signed" }));
    const { proxy } = await import("@/proxy");
    const response = proxy(new NextRequest("https://example.test/app"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

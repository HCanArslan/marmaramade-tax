import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("Better Auth proxy", () => {
  it("redirects an unauthenticated app request with a local callback", async () => {
    vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => null }));
    const { proxy } = await import("@/proxy");
    const response = proxy(new NextRequest("https://example.test/app/reports?q=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?callbackUrl=%2Fapp%2Freports%3Fq%3D1",
    );
  });

  it("allows a cookie-bearing request to reach definitive server checks", async () => {
    vi.doMock("better-auth/cookies", () => ({ getSessionCookie: () => "signed" }));
    const { proxy } = await import("@/proxy");
    const response = proxy(new NextRequest("https://example.test/app"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

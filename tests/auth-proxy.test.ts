import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("authentication proxy cookie", () => {
  it.each([
    ["production", "__Secure-next-auth.session-token"],
    ["development", "next-auth.session-token"],
  ])("uses the NextAuth cookie name in %s", async (nodeEnv, expectedName) => {
    vi.stubEnv("NODE_ENV", nodeEnv);

    const withAuth = vi.fn((options) => options);
    vi.doMock("next-auth/middleware", () => ({ default: withAuth, withAuth }));

    await import("@/proxy");

    expect(withAuth).toHaveBeenCalledWith(expect.objectContaining({
      cookies: { sessionToken: { name: expectedName } },
    }));
  });
});

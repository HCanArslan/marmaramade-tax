import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { safeAuthCallbackPath } from "@/lib/auth/callback-url";

const origin = "https://auth.example.test";

function createTestAuth(options?: {
  requireVerification?: boolean;
  verificationExpiresIn?: number;
  resetExpiresIn?: number;
  onVerification?: (url: string) => void;
  onReset?: (url: string) => void;
}) {
  const database: Record<string, unknown[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    rateLimit: [],
  };
  return betterAuth({
    baseURL: origin,
    secret: "test-secret-with-at-least-thirty-two-characters",
    trustedOrigins: [origin],
    database: memoryAdapter(database),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: options?.requireVerification ?? false,
      minPasswordLength: 12,
      resetPasswordTokenExpiresIn: options?.resetExpiresIn ?? 3600,
      sendResetPassword: async ({ url }) => options?.onReset?.(url),
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: options?.verificationExpiresIn ?? 3600,
      sendVerificationEmail: async ({ url }) => options?.onVerification?.(url),
    },
  });
}

async function call(
  auth: ReturnType<typeof createTestAuth>,
  path: string,
  body?: object,
  cookie?: string,
) {
  const headers = new Headers({ origin });
  if (body) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

const account = {
  name: "Test Seller",
  email: "seller@example.test",
  password: "a-secure-test-password",
};

describe("Better Auth email/password behavior", () => {
  it("registers a valid account without returning a plaintext password", async () => {
    const auth = createTestAuth();
    const response = await call(auth, "/sign-up/email", account);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain(account.password);
  });

  it("rejects invalid signup input", async () => {
    const auth = createTestAuth();
    const response = await call(auth, "/sign-up/email", {
      ...account,
      email: "invalid",
      password: "short",
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("does not enumerate duplicate email during verification-required signup", async () => {
    const auth = createTestAuth({ requireVerification: true });
    expect((await call(auth, "/sign-up/email", account)).status).toBe(200);
    expect((await call(auth, "/sign-up/email", account)).status).toBe(200);
  });

  it("signs in, rejects an invalid password, and revokes the session on logout", async () => {
    const auth = createTestAuth();
    await call(auth, "/sign-up/email", account);
    const invalid = await call(auth, "/sign-in/email", {
      email: account.email,
      password: "not-the-password",
    });
    expect(invalid.status).toBeGreaterThanOrEqual(400);
    const login = await call(auth, "/sign-in/email", {
      email: account.email,
      password: account.password,
    });
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    const logout = await call(auth, "/sign-out", {}, cookie ?? undefined);
    expect(logout.status).toBe(200);
  });

  it("rejects expired verification and reset tokens", async () => {
    let verificationUrl = "";
    let resetUrl = "";
    const auth = createTestAuth({
      requireVerification: true,
      verificationExpiresIn: -1,
      resetExpiresIn: -1,
      onVerification: (url) => { verificationUrl = url; },
      onReset: (url) => { resetUrl = url; },
    });
    await call(auth, "/sign-up/email", account);
    const verification = await auth.handler(new Request(verificationUrl));
    expect(verification.status).toBeGreaterThanOrEqual(300);
    await call(auth, "/request-password-reset", {
      email: account.email,
      redirectTo: "/reset-password",
    });
    const token = new URL(resetUrl).searchParams.get("token");
    const reset = await call(auth, "/reset-password", {
      token,
      newPassword: "another-secure-test-password",
    });
    expect(reset.status).toBeGreaterThanOrEqual(400);
  });
});

describe("authentication callback allowlist", () => {
  it.each(["https://evil.test", "//evil.test", "/ledger", "/products", "javascript:alert(1)"])(
    "rejects %s for ordinary users",
    (value) => expect(safeAuthCallbackPath(value)).toBe("/app"),
  );
  it("allows app/workspace paths and founder ledger callbacks", () => {
    expect(safeAuthCallbackPath("/app/reports?month=1")).toBe("/app/reports?month=1");
    expect(safeAuthCallbackPath("/workspace/select")).toBe("/workspace/select");
    expect(safeAuthCallbackPath("/ledger", { founder: true })).toBe("/ledger");
  });
});

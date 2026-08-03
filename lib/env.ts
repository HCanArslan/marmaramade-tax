import "server-only";
import { z } from "zod";
import { assertReadOnlyEtsyScopes } from "@/lib/etsy/scopes";

function cleanEnvironmentValue(value: unknown) {
  if (typeof value !== "string") return value;
  let cleaned = value.trim();
  if (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || undefined;
}

const optionalSecret = z.preprocess(
  cleanEnvironmentValue,
  z.string().min(1).optional(),
);
const optionalEmail = z.preprocess(
  cleanEnvironmentValue,
  z.string().email().optional(),
);
const optionalUrl = z.preprocess(
  cleanEnvironmentValue,
  z.string().url().optional(),
);
const optionalNumber = (schema: z.ZodNumber, fallback: number) =>
  z.preprocess(
    cleanEnvironmentValue,
    z.coerce.number().pipe(schema).default(fallback),
  );
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  DIRECT_URL: z.preprocess(
    cleanEnvironmentValue,
    z.string().url().or(z.string().startsWith("postgresql://")).optional(),
  ),
  AUTH_SECRET: optionalSecret,
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD_HASH: optionalSecret,
  AUTH_MAX_FAILED_ATTEMPTS: optionalNumber(z.number().int().min(1).max(20), 5),
  AUTH_LOCKOUT_MINUTES: optionalNumber(z.number().int().min(1).max(1440), 15),
  AUTH_SESSION_MAX_AGE_HOURS: optionalNumber(
    z.number().int().min(1).max(24),
    8,
  ),
  BETTER_AUTH_SECRET: optionalSecret,
  BETTER_AUTH_URL: optionalUrl,
  NEXTAUTH_URL: optionalUrl,
  BETTER_AUTH_TRUSTED_ORIGINS: optionalSecret,
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  FOUNDER_EMAIL: optionalEmail,
  FOUNDER_NAME: optionalSecret,
  FOUNDER_WORKSPACE_NAME: optionalSecret,
  FOUNDER_WORKSPACE_SLUG: optionalSecret,
  FOUNDER_BOOTSTRAP_PASSWORD: optionalSecret,
  AUTH_DEV_EMAIL_CAPTURE: z.preprocess(
    (value) => String(cleanEnvironmentValue(value) ?? "false").toLowerCase(),
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ),
  TOKEN_ENCRYPTION_KEY: optionalSecret,
  ETSY_API_KEYSTRING: optionalSecret,
  ETSY_SHARED_SECRET: optionalSecret,
  ETSY_REDIRECT_URI: z.preprocess(
    cleanEnvironmentValue,
    z.string().url().default("http://localhost:3000/api/etsy/oauth/callback"),
  ),
  ETSY_SCOPES: z.preprocess(
    cleanEnvironmentValue,
    z.string().default("shops_r listings_r transactions_r"),
  ),
  ETSY_WEBHOOK_SIGNING_SECRET: optionalSecret,
  ETSY_RAW_PAYLOAD_RETENTION_DAYS: optionalNumber(
    z.number().int().min(0).max(30),
    0,
  ),
  SHIPENTEGRA_CLIENT_ID: optionalSecret,
  SHIPENTEGRA_CLIENT_SECRET: optionalSecret,
  SHIPENTEGRA_ENVIRONMENT: z.preprocess(
    (value) =>
      String(cleanEnvironmentValue(value) ?? "production").toLowerCase(),
    z.enum(["production"]),
  ),
  SHIPENTEGRA_OPERATION_MODE: z.preprocess(
    (value) =>
      String(
        cleanEnvironmentValue(value) ?? "ADMIN_CONFIRMED_SHIPMENT",
      ).toUpperCase(),
    z.literal("ADMIN_CONFIRMED_SHIPMENT"),
  ),
  SHIPENTEGRA_REQUEST_TIMEOUT_MS: optionalNumber(
    z.number().int().min(1000).max(60000),
    15000,
  ),
  SHIPENTEGRA_TRACKING_SYNC_ENABLED: z.preprocess(
    (value) => String(cleanEnvironmentValue(value) ?? "false").toLowerCase(),
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ),
  SHIPENTEGRA_TRACKING_SYNC_HOURS: optionalNumber(
    z.number().int().min(6).max(168),
    6,
  ),
  CRON_SECRET: optionalSecret,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const invalidKeys = [
      ...new Set(
        parsed.error.issues
          .map((issue) => issue.path.join("."))
          .filter(Boolean),
      ),
    ];
    throw new Error(
      `Server configuration is invalid${invalidKeys.length ? `: ${invalidKeys.join(", ")}` : "."}`,
    );
  }
  assertReadOnlyEtsyScopes(
    parsed.data.ETSY_SCOPES.split(/\s+/).filter(Boolean),
  );
  cached = parsed.data;
  return cached;
}

export function requireAuthSecrets() {
  const env = getServerEnv();
  if (!env.AUTH_SECRET || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH)
    throw new Error("Authentication is not configured.");
  return env as ServerEnv & {
    AUTH_SECRET: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD_HASH: string;
  };
}

export function requireBetterAuthConfig() {
  const env = getServerEnv();
  const secret = env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET;
  const baseURL =
    env.BETTER_AUTH_URL ??
    env.NEXTAUTH_URL ??
    (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error("Better Auth is not configured.");
  }
  if (!!env.GOOGLE_CLIENT_ID !== !!env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google authentication configuration is incomplete.");
  }
  const baseOrigin = new URL(baseURL).origin;
  const trustedOrigins = [
    baseOrigin,
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin),
  ];
  if (
    process.env.NODE_ENV === "production" &&
    trustedOrigins.some((origin) => {
      const url = new URL(origin);
      const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      return url.protocol !== "https:" && !loopback;
    })
  ) {
    throw new Error("Production authentication origins must use HTTPS.");
  }
  return {
    secret,
    baseURL,
    trustedOrigins: [...new Set(trustedOrigins)],
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }
        : undefined,
    developmentEmailCapture: env.AUTH_DEV_EMAIL_CAPTURE,
  };
}

export function requireEtsySecrets() {
  const env = getServerEnv();
  if (
    !env.ETSY_API_KEYSTRING ||
    !env.ETSY_SHARED_SECRET ||
    !env.TOKEN_ENCRYPTION_KEY
  )
    throw new Error("Etsy integration is not configured.");
  return env as ServerEnv & {
    ETSY_API_KEYSTRING: string;
    ETSY_SHARED_SECRET: string;
    TOKEN_ENCRYPTION_KEY: string;
  };
}

export function requireShipEntegraSecrets() {
  const env = getServerEnv();
  if (!env.SHIPENTEGRA_CLIENT_ID || !env.SHIPENTEGRA_CLIENT_SECRET) {
    throw new Error("ShipEntegra integration is not configured.");
  }
  return env as ServerEnv & {
    SHIPENTEGRA_CLIENT_ID: string;
    SHIPENTEGRA_CLIENT_SECRET: string;
  };
}

export function resetEnvCacheForTests() {
  cached = undefined;
}

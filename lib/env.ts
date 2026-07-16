import "server-only";
import { z } from "zod";
import { assertReadOnlyEtsyScopes } from "@/lib/etsy/scopes";

const optionalSecret = z.string().min(1).optional();
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  DIRECT_URL: z.string().url().or(z.string().startsWith("postgresql://")).optional(),
  AUTH_SECRET: optionalSecret,
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: optionalSecret,
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  AUTH_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  AUTH_SESSION_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  TOKEN_ENCRYPTION_KEY: optionalSecret,
  ETSY_API_KEYSTRING: optionalSecret,
  ETSY_SHARED_SECRET: optionalSecret,
  ETSY_REDIRECT_URI: z.string().url().default("http://localhost:3000/api/etsy/oauth/callback"),
  ETSY_SCOPES: z.string().default("shops_r listings_r transactions_r"),
  ETSY_WEBHOOK_SIGNING_SECRET: optionalSecret,
  ETSY_RAW_PAYLOAD_RETENTION_DAYS: z.coerce.number().int().min(0).max(30).default(0),
  SHIPENTEGRA_CLIENT_ID: optionalSecret,
  SHIPENTEGRA_CLIENT_SECRET: optionalSecret,
  SHIPENTEGRA_ENVIRONMENT: z.enum(["production"]).default("production"),
  SHIPENTEGRA_OPERATION_MODE: z.enum(["ADMIN_CONFIRMED_SHIPMENT"]).default("ADMIN_CONFIRMED_SHIPMENT"),
  SHIPENTEGRA_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  SHIPENTEGRA_TRACKING_SYNC_ENABLED: z.string().default("false").transform((value) => value === "true"),
  SHIPENTEGRA_TRACKING_SYNC_HOURS: z.coerce.number().int().min(6).max(168).default(6),
  CRON_SECRET: optionalSecret,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) throw new Error("Server configuration is invalid. Check required environment variables.");
  assertReadOnlyEtsyScopes(parsed.data.ETSY_SCOPES.split(/\s+/).filter(Boolean));
  cached = parsed.data;
  return cached;
}

export function requireAuthSecrets() {
  const env = getServerEnv();
  if (!env.AUTH_SECRET || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) throw new Error("Authentication is not configured.");
  return env as ServerEnv & { AUTH_SECRET: string; ADMIN_EMAIL: string; ADMIN_PASSWORD_HASH: string };
}

export function requireEtsySecrets() {
  const env = getServerEnv();
  if (!env.ETSY_API_KEYSTRING || !env.ETSY_SHARED_SECRET || !env.TOKEN_ENCRYPTION_KEY) throw new Error("Etsy integration is not configured.");
  return env as ServerEnv & { ETSY_API_KEYSTRING: string; ETSY_SHARED_SECRET: string; TOKEN_ENCRYPTION_KEY: string };
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

export function resetEnvCacheForTests() { cached = undefined; }

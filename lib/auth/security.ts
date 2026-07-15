import "server-only";
import { createHmac } from "node:crypto";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuthSecrets } from "@/lib/env";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeIp = (ip?: string | null) => (ip?.split(",")[0]?.trim() || "unknown").slice(0, 128);

export function privacyHash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export interface LoginDecision { allowed: boolean; reason: "SUCCESS" | "INVALID_CREDENTIALS" | "LOCKED"; }
export function decideLogin(input: { recentFailures: number; maximumFailures: number; emailMatches: boolean; passwordMatches: boolean }): LoginDecision {
  if (input.recentFailures >= input.maximumFailures) return { allowed: false, reason: "LOCKED" };
  return input.emailMatches && input.passwordMatches ? { allowed: true, reason: "SUCCESS" } : { allowed: false, reason: "INVALID_CREDENTIALS" };
}

export async function verifyAdminLogin(input: { email: string; password: string; ip?: string | null; userAgent?: string | null }): Promise<LoginDecision> {
  const env = requireAuthSecrets();
  const normalizedEmail = normalizeEmail(input.email);
  const emailHash = privacyHash(normalizedEmail, env.AUTH_SECRET);
  const ipHash = privacyHash(normalizeIp(input.ip), env.AUTH_SECRET);
  const since = new Date(Date.now() - env.AUTH_LOCKOUT_MINUTES * 60_000);
  const failures = await prisma.loginAttempt.count({ where: { successful: false, createdAt: { gte: since }, OR: [{ emailHash }, { ipHash }] } });
  if (failures >= env.AUTH_MAX_FAILED_ATTEMPTS) {
    await recordAttempt({ emailHash, ipHash, successful: false, reasonCode: "LOCKED", userAgent: input.userAgent });
    return { allowed: false, reason: "LOCKED" };
  }
  const validEmail = normalizedEmail === normalizeEmail(env.ADMIN_EMAIL);
  const validPassword = validEmail && await compare(input.password, env.ADMIN_PASSWORD_HASH);
  const decision = decideLogin({ recentFailures: failures, maximumFailures: env.AUTH_MAX_FAILED_ATTEMPTS, emailMatches: validEmail, passwordMatches: Boolean(validPassword) });
  await recordAttempt({ emailHash, ipHash, successful: decision.allowed, reasonCode: decision.reason, userAgent: input.userAgent });
  return decision;
}

async function recordAttempt(input: { emailHash: string; ipHash: string; successful: boolean; reasonCode: string; userAgent?: string | null }) {
  const userAgent = input.userAgent?.slice(0, 500) || null;
  await prisma.$transaction([
    prisma.loginAttempt.create({ data: { ...input, userAgent } }),
    prisma.adminSecurityEvent.create({ data: { eventType: "ADMIN_LOGIN", successful: input.successful, emailHash: input.emailHash, ipHash: input.ipHash, reasonCode: input.reasonCode, userAgent } }),
  ]);
}

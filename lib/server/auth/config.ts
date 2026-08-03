import "server-only";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { requireBetterAuthConfig } from "@/lib/env";
import { betterAuthDatabase } from "@/lib/server/db/auth-adapter";
import { recordAuthSecurityEvent } from "@/lib/server/repositories/auth-repository";
import { scheduleAuthEmail } from "@/lib/server/auth/email-delivery";

const config = requireBetterAuthConfig();

export const auth = betterAuth({
  appName: "MarmaraLedge",
  baseURL: config.baseURL,
  secret: config.secret,
  trustedOrigins: config.trustedOrigins,
  database: betterAuthDatabase,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      scheduleAuthEmail({
        kind: "RESET_PASSWORD",
        recipient: user.email,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      scheduleAuthEmail({
        kind: "VERIFY_EMAIL",
        recipient: user.email,
        url,
      });
    },
  },
  socialProviders: config.google ? { google: config.google } : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      systemRole: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "marmaraledge",
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  hooks: {
    after: createAuthMiddleware(async (context) => {
      const eventType =
        context.path === "/sign-in/email"
          ? "LOGIN_SUCCEEDED"
          : context.path === "/sign-up/email"
            ? "SIGNUP_SUCCEEDED"
            : context.path === "/reset-password"
              ? "PASSWORD_RESET_SUCCEEDED"
              : context.path === "/sign-out"
                ? "LOGOUT_SUCCEEDED"
                : null;
      if (!eventType) return;
      try {
        await recordAuthSecurityEvent({
          eventType,
          success: true,
          userId: context.context.newSession?.user.id,
        });
      } catch {
        console.error("Authentication security event could not be recorded.");
      }
    }),
  },
  plugins: [nextCookies()],
});

export type BetterAuthSession = typeof auth.$Infer.Session;

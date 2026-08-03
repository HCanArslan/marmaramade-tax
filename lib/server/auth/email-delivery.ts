import "server-only";
import { requireBetterAuthConfig } from "@/lib/env";

export type AuthEmailKind = "VERIFY_EMAIL" | "RESET_PASSWORD";

export type CapturedAuthEmail = {
  kind: AuthEmailKind;
  recipient: string;
  url: string;
  createdAt: string;
};

const globalCapture = globalThis as typeof globalThis & {
  marmaraLedgeAuthEmails?: CapturedAuthEmail[];
};

export function scheduleAuthEmail(input: {
  kind: AuthEmailKind;
  recipient: string;
  url: string;
}) {
  const config = requireBetterAuthConfig();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production authentication email delivery is not configured.");
  }
  if (!config.developmentEmailCapture) return;
  const messages = (globalCapture.marmaraLedgeAuthEmails ??= []);
  messages.push({ ...input, createdAt: new Date().toISOString() });
  if (messages.length > 20) messages.splice(0, messages.length - 20);
}

export function readCapturedAuthEmails() {
  if (
    process.env.NODE_ENV === "production" ||
    !requireBetterAuthConfig().developmentEmailCapture
  ) {
    return [];
  }
  return [...(globalCapture.marmaraLedgeAuthEmails ?? [])];
}

export function clearCapturedAuthEmails() {
  globalCapture.marmaraLedgeAuthEmails = [];
}

import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
const events = new Set(["order.paid", "order.canceled", "order.shipped", "order.delivered"]);
export function verifyEtsyWebhook(input: { rawBody: string; webhookId: string; timestamp: string; signatureHeader: string; secret: string; nowSeconds?: number; toleranceSeconds?: number }) {
  if (!input.secret.startsWith("whsec_")) return false;
  const timestamp = Number(input.timestamp); const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > (input.toleranceSeconds ?? 300)) return false;
  const key = Buffer.from(input.secret.slice(6), "base64");
  const expected = createHmac("sha256", key).update(`${input.webhookId}.${input.timestamp}.${input.rawBody}`).digest("base64");
  return input.signatureHeader.split(/\s+/).some((part) => { const candidate = part.startsWith("v1,") || part.startsWith("v1=") ? part.slice(3) : part; const a = Buffer.from(candidate); const b = Buffer.from(expected); return a.length === b.length && timingSafeEqual(a, b); });
}
export function validateWebhookEvent(value: unknown) { if (!value || typeof value !== "object") throw new Error("Invalid webhook payload."); const payload = value as Record<string, unknown>; if (!events.has(String(payload.event_type)) || !String(payload.resource_url).startsWith("https://api.etsy.com/v3/") || !payload.shop_id) throw new Error("Unsupported webhook event."); return { eventType: String(payload.event_type), resourceUrl: String(payload.resource_url), shopId: String(payload.shop_id) }; }
export const webhookPayloadHash = (body: string) => createHash("sha256").update(body).digest("hex");

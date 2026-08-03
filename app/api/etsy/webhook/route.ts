import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { validateWebhookEvent, verifyEtsyWebhook, webhookPayloadHash } from "@/lib/etsy/webhook";
import { acceptEtsyWebhook, markWebhookQueued } from "@/lib/server/repositories/etsy-repository";
import { queueWebhookEtsySync } from "@/lib/etsy/service";

export async function POST(request: Request) {
  const rawBody = await request.text(); const webhookId = request.headers.get("webhook-id") || ""; const timestamp = request.headers.get("webhook-timestamp") || ""; const signatureHeader = request.headers.get("webhook-signature") || ""; const secret = getServerEnv().ETSY_WEBHOOK_SIGNING_SECRET;
  if (!secret || !webhookId || !verifyEtsyWebhook({ rawBody, webhookId, timestamp, signatureHeader, secret })) return NextResponse.json({ error: "Invalid webhook." }, { status: 401 });
  try {
    const event = validateWebhookEvent(JSON.parse(rawBody));
    const accepted = await acceptEtsyWebhook({
      webhookId,
      eventType: event.eventType,
      externalShopId: event.shopId,
      resourceUrl: event.resourceUrl,
      payloadHash: webhookPayloadHash(rawBody),
      webhookTimestamp: new Date(Number(timestamp) * 1000),
    });
    const queued = await queueWebhookEtsySync(accepted.event.saasShopId!, webhookId);
    if (!queued.delivered) return NextResponse.json({ error: "Background delivery is unavailable." }, { status: 503 });
    await markWebhookQueued(accepted.event.id);
    return NextResponse.json({ accepted: true, duplicate: accepted.duplicate }, { status: 202 });
  }
  catch { return NextResponse.json({ error: "Invalid webhook." }, { status: 400 }); }
}

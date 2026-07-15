import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { validateWebhookEvent, verifyEtsyWebhook, webhookPayloadHash } from "@/lib/etsy/webhook";

export async function POST(request: Request) {
  const rawBody = await request.text(); const webhookId = request.headers.get("webhook-id") || ""; const timestamp = request.headers.get("webhook-timestamp") || ""; const signatureHeader = request.headers.get("webhook-signature") || ""; const secret = getServerEnv().ETSY_WEBHOOK_SIGNING_SECRET;
  if (!secret || !webhookId || !verifyEtsyWebhook({ rawBody, webhookId, timestamp, signatureHeader, secret })) return NextResponse.json({ error: "Invalid webhook." }, { status: 401 });
  try { const event = validateWebhookEvent(JSON.parse(rawBody)); const created = await prisma.etsyWebhookEvent.create({ data: { webhookId, eventType: event.eventType, shopId: event.shopId, resourceUrl: event.resourceUrl, payloadHash: webhookPayloadHash(rawBody), webhookTimestamp: new Date(Number(timestamp) * 1000) } }); return NextResponse.json({ accepted: true, id: created.id }, { status: 202 }); }
  catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ accepted: true, duplicate: true }); return NextResponse.json({ error: "Invalid webhook." }, { status: 400 }); }
}

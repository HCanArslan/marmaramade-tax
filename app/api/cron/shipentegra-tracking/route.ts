import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { synchronizeTracking } from "@/lib/shipentegra/tracking";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });
  if (!env.SHIPENTEGRA_TRACKING_SYNC_ENABLED) return NextResponse.json({ ok: true, skipped: "disabled" });
  const before = new Date(Date.now() - env.SHIPENTEGRA_TRACKING_SYNC_HOURS * 3_600_000);
  const shipments = await prisma.shipEntegraShipment.findMany({
    where: { trackingNumber: { not: null }, deliveredAt: null, canceledAt: null, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: before } }] },
    select: { id: true }, take: 50,
  });
  const results = [];
  for (const shipment of shipments) {
    try { await synchronizeTracking(shipment.id); results.push({ id: shipment.id, ok: true }); }
    catch { results.push({ id: shipment.id, ok: false }); }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}

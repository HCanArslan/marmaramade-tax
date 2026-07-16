import "server-only";
import { prisma } from "@/lib/prisma";
import { shipEntegraGet, type ShipEntegraTransport } from "./client";
import { trackingResponseSchema } from "./schemas";
import { trackingEventId } from "./mappers";
import { ShipEntegraError } from "./errors";

export async function retrieveTracking(
  trackingNumber: string,
  transport?: ShipEntegraTransport,
) {
  const query = new URLSearchParams({ trackingNumber });
  const raw = await shipEntegraGet("CARGO_ACTIVITIES", { query, transport });
  const parsed = trackingResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.status !== "success")
    throw new ShipEntegraError(
      "ShipEntegra returned invalid tracking data.",
      "INVALID_TRACKING_RESPONSE",
    );
  return parsed.data.data;
}

export async function synchronizeTracking(
  shipmentId: string,
  transport?: ShipEntegraTransport,
) {
  const shipment = await prisma.shipEntegraShipment.findUnique({
    where: { id: shipmentId },
  });
  if (!shipment?.trackingNumber)
    throw new ShipEntegraError(
      "Shipment has no tracking number.",
      "TRACKING_NUMBER_MISSING",
      409,
    );
  const tracking = await retrieveTracking(shipment.trackingNumber, transport);
  for (const activity of tracking.activities) {
    const externalEventId = trackingEventId(
      shipment.trackingNumber,
      activity.date,
      activity.event,
    );
    await prisma.shipEntegraTrackingEvent.upsert({
      where: { shipmentId_externalEventId: { shipmentId, externalEventId } },
      update: {},
      create: {
        shipmentId,
        externalEventId,
        statusLabel: tracking.status,
        description: activity.event,
        eventTime: new Date(activity.date),
      },
    });
  }
  await prisma.shipEntegraShipment.update({
    where: { id: shipmentId },
    data: {
      shipmentStatus: tracking.status ?? shipment.shipmentStatus,
      deliveredAt: tracking.deliveryDate
        ? new Date(tracking.deliveryDate)
        : shipment.deliveredAt,
      lastSyncedAt: new Date(),
    },
  });
  return tracking;
}

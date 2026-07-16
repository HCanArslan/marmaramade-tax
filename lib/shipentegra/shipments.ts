import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { getServerEnv } from "@/lib/env";
import { shipmentRequestSchema, type ShipmentRequest } from "./schemas";
import { stableHash } from "./mappers";
import { ShipEntegraError } from "./errors";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function assertExplicitShipmentConfirmation(input: {
  token?: string;
  confirmed?: boolean;
}) {
  if (!input.confirmed || !input.token)
    throw new ShipEntegraError(
      "Explicit administrator confirmation is required.",
      "CONFIRMATION_REQUIRED",
      403,
    );
}

export async function createShipmentConfirmation(input: {
  localOrderId: string;
  legalOperatingProfileId: string;
  selectedQuoteId?: string;
  preview: unknown;
}) {
  const session = await requireAdminApi();
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.shipEntegraConfirmation.create({
    data: {
      localOrderId: input.localOrderId,
      legalOperatingProfileId: input.legalOperatingProfileId,
      selectedQuoteId: input.selectedQuoteId,
      tokenHash: hashToken(rawToken),
      previewPayloadHash: stableHash(input.preview),
      confirmedBy: session.user?.email ?? "admin",
      confirmedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return rawToken;
}

export async function shipEntegraCreateShipment(input: {
  localOrderId: string;
  confirmationToken: string;
  confirmed: boolean;
  payload: ShipmentRequest;
}) {
  await requireAdminApi();
  assertExplicitShipmentConfirmation({
    token: input.confirmationToken,
    confirmed: input.confirmed,
  });
  const env = getServerEnv();
  if (env.SHIPENTEGRA_OPERATION_MODE !== "ADMIN_CONFIRMED_SHIPMENT")
    throw new ShipEntegraError(
      "Shipment mutations require explicit admin-confirmed mode.",
      "ADMIN_CONFIRMATION_REQUIRED",
      403,
    );
  const payload = shipmentRequestSchema.parse(input.payload);
  const [order, existing, confirmation] = await Promise.all([
    prisma.order.findUnique({
      where: { id: input.localOrderId },
      include: { items: true, legalOperatingProfile: true },
    }),
    prisma.shipEntegraShipment.findUnique({
      where: { localOrderId: input.localOrderId },
    }),
    prisma.shipEntegraConfirmation.findUnique({
      where: { tokenHash: hashToken(input.confirmationToken) },
    }),
  ]);
  if (
    !order ||
    !order.confirmedAt ||
    !order.legalOperatingProfileId ||
    order.items.length === 0
  )
    throw new ShipEntegraError(
      "The local order is not ready for shipment.",
      "ORDER_NOT_READY",
      409,
    );
  if (existing)
    throw new ShipEntegraError(
      "This order already has a ShipEntegra shipment.",
      "DUPLICATE_SHIPMENT",
      409,
    );
  if (
    !confirmation ||
    confirmation.localOrderId !== order.id ||
    confirmation.consumedAt ||
    confirmation.expiresAt <= new Date()
  )
    throw new ShipEntegraError(
      "Shipment confirmation is invalid or expired.",
      "INVALID_CONFIRMATION",
      403,
    );
  if (confirmation.previewPayloadHash !== stableHash(payload))
    throw new ShipEntegraError(
      "Shipment data changed after confirmation.",
      "PREVIEW_CHANGED",
      409,
    );

  // API v4.0.4 documents POST /orders, but does not publish a success response
  // contract for it. Mutating remotely without a documented way to validate and
  // link the result would make safe reconciliation impossible.
  throw new ShipEntegraError(
    "Shipment creation is disabled until ShipEntegra documents the POST /orders success response.",
    "UNDOCUMENTED_CREATE_RESPONSE",
    501,
  );
}

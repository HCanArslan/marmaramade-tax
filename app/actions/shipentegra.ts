"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { shipEntegraGet } from "@/lib/shipentegra/client";
import { carriersResponseSchema } from "@/lib/shipentegra/schemas";
import { safeShipEntegraError } from "@/lib/shipentegra/errors";
import { retrieveAndPersistShipEntegraQuotes } from "@/lib/shipentegra/quotes";

export async function testShipEntegraConnectionAction() {
  await requireAdmin({ redirectTo: "/settings/shipentegra" });
  const env = getServerEnv();
  const environment = "PRODUCTION" as const;
  try {
    const raw = await shipEntegraGet("FIND_CARRIERS");
    const parsed = carriersResponseSchema.parse(raw);
    await prisma.shipEntegraConnection.upsert({
      where: { environment },
      update: { status: "CONNECTED", connectedAt: new Date(), lastSuccessfulRequestAt: new Date(), lastErrorCode: null, operationMode: env.SHIPENTEGRA_OPERATION_MODE },
      create: { environment, status: "CONNECTED", connectedAt: new Date(), lastSuccessfulRequestAt: new Date(), operationMode: env.SHIPENTEGRA_OPERATION_MODE },
    });
    await prisma.shipEntegraApiCall.create({ data: { operation: "FIND_CARRIERS", endpointCategory: "READ_ONLY", success: true, statusCode: 200, durationMs: 0 } });
    void parsed.data.length;
  } catch (error) {
    const safe = safeShipEntegraError(error);
    await prisma.shipEntegraConnection.upsert({
      where: { environment }, update: { status: "AUTH_FAILED", lastFailedRequestAt: new Date(), lastErrorCode: safe.code },
      create: { environment, status: "AUTH_FAILED", lastFailedRequestAt: new Date(), lastErrorCode: safe.code, operationMode: env.SHIPENTEGRA_OPERATION_MODE },
    });
    void safe.message;
  } finally {
    revalidatePath("/settings/shipentegra");
  }
}

const quoteFormSchema = z.object({
  destinationCountry: z.string().trim().length(2).transform((v) => v.toUpperCase()),
  destinationPostalCode: z.string().trim().optional(), lengthCm: z.string().regex(/^\d+(\.\d+)?$/),
  widthCm: z.string().regex(/^\d+(\.\d+)?$/), heightCm: z.string().regex(/^\d+(\.\d+)?$/), actualWeightKg: z.string().regex(/^\d+(\.\d+)?$/),
});

export async function retrieveShipEntegraQuotesAction(formData: FormData) {
  await requireAdmin({ redirectTo: "/shipentegra" });
  const input = quoteFormSchema.parse(Object.fromEntries(formData));
  await retrieveAndPersistShipEntegraQuotes({ ...input, originCountry: "TR", expiresInHours: 24 });
  revalidatePath("/shipentegra");
}

export async function createManualShipEntegraShipmentAction(formData: FormData) {
  const session = await requireAdmin({ redirectTo: "/shipentegra" });
  const value = z.object({
    localOrderId: z.string().min(1), externalShipmentId: z.string().trim().min(1), trackingNumber: z.string().trim().optional(),
    actualCost: z.string().regex(/^\d+(\.\d+)?$/).optional(), currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  }).parse(Object.fromEntries(formData));
  const existing = await prisma.shipEntegraShipment.findUnique({ where: { localOrderId: value.localOrderId } });
  if (existing) throw new Error("This order already has a ShipEntegra shipment.");
  await prisma.$transaction(async (tx) => {
    await tx.shipEntegraShipment.create({ data: {
      localOrderId: value.localOrderId, externalShipmentId: value.externalShipmentId,
      externalOrderReference: `MANUAL-${value.localOrderId}`, shipmentStatus: "MANUAL_ENTRY",
      trackingNumber: value.trackingNumber || null, actualCost: value.actualCost, currency: value.currency,
    }});
    await tx.auditLog.create({ data: { entityType: "ShipEntegraShipment", entityId: value.localOrderId, action: "MANUAL_SHIPMENT_LINKED", actor: session.user?.email ?? "ADMIN", afterJson: JSON.stringify({ externalShipmentId: value.externalShipmentId, hasTrackingNumber: Boolean(value.trackingNumber), actualCost: value.actualCost, currency: value.currency }) } });
  });
  revalidatePath("/shipentegra");
}

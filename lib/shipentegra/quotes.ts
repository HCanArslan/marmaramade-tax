import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { allPricesResponseSchema, quoteRequestSchema } from "./schemas";
import { shipEntegraQuoteRequest, type ShipEntegraTransport } from "./client";
import { decimalFromApi, partialPostalCode, stableHash } from "./mappers";
import { ShipEntegraError } from "./errors";

export type QuoteInput = {
  localOrderId?: string;
  packageProfileId?: string;
  originCountry?: string;
  destinationCountry: string;
  destinationPostalCode?: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  actualWeightKg: string;
  expiresInHours?: number;
};

export function calculateKgDesi(
  input: Pick<
    QuoteInput,
    "lengthCm" | "widthCm" | "heightCm" | "actualWeightKg"
  >,
) {
  const volume = new Decimal(input.lengthCm)
    .times(input.widthCm)
    .times(input.heightCm)
    .div(5000);
  return Decimal.max(volume, new Decimal(input.actualWeightKg)).toDecimalPlaces(
    3,
    Decimal.ROUND_UP,
  );
}

export async function retrieveShipEntegraQuotes(
  input: QuoteInput,
  transport?: ShipEntegraTransport,
) {
  const country = input.destinationCountry.trim().toUpperCase();
  const kgDesi = calculateKgDesi(input);
  const request = quoteRequestSchema.parse({
    country,
    kgDesi: kgDesi.toString(),
  });
  const raw = await shipEntegraQuoteRequest(
    { country: request.country, kgDesi: Number(request.kgDesi) },
    transport,
  );
  const parsed = allPricesResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.status !== "success")
    throw new ShipEntegraError(
      "ShipEntegra returned an invalid quote response.",
      "INVALID_QUOTE_RESPONSE",
    );
  const quotedAt = new Date();
  const requestAssumptions = {
    ...input,
    destinationCountry: country,
    originCountry: input.originCountry ?? "TR",
    kgDesi: kgDesi.toString(),
  };
  const payloadHash = stableHash(raw);
  return parsed.data.data.prices.map((price) => {
    const estimatedPrice = decimalFromApi(
      price.totalPriceWithAdditionalFee ?? price.totalPrice,
    );
    return {
      localOrderId: input.localOrderId,
      packageProfileId: input.packageProfileId,
      originCountry: input.originCountry ?? "TR",
      destinationCountry: country,
      destinationPostalCodePartial: partialPostalCode(
        input.destinationPostalCode,
      ),
      weightBand: kgDesi.toFixed(3),
      carrier: price.serviceName || price.clearServiceName,
      serviceCode: price.serviceName || price.clearServiceName,
      serviceName: price.clearServiceName || price.serviceName,
      incoterm: "UNKNOWN",
      estimatedPrice: estimatedPrice.toString(),
      currency: price.currency,
      fuelCost: decimalFromApi(price.fuelCost).toString(),
      additionalFee: decimalFromApi(price.additionalFee).toString(),
      additionalFeeDescription: price.additionalFeeDescription,
      quotePayloadHash: payloadHash,
      requestAssumptionsJson: requestAssumptions,
      quotedAt,
      expiresAt: input.expiresInHours
        ? new Date(quotedAt.getTime() + input.expiresInHours * 3_600_000)
        : null,
    };
  });
}

export async function retrieveAndPersistShipEntegraQuotes(
  input: QuoteInput,
  transport?: ShipEntegraTransport,
) {
  await requireAdminApi();
  const quotes = await retrieveShipEntegraQuotes(input, transport);
  const persisted = [];
  for (const quote of quotes) {
    persisted.push(
      await prisma.shipEntegraQuote.upsert({
        where: {
          quotePayloadHash_serviceCode: {
            quotePayloadHash: quote.quotePayloadHash,
            serviceCode: quote.serviceCode,
          },
        },
        update: { ...quote, source: "SHIPENTEGRA_ESTIMATE" },
        create: { ...quote, source: "SHIPENTEGRA_ESTIMATE" },
      }),
    );
  }
  return persisted;
}

export function isQuoteExpired(
  expiresAt: Date | null | undefined,
  now = new Date(),
) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

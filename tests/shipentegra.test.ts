import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { allPricesResponseSchema, shipmentRequestSchema, trackingResponseSchema } from "@/lib/shipentegra/schemas";
import { calculateKgDesi, isQuoteExpired, retrieveShipEntegraQuotes } from "@/lib/shipentegra/quotes";
import { assertExplicitShipmentConfirmation } from "@/lib/shipentegra/shipments";
import { redactShipEntegraValue } from "@/lib/shipentegra/errors";
import { stableHash, trackingEventId } from "@/lib/shipentegra/mappers";
import { businessConsistencyWarnings, shippingReconciliation } from "@/lib/business/consistency";

const quoteResponse = {
  status: "success", time: "2026-07-16 12:00:00", code: 1000,
  data: { bestCarrier: "shipentegra-express", uniqueCode: "Q1", prices: [{ cargoPrice: 10, fuelCost: 2, totalPrice: 12, serviceType: "EXPRESS", serviceName: "shipentegra-express", clearServiceName: "ShipEntegra Express", currency: "USD", additionalFee: 3, additionalFeeDescription: "peak", totalPriceWithAdditionalFee: 15 }] },
};

describe("ShipEntegra planning safety", () => {
  it("validates documented quote responses", () => expect(allPricesResponseSchema.parse(quoteResponse).data.prices).toHaveLength(1));
  it("rejects unsupported quote service shapes", () => expect(() => allPricesResponseSchema.parse({ ...quoteResponse, data: { prices: [{ serviceType: "SAME_DAY" }] } })).toThrow());
  it("uses Decimal for billable kg/desi", () => expect(calculateKgDesi({ lengthCm: "40", widthCm: "30", heightCm: "7", actualWeightKg: "1" }).toString()).toBe("1.68"));
  it("recognizes quote expiry", () => expect(isQuoteExpired(new Date("2026-01-01"), new Date("2026-01-02"))).toBe(true));
  it("maps DDP to UNKNOWN when the quote response does not expose it", async () => {
    const fetcher = async () => new Response(JSON.stringify(quoteResponse), { status: 200, headers: { "content-type": "application/json" } });
    const quotes = await retrieveShipEntegraQuotes({ destinationCountry: "US", lengthCm: "40", widthCm: "30", heightCm: "7", actualWeightKg: "1" }, { fetcher: fetcher as typeof fetch, accessToken: "test", baseUrl: "https://example.test" });
    expect(quotes[0]).toMatchObject({ incoterm: "UNKNOWN", estimatedPrice: "15", fuelCost: "2", additionalFee: "3" });
  });
  it("requires explicit confirmation before any shipment mutation", () => expect(() => assertExplicitShipmentConfirmation({ confirmed: false })).toThrow(/confirmation/i));
  it("validates the documented multi-package shipment request", () => expect(shipmentRequestSchema.safeParse({}).success).toBe(false));
  it("validates tracking responses and produces idempotency keys", () => {
    const raw = { status: "success", time: "now", code: 1000, data: { trackingNumber: "T1", activities: [{ date: "2026-01-01", event: "Accepted" }] } };
    expect(trackingResponseSchema.parse(raw).data.activities).toHaveLength(1);
    expect(trackingEventId("T1", "2026-01-01", "Accepted")).toBe(trackingEventId("T1", "2026-01-01", "Accepted"));
  });
  it("redacts API secrets recursively", () => expect(redactShipEntegraValue({ clientSecret: "x", nested: { authorization: "Bearer y" } })).toEqual({ clientSecret: "[REDACTED]", nested: { authorization: "[REDACTED]" } }));
  it("keeps credentials server-only", async () => {
    const env = await readFile(path.join(process.cwd(), "lib/env.ts"), "utf8");
    const pages = (await Promise.all(["app/shipentegra/page.tsx", "app/settings/shipentegra/page.tsx"].map((file) => readFile(path.join(process.cwd(), file), "utf8")))).join("\n");
    expect(env).toContain("SHIPENTEGRA_CLIENT_SECRET"); expect(pages).not.toContain("SHIPENTEGRA_CLIENT_SECRET");
  });
  it("has no sandbox runtime path and uses only the production API host", async () => {
    const [env, endpoints, config] = await Promise.all([
      readFile(path.join(process.cwd(), "lib/env.ts"), "utf8"),
      readFile(path.join(process.cwd(), "lib/shipentegra/endpoints.ts"), "utf8"),
      readFile(path.join(process.cwd(), "lib/shipentegra/config.ts"), "utf8"),
    ]);
    expect(env).toContain('z.enum(["production"])');
    expect(endpoints).toContain("https://publicapi.shipentegra.com/v1");
    expect(endpoints.toLowerCase()).not.toContain("sandbox");
    expect(config).toContain('environment: "PRODUCTION"');
  });
  it("documents confidential order-level IOSS handling", async () => {
    const supportRequest = await readFile(path.join(process.cwd(), "docs/SHIPENTEGRA_SUPPORT_REQUEST.md"), "utf8");
    expect(supportRequest).toContain("vatNumber");
    expect(supportRequest).toContain("iossNumber");
    expect(supportRequest).toContain("do not persist it in logs");
  });
  it("hashes objects independent of property order", () => expect(stableHash({ a: 1, b: { d: 2, c: 3 } })).toBe(stableHash({ b: { c: 3, d: 2 }, a: 1 })));
});

describe("sole proprietorship safeguards", () => {
  it("reports identity consistency gaps without deciding legal treatment", () => expect(businessConsistencyWarnings({ ownerFullName: "Hamit Can Arslan", etsyLegalSellerName: "Other", bankAccountHolderName: "Hamit Can Arslan", exporterName: "Hamit Can Arslan", invoiceIssuerName: "Hamit Can Arslan", shipEntegraAccountHolderName: "Hamit Can Arslan", status: "ACTIVE", taxOffice: null, etgbEnabled: true, customsRegistrationStatus: "UNKNOWN", accountantConfirmationStatus: "UNKNOWN" })).toHaveLength(5));
  it("reconciles actual shipping without mutating the estimate", () => { const result = shippingReconciliation("10", "12"); expect(result.estimated.toString()).toBe("10"); expect(result.variance.toString()).toBe("2"); expect(result.variancePercentage?.toString()).toBe("20"); });
});

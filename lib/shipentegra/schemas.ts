import "server-only";
import { z } from "zod";

const apiStatus = z.enum(["success", "fail", "error"]);
const apiBase = { status: apiStatus, time: z.string(), code: z.number() };

export const tokenResponseSchema = z.object({
  ...apiBase,
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string(),
    tokenType: z.literal("bearer"),
    accessTokenValidity: z.string(),
  }),
});

export const quoteRequestSchema = z.object({
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  kgDesi: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .refine((v) => Number(v) >= 0.01 && Number(v) <= 100000),
});

export const allPricesResponseSchema = z.object({
  ...apiBase,
  data: z.object({
    generalInfo: z.string().optional(),
    bestCarrier: z.string().optional(),
    uniqueCode: z.string().optional(),
    prices: z
      .array(
        z.object({
          cargoPrice: z.number().optional().default(0),
          fuelCost: z.number().optional().default(0),
          totalPrice: z.number().optional().default(0),
          serviceType: z.enum(["EXPRESS", "ECO"]).optional(),
          serviceName: z.string().optional().default(""),
          clearServiceName: z.string().optional().default(""),
          additionalDescription: z.string().optional(),
          pricing: z.string().optional(),
          fuelMultiplier: z.number().optional(),
          tooltip: z.string().optional(),
          discount: z.number().optional(),
          discountedCargoPrice: z.number().optional(),
          currency: z.string().optional().default("USD"),
          additionalFee: z.number().optional().default(0),
          additionalFeeDescription: z.string().optional(),
          totalPriceWithAdditionalFee: z.number().optional(),
        }),
      )
      .default([]),
  }),
});

export const carriersResponseSchema = z.object({
  ...apiBase,
  data: z.array(
    z.object({
      title: z.string(),
      value: z.string(),
      info: z
        .object({
          url: z.string(),
          specialService: z.union([z.string(), z.number()]).optional(),
        })
        .optional(),
    }),
  ),
});

const partySchema = z.object({
  name: z.string().min(2).max(50),
  address1: z.string().min(5).max(35),
  address2: z.string().max(35).optional(),
  city: z.string().min(2).max(35),
  state: z.string().max(35).optional(),
  zipCode: z.string().min(1).max(15),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  phone: z.string().max(32).optional(),
  email: z.string().email().max(60).optional(),
});

export const shipmentRequestSchema = z.object({
  currency: z.enum([
    "USD",
    "EUR",
    "GBP",
    "SAR",
    "AED",
    "AUD",
    "CAD",
    "KWD",
    "CHF",
    "SEK",
    "NOK",
    "TRY",
  ]),
  description: z.string().min(1),
  vatNumber: z.string().optional(),
  orderNumber: z.string().min(1),
  reference: z.string().max(48).optional(),
  exportReason: z.string().max(16),
  shippingType: z.number().int().min(1).max(7),
  shipTo: partySchema,
  shipFrom: partySchema.extend({ country: z.literal("TR") }),
  products: z
    .array(
      z.object({
        name: z.string().min(2).max(512),
        quantity: z.number().int().min(1).max(100000),
        unitPrice: z.string().regex(/^\d+(\.\d+)?$/),
        lineItemKey: z.string().min(1).max(64).optional(),
        hsCode: z.string().min(6).max(20).optional(),
        sku: z.string().max(64).optional(),
      }),
    )
    .min(1)
    .max(50),
  packages: z
    .array(
      z.object({
        width: z.number().int().min(1).max(300),
        height: z.number().int().min(1).max(300),
        length: z.number().int().min(1).max(300),
        weight: z.string().regex(/^\d+(\.\d+)?$/),
        packageQuantity: z.number().int().min(1).max(200),
      }),
    )
    .min(1)
    .max(200),
});

export const createShipmentResponseSchema = z.object({
  ...apiBase,
  data: z.object({
    success: z.boolean(),
    orderId: z.number().int().positive(),
    description: z.string(),
  }),
});

export const labelRequestSchema = z.object({
  orderId: z.number().int().positive(),
  specialService: z.string().optional(),
  verpackg: z.union([z.literal(-1), z.literal(1), z.literal(2)]).optional(),
  insurance: z.boolean().optional(),
  content: z.string().max(50).optional(),
  weight: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
  currency: z.string().length(3).optional(),
  items: z
    .array(
      z.object({
        itemId: z.number().int(),
        declaredPrice: z.string().regex(/^\d+(\.\d+)?$/),
        declaredQuantity: z.number().int().positive(),
        gtip: z.string().min(6).max(20).optional(),
      }),
    )
    .max(100)
    .optional(),
});

export const labelResponseSchema = z.object({
  ...apiBase,
  data: z.object({
    success: z.boolean(),
    orderId: z.number().int().positive(),
    message: z.string(),
    label: z.string().url().optional(),
    invoice: z.string().url().optional(),
    trackingNumber: z.string().optional(),
  }),
});

export const trackingResponseSchema = z.object({
  ...apiBase,
  data: z.object({
    status: z.string().optional(),
    deliveryDate: z.string().optional(),
    destinationCountry: z.string().optional(),
    summary: z.string().optional(),
    trackingNumber: z.string().optional(),
    lastMileTrackingNumber: z.string().optional(),
    lastMileCarrier: z.string().optional(),
    activities: z
      .array(z.object({ date: z.string(), event: z.string() }))
      .optional()
      .default([]),
  }),
});

export const logisticsFilesResponseSchema = z.object({
  status: apiStatus,
  time: z.string(),
  data: z.array(
    z.object({
      id: z.number().int(),
      orderId: z.number().int(),
      fileUri: z.string(),
      type: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(99),
      ]),
      createdAt: z.string(),
    }),
  ),
});

export type ShipmentRequest = z.infer<typeof shipmentRequestSchema>;
export type LabelRequest = z.infer<typeof labelRequestSchema>;

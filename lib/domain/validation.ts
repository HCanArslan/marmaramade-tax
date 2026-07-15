import { z } from "zod";

const nonNegative = z.coerce.number().min(0);
const positive = z.coerce.number().positive();
const percentage = z.coerce.number().min(0).max(100);

export const calculatorSchema = z.object({
  itemSubtotalUsd: nonNegative,
  usdTryRate: positive,
  materialCostTry: nonNegative,
  laborHours: nonNegative,
  laborHourlyRateTry: nonNegative,
  internationalShippingUsd: nonNegative,
  customsDutyUsd: nonNegative,
  additionalTariffUsd: nonNegative,
  returnReserveRate: percentage,
  damageReserveRate: percentage,
  taxReserveRate: percentage,
});

export const packageSchema = z.object({ lengthCm: positive, widthCm: positive, heightCm: positive, actualWeightKg: positive, volumetricDivisor: positive });
export const effectiveRangeSchema = z.object({ effectiveFrom: z.coerce.date(), effectiveTo: z.coerce.date().nullable() }).refine((value) => !value.effectiveTo || value.effectiveFrom < value.effectiveTo, { message: "effectiveFrom must precede effectiveTo" });

import "server-only";
import Decimal from "decimal.js";
import { createHash } from "node:crypto";

export function stableHash(value: unknown) {
  const canonicalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonicalize);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, canonicalize(child)]),
      );
    return item;
  };
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function decimalFromApi(value: number | string) {
  return new Decimal(String(value));
}

export function partialPostalCode(value?: string) {
  if (!value) return null;
  const compact = value.trim().toUpperCase();
  return compact.length <= 3 ? compact : `${compact.slice(0, 3)}***`;
}

export function trackingEventId(
  trackingNumber: string,
  date: string,
  event: string,
) {
  return createHash("sha256")
    .update(`${trackingNumber}|${date}|${event}`)
    .digest("hex");
}

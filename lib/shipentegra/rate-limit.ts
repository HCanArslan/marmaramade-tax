import "server-only";
import { ShipEntegraError } from "./errors";

export function retryDelayMs(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter))
    return Math.min(Number(retryAfter) * 1000, 60_000);
  return Math.min(500 * 2 ** attempt, 8_000);
}

export function assertNotRateLimited(response: Response) {
  if (response.status === 429)
    throw new ShipEntegraError(
      "ShipEntegra rate limit reached. Try again later.",
      "RATE_LIMIT",
      429,
      true,
    );
}

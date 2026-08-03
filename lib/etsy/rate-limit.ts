import { EtsyApiError } from "@/lib/etsy/errors";
export type EtsyRateLimitState = {
  qpsLimit: number | null;
  qpsRemaining: number | null;
  dailyLimit: number | null;
  dailyRemaining: number | null;
  retryAfterSeconds: number | null;
  observedAt: string;
};

const integerHeader = (headers: Headers, ...names: string[]) => {
  for (const name of names) {
    const value = headers.get(name);
    if (value != null && /^\d+$/.test(value)) return Number(value);
  }
  return null;
};

export function readEtsyRateLimitHeaders(headers: Headers): EtsyRateLimitState {
  return {
    qpsLimit: integerHeader(headers, "x-limit-per-second"),
    qpsRemaining: integerHeader(headers, "x-remaining-this-second", "x-remaining-this-secon"),
    dailyLimit: integerHeader(headers, "x-limit-per-day"),
    dailyRemaining: integerHeader(headers, "x-remaining-today"),
    retryAfterSeconds: integerHeader(headers, "retry-after"),
    observedAt: new Date().toISOString(),
  };
}

export function etsyBackoffMs(attempt: number, retryAfterSeconds: number | null, random = Math.random) {
  if (retryAfterSeconds != null) return Math.min(retryAfterSeconds * 1000, 15 * 60_000);
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  return Math.round(base * (0.75 + random() * 0.5));
}

export async function withEtsyRetry<T>(operation: () => Promise<T>, options: { attempts?: number; sleep?: (ms: number) => Promise<void>; random?: () => number } = {}) {
  const attempts = options.attempts ?? 4; const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (!(error instanceof EtsyApiError) || !error.retryable || attempt === attempts - 1) throw error;
      await sleep(etsyBackoffMs(attempt, error.retryAfterSeconds, options.random));
    }
  }
  throw lastError;
}

import { EtsyApiError } from "@/lib/etsy/errors";
export async function withEtsyRetry<T>(operation: () => Promise<T>, options: { attempts?: number; sleep?: (ms: number) => Promise<void> } = {}) {
  const attempts = options.attempts ?? 4; const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (!(error instanceof EtsyApiError) || !error.retryable || attempt === attempts - 1) throw error;
      const seconds = error.retryAfterSeconds ?? Math.min(2 ** attempt, 30);
      await sleep(seconds * 1000);
    }
  }
  throw lastError;
}

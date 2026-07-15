import "server-only";
import { EtsyApiError } from "@/lib/etsy/errors";

const ALLOWED_ORIGINS = new Set(["https://api.etsy.com", "https://openapi.etsy.com"]);
export interface EtsyGetOptions { accessToken: string; apiKeyString: string; sharedSecret: string; signal?: AbortSignal; fetcher?: typeof fetch; }

export async function etsyGet<T>(urlOrPath: string, options: EtsyGetOptions): Promise<{ data: T; headers: Headers }> {
  const url = new URL(urlOrPath, "https://api.etsy.com/v3/application/");
  if (!ALLOWED_ORIGINS.has(url.origin) || !url.pathname.startsWith("/v3/")) throw new Error("Unapproved Etsy API URL.");
  const response = await (options.fetcher || fetch)(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${options.accessToken}`, "x-api-key": `${options.apiKeyString}:${options.sharedSecret}`, Accept: "application/json" },
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok) throw await EtsyApiError.fromResponse(response, url.pathname);
  return { data: await response.json() as T, headers: response.headers };
}

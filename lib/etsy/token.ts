import "server-only";
import { z } from "zod";

const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().int().positive(), token_type: z.literal("Bearer") });
export type EtsyTokenResponse = z.infer<typeof tokenSchema>;
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

export class EtsyOAuthTokenError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`Etsy OAuth token request failed (${status}).`);
    this.name = "EtsyOAuthTokenError";
  }
  get requiresReauthorization() {
    return this.code === "invalid_grant" || this.code === "invalid_token";
  }
}

// Etsy requires POST only for OAuth code exchange and refresh. This module is the sole exception to the GET-only marketplace rule.
async function oauthTokenPost(body: URLSearchParams, fetcher: typeof fetch = fetch): Promise<EtsyTokenResponse> {
  const response = await fetcher(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    let code = "oauth_error";
    try {
      const payload = await response.json() as { error?: unknown };
      if (typeof payload.error === "string" && /^[a-z_]+$/.test(payload.error)) code = payload.error;
    } catch {}
    throw new EtsyOAuthTokenError(response.status, code);
  }
  return tokenSchema.parse(await response.json());
}

export function exchangeAuthorizationCode(input: { clientId: string; redirectUri: string; code: string; verifier: string }, fetcher?: typeof fetch) {
  return oauthTokenPost(new URLSearchParams({ grant_type: "authorization_code", client_id: input.clientId, redirect_uri: input.redirectUri, code: input.code, code_verifier: input.verifier }), fetcher);
}
export function refreshAccessToken(input: { clientId: string; refreshToken: string }, fetcher?: typeof fetch) {
  return oauthTokenPost(new URLSearchParams({ grant_type: "refresh_token", client_id: input.clientId, refresh_token: input.refreshToken }), fetcher);
}

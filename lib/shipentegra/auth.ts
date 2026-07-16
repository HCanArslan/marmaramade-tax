import "server-only";
import { requireShipEntegraSecrets } from "@/lib/env";
import {
  SHIPENTEGRA_PRODUCTION_SERVER,
  shipEntegraEndpoints,
} from "./endpoints";
import { ShipEntegraError } from "./errors";
import { tokenResponseSchema } from "./schemas";

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | undefined;

export async function obtainShipEntegraAccessToken(
  fetcher: typeof fetch = fetch,
) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000)
    return tokenCache.token;
  const env = requireShipEntegraSecrets();
  const response = await fetcher(
    `${SHIPENTEGRA_PRODUCTION_SERVER}${shipEntegraEndpoints.token}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        clientId: env.SHIPENTEGRA_CLIENT_ID,
        clientSecret: env.SHIPENTEGRA_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(env.SHIPENTEGRA_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new ShipEntegraError(
      "ShipEntegra credentials were rejected.",
      "AUTH_FAILED",
      response.status,
    );
  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.status !== "success")
    throw new ShipEntegraError(
      "ShipEntegra returned an invalid authentication response.",
      "INVALID_AUTH_RESPONSE",
      response.status,
    );
  const validity = Number.parseInt(parsed.data.data.accessTokenValidity, 10);
  tokenCache = {
    token: parsed.data.data.accessToken,
    expiresAt:
      Date.now() + (Number.isFinite(validity) ? validity * 1000 : 5 * 60_000),
  };
  return tokenCache.token;
}

export function resetShipEntegraTokenForTests() {
  tokenCache = undefined;
}

import "server-only";
import { requireEtsySecrets } from "@/lib/env";
import { createOAuthState, createPkcePair, hashOAuthState } from "@/lib/etsy/pkce";
import { decryptToken, encryptToken } from "@/lib/etsy/encryption";
import { EtsyOAuthTokenError, exchangeAuthorizationCode, refreshAccessToken } from "@/lib/etsy/token";
import { assertReadOnlyEtsyScopes, assertSameReadOnlyScopes, getConfiguredScopes } from "@/lib/etsy/scopes";
import { etsyGet } from "@/lib/etsy/client";
import { resolveWorkspaceContextForUser, type WorkspaceContext } from "@/lib/server/auth/workspace-context";
import {
  acquireTokenRefreshLease,
  commitTokenRefresh,
  consumeWorkspaceOAuthState,
  createWorkspaceOAuthState,
  failTokenRefresh,
  findEtsyConnectionForToken,
  listWorkspaceEtsyConnections,
  persistWorkspaceEtsyConnection,
  setEtsyConnectionState,
} from "@/lib/server/repositories/etsy-repository";
import { assertExactOAuthCallback, normalizeSafeRedirectPath } from "@/lib/etsy/oauth-security";

export function assertUsableOAuthState(record: { consumedAt: Date | null; expiresAt: Date } | null, now = new Date()): asserts record is { consumedAt: null; expiresAt: Date } {
  if (!record || record.consumedAt || record.expiresAt <= now) throw new Error("OAuth state is missing, expired, reused, or invalid.");
}
export function tokenNeedsRefresh(expiresAt: Date, now = Date.now()) { return expiresAt.getTime() <= now + 5 * 60_000; }

export async function beginEtsyOAuth(context: WorkspaceContext, input: { shopId?: string | null; redirectPath?: string | null } = {}) {
  const env = requireEtsySecrets(); const state = createOAuthState(); const { verifier, challenge } = createPkcePair();
  const scopes = getConfiguredScopes();
  await createWorkspaceOAuthState(context, {
    stateHash: hashOAuthState(state),
    encryptedVerifier: encryptToken(verifier, env.TOKEN_ENCRYPTION_KEY),
    redirectUri: env.ETSY_REDIRECT_URI,
    redirectPath: normalizeSafeRedirectPath(input.redirectPath),
    requestedScopes: scopes.join(" "),
    intendedShopId: input.shopId,
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });
  const url = new URL("https://www.etsy.com/oauth/connect");
  url.search = new URLSearchParams({ response_type: "code", client_id: env.ETSY_API_KEYSTRING, redirect_uri: env.ETSY_REDIRECT_URI, scope: scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  return url;
}

export async function consumeOAuthState(state: string, currentUserId?: string | null) {
  const env = requireEtsySecrets(); const stateHash = hashOAuthState(state); const now = new Date();
  const record = await consumeWorkspaceOAuthState(stateHash, now, currentUserId);
  return {
    verifier: decryptToken(record.verifier, env.TOKEN_ENCRYPTION_KEY),
    redirectUri: record.redirectUri,
    redirectPath: normalizeSafeRedirectPath(record.redirectPath),
    workspaceId: record.workspaceId!,
    userId: record.userId!,
    intendedShopId: record.shopId,
    intendedExternalShopId: record.shop?.externalShopId,
    requestedScopes: record.requestedScopes,
  };
}

export async function completeEtsyOAuth(code: string, state: string, currentUserId?: string | null) {
  const env = requireEtsySecrets(); const pending = await consumeOAuthState(state, currentUserId);
  assertExactOAuthCallback(pending.redirectUri, env.ETSY_REDIRECT_URI);
  const scopes = assertSameReadOnlyScopes(pending.requestedScopes, getConfiguredScopes());
  const tokens = await exchangeAuthorizationCode({ clientId: env.ETSY_API_KEYSTRING, redirectUri: pending.redirectUri, code, verifier: pending.verifier });
  const etsyUserId = tokens.access_token.split(".")[0];
  if (!etsyUserId) throw new Error("Etsy user identifier was not returned.");
  const shopResponse = await etsyGet<{ results?: Array<{ shop_id: number; shop_name?: string }>; shop_id?: number; shop_name?: string }>(`users/${etsyUserId}/shops`, { accessToken: tokens.access_token, apiKeyString: env.ETSY_API_KEYSTRING, sharedSecret: env.ETSY_SHARED_SECRET });
  const shop = pending.intendedExternalShopId
    ? shopResponse.data.results?.find((candidate) => String(candidate.shop_id) === pending.intendedExternalShopId)
    : shopResponse.data.results?.[0] || shopResponse.data;
  if (!shop?.shop_id) throw new Error("No Etsy shop was found for this account.");
  await resolveWorkspaceContextForUser(pending.userId, pending.workspaceId);
  const persisted = await persistWorkspaceEtsyConnection({
    workspaceId: pending.workspaceId,
    intendedShopId: pending.intendedShopId,
    externalShopId: String(shop.shop_id),
    etsyUserId,
    shopName: shop.shop_name || "Etsy shop",
    encryptedAccessToken: encryptToken(tokens.access_token, env.TOKEN_ENCRYPTION_KEY),
    encryptedRefreshToken: encryptToken(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY),
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scopes: scopes.join(" "),
  });
  return { ...persisted, redirectPath: pending.redirectPath, userId: pending.userId };
}

export async function getActiveConnection(context: WorkspaceContext) {
  const connections = await listWorkspaceEtsyConnections(context);
  return connections.find((connection) => connection.status === "ACTIVE") ?? null;
}

export async function getValidAccessToken(connectionId: string, options: { forceRefresh?: boolean } = {}) {
  const env = requireEtsySecrets(); const connection = await findEtsyConnectionForToken(connectionId);
  if (!connection) throw new Error("Etsy connection is unavailable.");
  if (connection.status !== "ACTIVE") throw new Error("Etsy connection is not active.");
  try { assertReadOnlyEtsyScopes(connection.scopes.split(/\s+/).filter(Boolean)); }
  catch { await setEtsyConnectionState(connection.id, "SCOPE_VIOLATION"); throw new Error("Etsy connection scopes are invalid."); }
  if (!options.forceRefresh && !tokenNeedsRefresh(connection.accessTokenExpiresAt)) return decryptToken(connection.encryptedAccessToken, env.TOKEN_ENCRYPTION_KEY);
  const leaseId = await acquireTokenRefreshLease(connection.id, connection.tokenVersion);
  if (!leaseId) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const latest = await findEtsyConnectionForToken(connection.id);
      if (latest && latest.tokenVersion !== connection.tokenVersion && !tokenNeedsRefresh(latest.accessTokenExpiresAt)) {
        return decryptToken(latest.encryptedAccessToken, env.TOKEN_ENCRYPTION_KEY);
      }
    }
    throw new Error("Etsy token refresh is already in progress.");
  }
  try {
    const refreshed = await refreshAccessToken({ clientId: env.ETSY_API_KEYSTRING, refreshToken: decryptToken(connection.encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY) });
    const committed = await commitTokenRefresh({
      connectionId: connection.id,
      leaseId,
      expectedTokenVersion: connection.tokenVersion,
      encryptedAccessToken: encryptToken(refreshed.access_token, env.TOKEN_ENCRYPTION_KEY),
      encryptedRefreshToken: encryptToken(refreshed.refresh_token, env.TOKEN_ENCRYPTION_KEY),
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    });
    if (!committed) throw new Error("A newer Etsy token refresh already completed.");
    return refreshed.access_token;
  } catch (error) {
    const state = error instanceof EtsyOAuthTokenError && error.requiresReauthorization ? "REAUTH_REQUIRED" : "ERROR";
    const code = error instanceof EtsyOAuthTokenError ? error.code : "refresh_failed";
    await failTokenRefresh(connection.id, leaseId, state, code);
    throw error;
  }
}

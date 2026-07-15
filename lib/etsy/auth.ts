import "server-only";
import { prisma } from "@/lib/prisma";
import { requireEtsySecrets } from "@/lib/env";
import { createOAuthState, createPkcePair, hashOAuthState } from "@/lib/etsy/pkce";
import { decryptToken, encryptToken } from "@/lib/etsy/encryption";
import { exchangeAuthorizationCode, refreshAccessToken } from "@/lib/etsy/token";
import { getConfiguredScopes } from "@/lib/etsy/scopes";
import { etsyGet } from "@/lib/etsy/client";

export function assertUsableOAuthState(record: { consumedAt: Date | null; expiresAt: Date } | null, now = new Date()): asserts record is { consumedAt: null; expiresAt: Date } {
  if (!record || record.consumedAt || record.expiresAt <= now) throw new Error("OAuth state is missing, expired, reused, or invalid.");
}
export function tokenNeedsRefresh(expiresAt: Date, now = Date.now()) { return expiresAt.getTime() <= now + 5 * 60_000; }

export async function beginEtsyOAuth() {
  const env = requireEtsySecrets(); const state = createOAuthState(); const { verifier, challenge } = createPkcePair();
  await prisma.etsyOAuthState.create({ data: { stateHash: hashOAuthState(state), verifier: encryptToken(verifier, env.TOKEN_ENCRYPTION_KEY), redirectUri: env.ETSY_REDIRECT_URI, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  const url = new URL("https://www.etsy.com/oauth/connect");
  url.search = new URLSearchParams({ response_type: "code", client_id: env.ETSY_API_KEYSTRING, redirect_uri: env.ETSY_REDIRECT_URI, scope: getConfiguredScopes().join(" "), state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  return url;
}

export async function consumeOAuthState(state: string) {
  const env = requireEtsySecrets(); const stateHash = hashOAuthState(state); const now = new Date();
  return prisma.$transaction(async (tx) => {
    const record = await tx.etsyOAuthState.findUnique({ where: { stateHash } });
    assertUsableOAuthState(record, now);
    const claimed = await tx.etsyOAuthState.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
    if (claimed.count !== 1) throw new Error("OAuth state has already been used.");
    return { verifier: decryptToken(record.verifier, env.TOKEN_ENCRYPTION_KEY), redirectUri: record.redirectUri };
  });
}

export async function completeEtsyOAuth(code: string, state: string) {
  const env = requireEtsySecrets(); const pending = await consumeOAuthState(state);
  const tokens = await exchangeAuthorizationCode({ clientId: env.ETSY_API_KEYSTRING, redirectUri: pending.redirectUri, code, verifier: pending.verifier });
  const etsyUserId = tokens.access_token.split(".")[0];
  if (!etsyUserId) throw new Error("Etsy user identifier was not returned.");
  const shopResponse = await etsyGet<{ results?: Array<{ shop_id: number; shop_name?: string }>; shop_id?: number; shop_name?: string }>(`users/${etsyUserId}/shops`, { accessToken: tokens.access_token, apiKeyString: env.ETSY_API_KEYSTRING, sharedSecret: env.ETSY_SHARED_SECRET });
  const shop = shopResponse.data.results?.[0] || shopResponse.data;
  if (!shop.shop_id) throw new Error("No Etsy shop was found for this account.");
  const scopes = getConfiguredScopes().join(" ");
  return prisma.$transaction(async (tx) => {
    await tx.etsyConnection.updateMany({ where: { status: "ACTIVE" }, data: { status: "DISCONNECTED", disconnectedAt: new Date() } });
    return tx.etsyConnection.upsert({ where: { shopId: String(shop.shop_id) }, update: { etsyUserId, shopName: shop.shop_name, encryptedAccessToken: encryptToken(tokens.access_token, env.TOKEN_ENCRYPTION_KEY), encryptedRefreshToken: encryptToken(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY), accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000), scopes, status: "ACTIVE", disconnectedAt: null, connectedAt: new Date() }, create: { shopId: String(shop.shop_id), etsyUserId, shopName: shop.shop_name, encryptedAccessToken: encryptToken(tokens.access_token, env.TOKEN_ENCRYPTION_KEY), encryptedRefreshToken: encryptToken(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY), accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000), scopes } });
  });
}

export async function getActiveConnection() { return prisma.etsyConnection.findFirst({ where: { status: "ACTIVE" }, orderBy: { connectedAt: "desc" } }); }

export async function getValidAccessToken(connectionId: string) {
  const env = requireEtsySecrets(); const connection = await prisma.etsyConnection.findUniqueOrThrow({ where: { id: connectionId } });
  if (connection.status !== "ACTIVE") throw new Error("Etsy connection is not active.");
  if (!tokenNeedsRefresh(connection.accessTokenExpiresAt)) return decryptToken(connection.encryptedAccessToken, env.TOKEN_ENCRYPTION_KEY);
  const refreshed = await refreshAccessToken({ clientId: env.ETSY_API_KEYSTRING, refreshToken: decryptToken(connection.encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY) });
  await prisma.etsyConnection.update({ where: { id: connection.id }, data: { encryptedAccessToken: encryptToken(refreshed.access_token, env.TOKEN_ENCRYPTION_KEY), encryptedRefreshToken: encryptToken(refreshed.refresh_token, env.TOKEN_ENCRYPTION_KEY), accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000), lastRefreshedAt: new Date() } });
  return refreshed.access_token;
}

export const ALLOWED_ETSY_SCOPES = ["shops_r", "listings_r", "transactions_r"] as const;
export type AllowedEtsyScope = (typeof ALLOWED_ETSY_SCOPES)[number];

export function assertReadOnlyEtsyScopes(scopes: readonly string[]): asserts scopes is readonly AllowedEtsyScope[] {
  const allowed = new Set<string>(ALLOWED_ETSY_SCOPES);
  const invalid = scopes.filter((scope) => scope.endsWith("_w") || !allowed.has(scope));
  if (invalid.length || scopes.length === 0) throw new Error("Etsy scopes must contain only the approved read-only scopes.");
}

export function getConfiguredScopes(value = process.env.ETSY_SCOPES || ALLOWED_ETSY_SCOPES.join(" ")) {
  const scopes = value.split(/\s+/).filter(Boolean);
  assertReadOnlyEtsyScopes(scopes);
  return scopes;
}

export function normalizeEtsyScopes(value: string | readonly string[]) {
  const scopes = typeof value === "string"
    ? value.split(/\s+/).filter(Boolean)
    : [...value];
  assertReadOnlyEtsyScopes(scopes);
  return [...new Set(scopes)].sort();
}

export function assertSameReadOnlyScopes(
  requested: string | readonly string[],
  granted: string | readonly string[],
) {
  const left = normalizeEtsyScopes(requested);
  const right = normalizeEtsyScopes(granted);
  if (left.join(" ") !== right.join(" ")) {
    throw new Error("Etsy granted scopes do not match the approved request.");
  }
  return right;
}

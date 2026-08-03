export function normalizeSafeRedirectPath(value: string | null | undefined) {
  const fallback = "/app/settings/etsy";
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://marmaraledge.invalid");
    if (parsed.origin !== "https://marmaraledge.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function assertExactOAuthCallback(stored: string, configured: string) {
  if (stored !== configured) throw new Error("OAuth callback binding is invalid.");
}

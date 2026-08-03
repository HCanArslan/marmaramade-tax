const allowedApplicationPaths = ["/app", "/workspace"] as const;
const allowedFounderPaths = ["/ledger"] as const;

function isWithin(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function safeAuthCallbackPath(
  value: string | null | undefined,
  options: { founder?: boolean } = {},
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  let parsed: URL;
  try {
    parsed = new URL(value, "https://callback.invalid");
  } catch {
    return "/app";
  }
  if (parsed.origin !== "https://callback.invalid") return "/app";
  if (allowedApplicationPaths.some((root) => isWithin(parsed.pathname, root))) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  if (
    options.founder &&
    allowedFounderPaths.some((root) => isWithin(parsed.pathname, root))
  ) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  return "/app";
}

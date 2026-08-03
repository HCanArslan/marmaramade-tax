export function normalizePostgresSslMode(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const isPostgres =
      url.protocol === "postgresql:" || url.protocol === "postgres:";
    const isNeon =
      url.hostname === "neon.tech" || url.hostname.endsWith(".neon.tech");
    if (
      isPostgres &&
      isNeon &&
      url.searchParams.get("sslmode") === "require"
    ) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Environment validation reports malformed URLs without echoing secrets.
  }
  return connectionString;
}

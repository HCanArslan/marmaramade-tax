const sensitiveKeys = /password|token|secret|authorization|email|address|phone|name/i;
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sensitiveKeys.test(key) ? "[REDACTED]" : redactSensitive(child)]));
  return value;
}
export function safeError(error: unknown) { return { name: error instanceof Error ? error.name : "Error", message: "The operation could not be completed." }; }

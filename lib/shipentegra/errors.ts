import "server-only";

const SECRET_KEYS =
  /authorization|bearer|clientsecret|client_secret|accessToken|refreshToken/i;

export class ShipEntegraError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ShipEntegraError";
  }
}

export function redactShipEntegraValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactShipEntegraValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SECRET_KEYS.test(key) ? "[REDACTED]" : redactShipEntegraValue(child),
    ]),
  );
}

export function safeShipEntegraError(error: unknown) {
  if (error instanceof ShipEntegraError)
    return { message: error.message, code: error.code, status: error.status };
  return { message: "ShipEntegra request failed.", code: "UNKNOWN" };
}

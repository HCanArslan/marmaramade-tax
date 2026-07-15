export class EtsyApiError extends Error {
  constructor(readonly status: number, readonly retryAfterSeconds: number | null, message: string, readonly resource?: string) { super(message); this.name = "EtsyApiError"; }
  get retryable() { return this.status === 429 || this.status >= 500; }
  static async fromResponse(response: Response, resource?: string) {
    const retryAfter = response.headers.get("retry-after");
    const text = await response.text();
    let detail = "";
    try {
      const payload = JSON.parse(text) as { error?: unknown; message?: unknown };
      detail = String(payload.error || payload.message || "");
    } catch {
      detail = text;
    }
    detail = detail.replace(/\s+/g, " ").trim().slice(0, 300);
    const location = resource ? ` at ${resource}` : "";
    const message = `Etsy read request failed (${response.status})${location}${detail ? `: ${detail}` : "."}`;
    return new EtsyApiError(response.status, retryAfter ? Number(retryAfter) : null, message, resource);
  }
}

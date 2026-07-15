export class EtsyApiError extends Error {
  constructor(readonly status: number, readonly retryAfterSeconds: number | null, message: string) { super(message); this.name = "EtsyApiError"; }
  get retryable() { return this.status === 429 || this.status >= 500; }
  static async fromResponse(response: Response) {
    const retryAfter = response.headers.get("retry-after");
    return new EtsyApiError(response.status, retryAfter ? Number(retryAfter) : null, `Etsy read request failed (${response.status}).`);
  }
}

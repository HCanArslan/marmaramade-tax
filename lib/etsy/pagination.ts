import { createHash } from "node:crypto";

export class EtsyPaginationError extends Error {
  constructor(readonly code: "MAX_PAGES" | "REPEATED_PAGE" | "MALFORMED_PAGE") {
    super(`Etsy pagination stopped safely (${code}).`);
    this.name = "EtsyPaginationError";
  }
}

export async function collectOffsetPages<T>(fetchPage: (offset: number, limit: number) => Promise<{ count: number; results: T[] }>, options: { limit?: number; startOffset?: number; maxPages?: number; onPage?: (page: { offset: number; count: number; size: number; nextOffset: number }) => Promise<void> | void } = {}) {
  const limit = options.limit ?? 100; let offset = options.startOffset ?? 0; const results: T[] = [];
  const maxPages = options.maxPages ?? 500;
  const fingerprints = new Set<string>();
  let pages = 0;
  while (true) {
    if (pages >= maxPages) throw new EtsyPaginationError("MAX_PAGES");
    const page = await fetchPage(offset, limit);
    if (!Number.isInteger(page.count) || page.count < 0 || !Array.isArray(page.results) || page.results.length > limit) throw new EtsyPaginationError("MALFORMED_PAGE");
    const fingerprint = createHash("sha256").update(JSON.stringify(page.results)).digest("hex");
    if (page.results.length && fingerprints.has(fingerprint)) throw new EtsyPaginationError("REPEATED_PAGE");
    fingerprints.add(fingerprint);
    results.push(...page.results);
    offset += page.results.length;
    pages += 1;
    await options.onPage?.({ offset: offset - page.results.length, count: page.count, size: page.results.length, nextOffset: offset });
    if (page.results.length === 0 || offset >= page.count) return { results, nextOffset: offset, pagesProcessed: pages };
  }
}

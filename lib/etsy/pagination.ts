export async function collectOffsetPages<T>(fetchPage: (offset: number, limit: number) => Promise<{ count: number; results: T[] }>, options: { limit?: number; startOffset?: number } = {}) {
  const limit = options.limit ?? 100; let offset = options.startOffset ?? 0; const results: T[] = [];
  while (true) {
    const page = await fetchPage(offset, limit); results.push(...page.results);
    offset += page.results.length;
    if (page.results.length === 0 || offset >= page.count) return { results, nextOffset: offset };
  }
}

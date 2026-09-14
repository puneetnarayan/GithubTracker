/**
 * Minimal in-memory TTL cache for GitHub API responses that don't change
 * often (repo lists, branch counts, tag counts). Scoped to a single warm
 * serverless instance / local dev process — see store/memory-store.ts for
 * the same caveat applied to persistence. This only reduces redundant
 * GitHub requests within that instance's lifetime; it is not a shared
 * cache across instances.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  fetchedAt: number;
}

const globalForCache = globalThis as unknown as { __appCache?: Map<string, CacheEntry<unknown>> };
const cacheStore = globalForCache.__appCache ?? (globalForCache.__appCache = new Map());

export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<{ value: T; fetchedAt: number; fromCache: boolean }> {
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > Date.now()) {
    return { value: existing.value, fetchedAt: existing.fetchedAt, fromCache: true };
  }
  const value = await fetcher();
  const fetchedAt = Date.now();
  cacheStore.set(key, { value, expiresAt: fetchedAt + ttlMs, fetchedAt });
  return { value, fetchedAt, fromCache: false };
}

export function invalidateCache(prefix: string) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) cacheStore.delete(key);
  }
}

/** Runs async tasks with a bounded concurrency to avoid hammering the GitHub API. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

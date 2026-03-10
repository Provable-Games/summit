import type { Context } from "hono";

export type CacheStatus = "HIT" | "STALE" | "MISS" | "BYPASS";

export interface CachePolicy {
  freshTtlMs: number;
  staleTtlMs: number;
}

export interface ApiCacheOptions {
  enabled: boolean;
  maxEntries: number;
}

interface CacheEntry<T> {
  value: T;
  freshUntil: number;
  staleUntil: number;
}

interface CacheSnapshot {
  [key: string]: number;
  cache_entries: number;
  cache_hits: number;
  cache_stale_hits: number;
  cache_misses: number;
  cache_bypasses: number;
  cache_refreshes: number;
  cache_refresh_errors: number;
  cache_evictions: number;
}

const DEFAULT_MAX_ENTRIES = 500;

export class ApiResponseCache {
  private readonly enabled: boolean;
  private readonly maxEntries: number;
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private stats: CacheSnapshot = {
    cache_entries: 0,
    cache_hits: 0,
    cache_stale_hits: 0,
    cache_misses: 0,
    cache_bypasses: 0,
    cache_refreshes: 0,
    cache_refresh_errors: 0,
    cache_evictions: 0,
  };

  constructor(options: ApiCacheOptions) {
    this.enabled = options.enabled;
    this.maxEntries = Math.max(1, options.maxEntries || DEFAULT_MAX_ENTRIES);
  }

  get enabledInRuntime(): boolean {
    return this.enabled;
  }

  snapshot(): CacheSnapshot {
    return {
      ...this.stats,
      cache_entries: this.store.size,
    };
  }

  noteBypass(): void {
    this.stats.cache_bypasses += 1;
  }

  async getOrLoad<T>(
    key: string,
    policy: CachePolicy,
    loader: () => Promise<T>
  ): Promise<{ status: Exclude<CacheStatus, "BYPASS">; value: T }> {
    const now = Date.now();
    const existing = this.store.get(key) as CacheEntry<T> | undefined;

    if (existing) {
      if (existing.freshUntil > now) {
        this.stats.cache_hits += 1;
        this.touch(key, existing);
        return { status: "HIT", value: existing.value };
      }

      if (existing.staleUntil > now) {
        this.stats.cache_stale_hits += 1;
        this.touch(key, existing);
        this.refreshInBackground(key, policy, loader);
        return { status: "STALE", value: existing.value };
      }
    }

    this.stats.cache_misses += 1;
    const value = await this.loadSingleFlight(key, policy, loader);
    return { status: "MISS", value };
  }

  private touch<T>(key: string, entry: CacheEntry<T>): void {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  private refreshInBackground<T>(
    key: string,
    policy: CachePolicy,
    loader: () => Promise<T>
  ): void {
    if (this.inFlight.has(key)) return;

    void this.loadSingleFlight(key, policy, loader).catch(() => {
      // Error is counted in loadSingleFlight; stale value remains.
    });
  }

  private async loadSingleFlight<T>(
    key: string,
    policy: CachePolicy,
    loader: () => Promise<T>
  ): Promise<T> {
    const inFlight = this.inFlight.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;

    const loadPromise = (async () => {
      this.stats.cache_refreshes += 1;
      try {
        const value = await loader();
        this.set(key, value, policy);
        return value;
      } catch (error) {
        this.stats.cache_refresh_errors += 1;
        throw error;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, loadPromise);
    return loadPromise;
  }

  private set<T>(key: string, value: T, policy: CachePolicy): void {
    const now = Date.now();
    const freshTtl = Math.max(1, policy.freshTtlMs);
    const staleTtl = Math.max(freshTtl, policy.staleTtlMs);

    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) {
        this.store.delete(oldest);
        this.stats.cache_evictions += 1;
      }
    }

    this.store.set(key, {
      value,
      freshUntil: now + freshTtl,
      staleUntil: now + staleTtl,
    });
  }
}

export function parseCacheEnabled(): boolean {
  const raw = process.env.API_CACHE_ENABLED?.trim().toLowerCase();
  if (!raw) return process.env.NODE_ENV === "production";
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}

export function parseMaxEntries(value: string | undefined): number {
  if (!value) return DEFAULT_MAX_ENTRIES;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_ENTRIES;
  return Math.floor(parsed);
}

export function createCacheKey(c: Context): string {
  const url = new URL(c.req.url);
  const entries = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) => {
    if (aKey === bKey) return aValue.localeCompare(bValue);
    return aKey.localeCompare(bKey);
  });

  const query = new URLSearchParams(entries).toString();
  const suffix = query ? `?${query}` : "";
  return `${c.req.method}:${c.req.path}${suffix}`;
}

export function shouldBypassCache(c: Context): boolean {
  const requestCacheControl = (c.req.header("cache-control") || "").toLowerCase();
  const pragma = (c.req.header("pragma") || "").toLowerCase();

  return requestCacheControl.includes("no-cache") ||
    requestCacheControl.includes("no-store") ||
    pragma.includes("no-cache");
}

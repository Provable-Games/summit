import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "hono";
import {
  ApiResponseCache,
  createCacheKey,
  parseCacheEnabled,
  parseMaxEntries,
  shouldBypassCache,
} from "./cache.js";

function createContextStub(options: {
  url: string;
  method?: string;
  headers?: Record<string, string | undefined>;
}): Context {
  const normalizedHeaders = new Map<string, string>();
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    if (typeof value === "string") {
      normalizedHeaders.set(key.toLowerCase(), value);
    }
  }

  return {
    req: {
      url: options.url,
      method: options.method ?? "GET",
      path: new URL(options.url).pathname,
      header: (name: string) => normalizedHeaders.get(name.toLowerCase()),
    },
  } as Context;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.useRealTimers();
  process.env = { ...originalEnv };
  delete process.env.API_CACHE_ENABLED;
  delete process.env.NODE_ENV;
});

afterAll(() => {
  vi.useRealTimers();
  process.env = originalEnv;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ApiResponseCache", () => {
  it("serves MISS then HIT inside fresh TTL", async () => {
    const cache = new ApiResponseCache({ enabled: true, maxEntries: 10 });
    const policy = { freshTtlMs: 1_000, staleTtlMs: 2_000 };
    const loader = vi.fn().mockResolvedValue({ value: 1 });

    const first = await cache.getOrLoad("GET:/leaderboard", policy, loader);
    const second = await cache.getOrLoad("GET:/leaderboard", policy, loader);

    expect(first.status).toBe("MISS");
    expect(second.status).toBe("HIT");
    expect(loader).toHaveBeenCalledTimes(1);

    expect(cache.snapshot()).toMatchObject({
      cache_entries: 1,
      cache_misses: 1,
      cache_hits: 1,
      cache_refreshes: 1,
    });
  });

  it("serves STALE and refreshes in background with single-flight", async () => {
    vi.useFakeTimers();

    const cache = new ApiResponseCache({ enabled: true, maxEntries: 10 });
    const policy = { freshTtlMs: 1_000, staleTtlMs: 3_000 };
    let resolveRefresh: ((value: { version: number }) => void) | undefined;
    const loader = vi.fn();
    loader
      .mockResolvedValueOnce({ version: 1 })
      .mockImplementationOnce(
        () =>
          new Promise<{ version: number }>((resolve) => {
            resolveRefresh = resolve;
          })
      );

    await cache.getOrLoad("GET:/logs", policy, loader);
    vi.advanceTimersByTime(1_200);

    const staleOne = await cache.getOrLoad("GET:/logs", policy, loader);
    const staleTwo = await cache.getOrLoad("GET:/logs", policy, loader);

    expect(staleOne.status).toBe("STALE");
    expect(staleOne.value).toEqual({ version: 1 });
    expect(staleTwo.status).toBe("STALE");
    expect(staleTwo.value).toEqual({ version: 1 });
    expect(loader).toHaveBeenCalledTimes(2);

    resolveRefresh?.({ version: 2 });
    await Promise.resolve();

    const freshAfterRefresh = await cache.getOrLoad("GET:/logs", policy, loader);
    expect(freshAfterRefresh.status).toBe("HIT");
    expect(freshAfterRefresh.value).toEqual({ version: 2 });
  });

  it("shares in-flight loader promise for concurrent misses", async () => {
    const cache = new ApiResponseCache({ enabled: true, maxEntries: 10 });
    const policy = { freshTtlMs: 1_000, staleTtlMs: 2_000 };

    let resolveLoader: ((value: { token: string }) => void) | undefined;
    const loader = vi.fn(
      () =>
        new Promise<{ token: string }>((resolve) => {
          resolveLoader = resolve;
        })
    );

    const pendingA = cache.getOrLoad("GET:/beasts/stats/top?limit=25", policy, loader);
    const pendingB = cache.getOrLoad("GET:/beasts/stats/top?limit=25", policy, loader);

    expect(loader).toHaveBeenCalledTimes(1);

    resolveLoader?.({ token: "shared" });

    const [resultA, resultB] = await Promise.all([pendingA, pendingB]);

    expect(resultA.status).toBe("MISS");
    expect(resultB.status).toBe("MISS");
    expect(resultA.value).toEqual({ token: "shared" });
    expect(resultB.value).toEqual({ token: "shared" });
  });

  it("evicts least-recently-used key when capacity is reached", async () => {
    const cache = new ApiResponseCache({ enabled: true, maxEntries: 2 });
    const policy = { freshTtlMs: 5_000, staleTtlMs: 10_000 };

    const loadFor = (key: string) => vi.fn().mockResolvedValue({ key });

    await cache.getOrLoad("GET:/a", policy, loadFor("a"));
    await cache.getOrLoad("GET:/b", policy, loadFor("b"));
    await cache.getOrLoad("GET:/a", policy, loadFor("a-hit")); // Touch "a"
    await cache.getOrLoad("GET:/c", policy, loadFor("c"));

    const loaderForBReload = vi.fn().mockResolvedValue({ key: "b-reloaded" });
    const bResult = await cache.getOrLoad("GET:/b", policy, loaderForBReload);

    expect(bResult.status).toBe("MISS");
    expect(loaderForBReload).toHaveBeenCalledTimes(1);
    expect(cache.snapshot().cache_evictions).toBe(2);
  });
});

describe("cache helpers", () => {
  it("parseCacheEnabled defaults to true in production", () => {
    process.env.NODE_ENV = "production";

    expect(parseCacheEnabled()).toBe(true);
  });

  it("parseCacheEnabled disables cache for explicit falsey env values", () => {
    process.env.NODE_ENV = "production";
    process.env.API_CACHE_ENABLED = "false";

    expect(parseCacheEnabled()).toBe(false);

    process.env.API_CACHE_ENABLED = "0";
    expect(parseCacheEnabled()).toBe(false);
  });

  it("parseMaxEntries falls back on invalid input", () => {
    expect(parseMaxEntries(undefined)).toBe(500);
    expect(parseMaxEntries("abc")).toBe(500);
    expect(parseMaxEntries("0")).toBe(500);
    expect(parseMaxEntries("50.7")).toBe(50);
  });

  it("createCacheKey normalizes query ordering", () => {
    const context = createContextStub({
      method: "GET",
      url: "https://api.example.com/logs?player=0xabc&limit=25&category=event",
    });

    const key = createCacheKey(context);

    expect(key).toBe("GET:/logs?category=event&limit=25&player=0xabc");
  });

  it("shouldBypassCache respects no-cache directives", () => {
    const requestNoCache = createContextStub({
      url: "https://api.example.com/leaderboard",
      headers: {
        "cache-control": "max-age=0, no-cache",
      },
    });

    const pragmaNoCache = createContextStub({
      url: "https://api.example.com/leaderboard",
      headers: {
        pragma: "no-cache",
      },
    });

    const normalRequest = createContextStub({
      url: "https://api.example.com/leaderboard",
      headers: {
        "cache-control": "max-age=60",
      },
    });

    expect(shouldBypassCache(requestNoCache)).toBe(true);
    expect(shouldBypassCache(pragmaNoCache)).toBe(true);
    expect(shouldBypassCache(normalRequest)).toBe(false);
  });
});

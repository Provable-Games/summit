import { lookupAddresses } from '@cartridge/controller';

const CACHE_KEY = 'addressNameCache';

// Maximum cache size (number of addresses to store)
const MAX_CACHE_SIZE = 10000;

interface AddressNameCache {
  [normalizedAddress: string]: string | null;
}

/**
 * Normalizes an address to ensure consistent cache keys
 */
function normalizeAddress(address: string): string {
  return address.replace(/^0x0+/, "0x").toLowerCase();
}

/**
 * Gets the cache from localStorage
 */
function getCache(): AddressNameCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error('Error reading address name cache:', error);
    return {};
  }
}

/**
 * Saves the cache to localStorage
 */
function saveCache(cache: AddressNameCache): void {
  try {
    // Implement simple size limiting if cache is too large
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_SIZE) {
      // Keep only the most recent MAX_CACHE_SIZE entries
      const trimmedCache = Object.fromEntries(
        entries.slice(entries.length - MAX_CACHE_SIZE)
      );
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmedCache));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('Error saving address name cache:', error);
  }
}

/**
 * Looks up a single address name, checking cache first
 */
export async function lookupAddressName(address: string): Promise<string | null> {
  const normalized = normalizeAddress(address);
  const cache = getCache();

  // Check cache first
  if (normalized in cache) {
    return cache[normalized];
  }

  // Not in cache, fetch from API
  try {
    const addressMap = await lookupAddresses([normalized]);
    const name = addressMap.get(normalized) || null;

    // Update cache
    cache[normalized] = name;
    saveCache(cache);

    return name;
  } catch (error) {
    console.error('Error looking up address name:', error);
    return null;
  }
}

/**
 * Looks up multiple address names efficiently
 * Returns a Map of normalized address to name
 */
export async function lookupAddressNames(
  addresses: string[]
): Promise<Map<string, string | null>> {
  const normalized = addresses.map(normalizeAddress);
  const cache = getCache();
  const result = new Map<string, string | null>();
  const uncachedAddresses: string[] = [];

  // Check cache for each address
  for (const addr of normalized) {
    if (addr in cache) {
      result.set(addr, cache[addr]);
    } else {
      uncachedAddresses.push(addr);
    }
  }

  // Fetch uncached addresses from API
  if (uncachedAddresses.length > 0) {
    try {
      const addressMap = await lookupAddresses(uncachedAddresses);

      // Update result and cache
      for (const addr of uncachedAddresses) {
        const name = addressMap.get(addr) || null;
        result.set(addr, name);
        cache[addr] = name;
      }

      saveCache(cache);
    } catch (error) {
      console.error('Error looking up address names:', error);
      // Add null entries for failed lookups
      for (const addr of uncachedAddresses) {
        if (!result.has(addr)) {
          result.set(addr, null);
        }
      }
    }
  }

  return result;
}

/**
 * Manually adds or updates a name in the cache
 */
export function cacheAddressName(address: string, name: string | null): void {
  const normalized = normalizeAddress(address);
  const cache = getCache();

  cache[normalized] = name;

  saveCache(cache);
}

/**
 * Clears the entire cache
 */
export function clearAddressNameCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing address name cache:', error);
  }
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): {
  size: number;
} {
  const cache = getCache();

  return {
    size: Object.keys(cache).length,
  };
}


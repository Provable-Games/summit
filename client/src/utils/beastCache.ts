import { Beast } from "@/types/game";

const BEAST_COLLECTION_KEY_PREFIX = 'summit_beast_collection_';
const VERSION_TIMESTAMP = 1763381010385;

const getCacheKey = (address: string): string => {
  const normalizedAddress = address.toLowerCase();
  const last4 = normalizedAddress.slice(-4);
  return `${BEAST_COLLECTION_KEY_PREFIX}${last4}`;
};

export const saveBeastCollectionToCache = (beasts: Beast[], address: string) => {
  try {
    const cacheData = {
      beasts,
      address: address.toLowerCase(),
      timestamp: Date.now()
    };
    const cacheKey = getCacheKey(address);
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save beast collection to cache:', error);
  }
};

export const loadBeastCollectionFromCache = (address: string): Beast[] => {
  try {
    const cacheKey = getCacheKey(address);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return [];

    const cacheData = JSON.parse(cached);
    if (cacheData.timestamp < VERSION_TIMESTAMP) {
      localStorage.removeItem(cacheKey);
      return [];
    }

    // Verify the cached data is for the current address
    if (cacheData.address?.toLowerCase() !== address.toLowerCase()) {
      return [];
    }

    return cacheData.beasts || [];
  } catch (error) {
    console.error('Failed to load beast collection from cache:', error);
    return [];
  }
};


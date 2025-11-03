import { Beast } from "@/types/game";

const BEAST_COLLECTION_KEY_PREFIX = 'summit_beast_collection_';

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

/**
 * Merges fresh beast data with cached data according to specific field update rules:
 * - Always update if changed: rewards_earned, rank, last_dm_death_timestamp, adventurers_killed
 * - Only update if greater: bonus_health, bonus_xp, last_death_timestamp
 * - All other fields are updated from fresh data
 */
export const mergeBeastData = (cachedBeasts: Beast[], freshBeasts: Beast[]): Beast[] => {
  const cachedMap = new Map(cachedBeasts.map(beast => [beast.token_id, beast]));
  
  return freshBeasts.map(freshBeast => {
    const cachedBeast = cachedMap.get(freshBeast.token_id);
    
    // If no cached version exists, use fresh data
    if (!cachedBeast) {
      return freshBeast;
    }

    // Merge with special rules for specific fields
    return {
      ...freshBeast,
      // Only update these fields if the fresh value is greater than cached
      bonus_health: Math.max(cachedBeast.bonus_health || 0, freshBeast.bonus_health || 0),
      bonus_xp: Math.max(cachedBeast.bonus_xp || 0, freshBeast.bonus_xp || 0),
      last_death_timestamp: Math.max(cachedBeast.last_death_timestamp || 0, freshBeast.last_death_timestamp || 0),
      
      // These fields always use fresh data if available (already handled by spread)
      // rewards_earned, rank, last_dm_death_timestamp, adventurers_killed
    };
  });
};

export const clearBeastCollectionCache = (address?: string) => {
  try {
    if (address) {
      // Clear specific address cache
      const cacheKey = getCacheKey(address);
      localStorage.removeItem(cacheKey);
    } else {
      // Clear all beast collection caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(BEAST_COLLECTION_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Failed to clear beast collection cache:', error);
  }
};


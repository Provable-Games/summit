/**
 * Input validation utilities for SQL query parameters and game actions.
 * These functions help prevent SQL injection and ensure data integrity.
 */

/**
 * Validates that a string is a valid Starknet address format.
 * Addresses should be hex strings starting with 0x and containing only valid hex characters.
 */
export const isValidStarknetAddress = (addr: string): boolean => {
  if (typeof addr !== 'string') return false;
  // Starknet addresses are typically 64 hex chars after 0x prefix (with padding)
  // But can be shorter without padding
  return /^0x[0-9a-fA-F]{1,64}$/.test(addr);
};

/**
 * Validates that a value is a valid positive integer token ID.
 * Token IDs should be non-negative integers within safe bounds.
 */
export const isValidTokenId = (id: unknown): id is number => {
  return typeof id === 'number' &&
         Number.isInteger(id) &&
         id >= 0 &&
         id <= Number.MAX_SAFE_INTEGER;
};

/**
 * Validates that a value is a valid positive integer within a max bound.
 */
export const isValidPositiveInteger = (value: unknown, maxValue: number = Number.MAX_SAFE_INTEGER): value is number => {
  return typeof value === 'number' &&
         Number.isInteger(value) &&
         value >= 0 &&
         value <= maxValue;
};

/**
 * Validates a limit/offset for SQL queries.
 * Should be a non-negative integer within reasonable bounds.
 */
export const isValidQueryLimit = (limit: unknown): limit is number => {
  return isValidPositiveInteger(limit, 10000);
};

/**
 * Validates a namespace string for SQL queries.
 * Should only contain alphanumeric characters, underscores, and hyphens.
 */
export const isValidNamespace = (namespace: string): boolean => {
  if (typeof namespace !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(namespace);
};

/**
 * Sanitizes a string for safe inclusion in SQL queries.
 * This escapes potentially dangerous characters.
 * Note: Always prefer parameterized queries when available.
 */
export const sanitizeSqlString = (value: string): string => {
  if (typeof value !== 'string') return '';
  // Escape single quotes and other SQL special characters
  return value
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};

/**
 * Validates an array of token IDs for batch queries.
 */
export const validateTokenIdArray = (ids: unknown[]): ids is number[] => {
  if (!Array.isArray(ids)) return false;
  return ids.every(id => isValidTokenId(id));
};

/**
 * Validates an entity hash string.
 * Should be a valid padded hex string.
 */
export const isValidEntityHash = (hash: string): boolean => {
  if (typeof hash !== 'string') return false;
  return /^0x[0-9a-fA-F]{1,64}$/.test(hash);
};

/**
 * Validates beast selection for attack actions.
 */
export interface BeastSelection {
  token_id: number;
  [key: string]: unknown;
}

export const validateBeastSelection = (
  beasts: unknown
): { valid: boolean; error?: string } => {
  if (!Array.isArray(beasts)) {
    return { valid: false, error: 'Invalid beasts array' };
  }

  if (beasts.length === 0) {
    return { valid: false, error: 'No beasts selected' };
  }

  if (beasts.length > 75) {
    return { valid: false, error: 'Too many beasts selected (max 75)' };
  }

  for (const selection of beasts) {
    if (!Array.isArray(selection) || selection.length < 3) {
      return { valid: false, error: 'Invalid beast selection format' };
    }

    const [beast, attacks, potions] = selection;

    if (!beast || typeof beast !== 'object' || !('token_id' in beast)) {
      return { valid: false, error: 'Invalid beast object in selection' };
    }

    if (!isValidTokenId(beast.token_id)) {
      return { valid: false, error: 'Invalid beast token_id' };
    }

    if (!isValidPositiveInteger(attacks, 1000)) {
      return { valid: false, error: 'Invalid attack count' };
    }

    if (!isValidPositiveInteger(potions, 10000)) {
      return { valid: false, error: 'Invalid potion count' };
    }
  }

  return { valid: true };
};

/**
 * Validates game action parameters.
 */
export interface GameActionValidation {
  valid: boolean;
  error?: string;
}

export const validatePoisonAction = (
  beastId: unknown,
  count: unknown
): GameActionValidation => {
  if (!isValidTokenId(beastId)) {
    return { valid: false, error: 'Invalid beast token ID' };
  }

  if (!isValidPositiveInteger(count, 1000)) {
    return { valid: false, error: 'Invalid poison count' };
  }

  return { valid: true };
};

export const validateFeedAction = (
  beastId: unknown,
  amount: unknown,
  corpseTokens: unknown
): GameActionValidation => {
  if (!isValidTokenId(beastId)) {
    return { valid: false, error: 'Invalid beast token ID' };
  }

  if (!isValidPositiveInteger(amount, 100000)) {
    return { valid: false, error: 'Invalid feed amount' };
  }

  if (!isValidPositiveInteger(corpseTokens, 100000)) {
    return { valid: false, error: 'Invalid corpse token count' };
  }

  return { valid: true };
};

export const validateClaimAction = (
  ids: unknown
): GameActionValidation => {
  if (!Array.isArray(ids)) {
    return { valid: false, error: 'Invalid IDs array' };
  }

  if (ids.length === 0) {
    return { valid: false, error: 'No IDs provided' };
  }

  if (!validateTokenIdArray(ids)) {
    return { valid: false, error: 'Invalid ID in array' };
  }

  return { valid: true };
};

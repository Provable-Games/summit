/**
 * Pure helper functions for beast calculations
 * Extracted from index.ts for testability and reuse
 */

/**
 * Spirit revival time reduction in seconds
 * Mirrored from contracts/src/models/beast.cairo
 */
export function getSpiritRevivalReductionSeconds(points: number): number {
  const p = Math.max(0, Math.floor(points));
  if (p <= 5) {
    switch (p) {
      case 0: return 0;
      case 1: return 7200;
      case 2: return 10080;
      case 3: return 12240;
      case 4: return 13680;
      case 5: return 14400;
    }
  } else if (p <= 70) {
    return 14400 + (p - 5) * 720;
  }
  return 61200 + (p - 70) * 360;
}

/**
 * Get beast revival time in milliseconds based on spirit stat
 * Base revival time is 24 hours (86400000ms), reduced by spirit
 */
export function getBeastRevivalTime(spirit: number): number {
  const revivalTime = 86400000; // 24 hours in ms
  if (spirit > 0) {
    return revivalTime - getSpiritRevivalReductionSeconds(spirit) * 1000;
  }
  return revivalTime;
}

/**
 * Calculate beast's current effective level from base level and bonus XP
 * Effective XP = base_level^2 + bonus_xp, current level = floor(sqrt(effective_xp))
 */
export function getBeastCurrentLevel(level: number, bonusXp: number): number {
  return Math.floor(Math.sqrt(bonusXp + Math.pow(level, 2)));
}

/**
 * Normalize a Starknet address to match database format
 * - Lowercase
 * - Pad to 66 chars (0x + 64 hex chars)
 */
export function normalizeAddress(address: string): string {
  const lower = address.toLowerCase();
  const withoutPrefix = lower.startsWith("0x") ? lower.slice(2) : lower;
  return "0x" + withoutPrefix.padStart(64, "0");
}

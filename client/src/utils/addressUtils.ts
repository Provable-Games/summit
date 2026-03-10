import { addAddressPadding } from 'starknet';

export type MaybeAddress = string | null | undefined;

/**
 * Normalizes an address by stripping leading zeros (for cache keys and display).
 */
export function normalizeAddress(address: MaybeAddress): string | null {
  if (typeof address !== 'string') {
    return null;
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  const result = trimmed.replace(/^0x0+/, '0x').toLowerCase();
  return result === '0x' ? null : result;
}

/**
 * Compares two addresses for equality using zero-padded form.
 */
export function addressesEqual(left: MaybeAddress, right: MaybeAddress): boolean {
  if (!left || !right) {
    return false;
  }

  try {
    return addAddressPadding(left) === addAddressPadding(right);
  } catch {
    return false;
  }
}

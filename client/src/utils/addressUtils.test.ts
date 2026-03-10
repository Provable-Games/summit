import { describe, expect, it } from 'vitest';
import { normalizeAddress, addressesEqual } from './addressUtils';

describe('normalizeAddress', () => {
  it('strips leading zeros', () => {
    expect(normalizeAddress('0x00abc')).toBe('0xabc');
  });

  it('lowercases hex', () => {
    expect(normalizeAddress('0x00ABC')).toBe('0xabc');
  });

  it('returns null for zero addresses', () => {
    expect(normalizeAddress('0x0')).toBeNull();
    expect(normalizeAddress('0x00')).toBeNull();
    expect(normalizeAddress('0x000000')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(normalizeAddress(null)).toBeNull();
    expect(normalizeAddress(undefined)).toBeNull();
    expect(normalizeAddress('')).toBeNull();
    expect(normalizeAddress('  ')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizeAddress('  0x00abc  ')).toBe('0xabc');
  });

  it('handles already-normalized addresses', () => {
    expect(normalizeAddress('0xabc')).toBe('0xabc');
  });

  it('handles full 66-char padded address', () => {
    const padded = '0x0000000000000000000000000000000000000000000000000000000000000abc';
    expect(normalizeAddress(padded)).toBe('0xabc');
  });
});

describe('addressesEqual', () => {
  it('matches equivalent addresses with different padding', () => {
    expect(addressesEqual('0xabc', '0x0000000000000000000000000000000000000000000000000000000000000abc')).toBe(true);
  });

  it('matches identical addresses', () => {
    expect(addressesEqual('0xabc', '0xabc')).toBe(true);
  });

  it('is case-insensitive via padding', () => {
    expect(addressesEqual('0xABC', '0xabc')).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(addressesEqual(null, '0xabc')).toBe(false);
    expect(addressesEqual('0xabc', null)).toBe(false);
    expect(addressesEqual(null, null)).toBe(false);
    expect(addressesEqual(undefined, undefined)).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(addressesEqual('', '0xabc')).toBe(false);
    expect(addressesEqual('0xabc', '')).toBe(false);
  });

  it('returns false for different addresses', () => {
    expect(addressesEqual('0xabc', '0xdef')).toBe(false);
  });

  it('handles malformed input gracefully', () => {
    expect(addressesEqual('not-an-address', '0xabc')).toBe(false);
  });
});

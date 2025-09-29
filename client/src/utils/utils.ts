import { BigNumberish, shortString } from "starknet";

export const stringToFelt = (v: string): BigNumberish =>
  v ? shortString.encodeShortString(v) : "0x0";

export const bigintToHex = (v: BigNumberish): `0x${string}` =>
  !v ? "0x0" : `0x${BigInt(v).toString(16)}`;

export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function ellipseAddress(address: string, start: number, end: number) {
  return `${address.slice(0, start)}...${address.slice(-end)}`.toUpperCase();
}

export const getShortNamespace = (namespace: string) => {
  let parts = namespace.split('_');
  let short = parts[0] + parts.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return short;
}

export function parseBalances(
  results: { id: number; jsonrpc: string; result: [string, string] }[],
  tokens: { name: string; address: string; displayDecimals: number; decimals?: number; }[],
): Record<string, string> {
  function toBigIntSmart(v: string | number | bigint): bigint {
    const s = String(v);
    return s.startsWith("0x") ? BigInt(s) : BigInt(s);
  }

  function uint256ToBigInt([low, high]: [string, string]): bigint {
    return (toBigIntSmart(high) << 128n) + toBigIntSmart(low);
  }

  function formatBalance(raw: bigint, tokenDecimals = 18, showDecimals = 4): string {
    const base = 10n ** BigInt(tokenDecimals);
    const intPart = raw / base;
    const fracPart = raw % base;
    const frac = fracPart.toString().padStart(tokenDecimals, "0").slice(0, showDecimals);
    return `${intPart}${showDecimals > 0 ? "." + frac : ""}`;
  }

  const out: Record<string, string> = {};
  for (let i = 0; i < results.length; i++) {
    const token = tokens[i];
    const raw = uint256ToBigInt(results[i].result);
    const tokenDecimals = token.decimals ?? 18;
    const shownDecimals = token.displayDecimals;
    out[token.name] = formatBalance(raw, tokenDecimals, shownDecimals);
  }
  return out;
}

// Utility function to format numbers with appropriate decimal places
export const formatAmount = (value: number): string => {
  if (value === 0) return '0';

  const absValue = Math.abs(value);

  if (absValue < 0.000001) {
    // For very small numbers, show up to 8 decimal places
    return value.toFixed(10).replace(/\.?0+$/, '');
  } else if (absValue < 0.001) {
    // For small numbers, show up to 5 decimal places
    return value.toFixed(5).replace(/\.?0+$/, '');
  } else if (absValue < 1) {
    // For numbers less than 1, show up to 4 decimal places
    return value.toFixed(4).replace(/\.?0+$/, '');
  } else if (absValue < 10) {
    // For single digit numbers, show 2 decimal places
    return value.toFixed(2).replace(/\.?0+$/, '');
  } else if (absValue < 100) {
    // For double digit numbers, show 1 decimal place
    return value.toFixed(1).replace(/\.?0+$/, '');
  } else {
    // For larger numbers, show no decimal places
    return Math.round(value).toString();
  }
};

export function formatRewardNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}
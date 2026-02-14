import { describe, it, expect } from "vitest";
import {
  bigintToHex,
  ellipseAddress,
  getShortNamespace,
  parseBalances,
  formatAmount,
  formatRewardNumber,
  shuffle,
} from "./utils";

// ---------------------------------------------------------------------------
// bigintToHex
// ---------------------------------------------------------------------------
describe("bigintToHex", () => {
  it("returns 0x0 for 0", () => {
    expect(bigintToHex(0)).toBe("0x0");
  });

  it("returns 0x0 for undefined", () => {
    expect(bigintToHex(undefined as unknown as number)).toBe("0x0");
  });

  it("returns 0x0 for null", () => {
    expect(bigintToHex(null as unknown as number)).toBe("0x0");
  });

  it("returns 0x0 for empty string (falsy)", () => {
    expect(bigintToHex("" as unknown as number)).toBe("0x0");
  });

  it("converts 255n to 0xff", () => {
    expect(bigintToHex(255n)).toBe("0xff");
  });

  it("converts large bigint correctly", () => {
    expect(bigintToHex(65536n)).toBe("0x10000");
  });

  it("converts numeric string", () => {
    expect(bigintToHex("1000")).toBe("0x3e8");
  });

  it("converts hex string input", () => {
    expect(bigintToHex("0xff")).toBe("0xff");
  });

  it("converts 1 correctly", () => {
    expect(bigintToHex(1)).toBe("0x1");
  });
});

// ---------------------------------------------------------------------------
// ellipseAddress
// ---------------------------------------------------------------------------
describe("ellipseAddress", () => {
  const addr = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

  it("truncates address with ellipsis and uppercases", () => {
    const result = ellipseAddress(addr, 6, 4);
    expect(result).toBe("0X049D...4DC7");
  });

  it("handles different start/end lengths", () => {
    const result = ellipseAddress(addr, 10, 6);
    expect(result.startsWith("0X049D3657")).toBe(true);
    expect(result.endsWith("004DC7")).toBe(true);
    expect(result).toContain("...");
  });

  it("uppercases the entire output", () => {
    const result = ellipseAddress("0xabcdef1234567890", 4, 4);
    expect(result).toBe("0XAB...7890");
  });
});

// ---------------------------------------------------------------------------
// getShortNamespace
// ---------------------------------------------------------------------------
describe("getShortNamespace", () => {
  it("converts underscored string to camelCase", () => {
    expect(getShortNamespace("hello_world")).toBe("helloWorld");
  });

  it("leaves single word unchanged", () => {
    expect(getShortNamespace("summit")).toBe("summit");
  });

  it("handles multiple underscores", () => {
    expect(getShortNamespace("my_long_namespace_here")).toBe("myLongNamespaceHere");
  });

  it("handles two-part namespace", () => {
    expect(getShortNamespace("savage_summit")).toBe("savageSummit");
  });
});

// ---------------------------------------------------------------------------
// parseBalances
// ---------------------------------------------------------------------------
describe("parseBalances", () => {
  it("parses single token with default 18 decimals", () => {
    // 1e18 in hex: low = 0xde0b6b3a7640000, high = 0x0
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0xde0b6b3a7640000", "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "SURVIVOR", address: "0x1234", displayDecimals: 4 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.SURVIVOR).toBe(1);
  });

  it("parses token with fractional balance", () => {
    // 1.5e18 = 1500000000000000000
    const raw = "0x14d1120d7b160000";
    const results = [
      { id: 1, jsonrpc: "2.0", result: [raw, "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "ATTACK", address: "0xabc", displayDecimals: 4 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.ATTACK).toBe(1.5);
  });

  it("reconstructs uint256 from high and low", () => {
    // high=1 means value = 1 << 128 = 340282366920938463463374607431768211456
    // With 18 decimals that's a huge number. Use a simpler approach:
    // Let low = 0, high = 1 => raw = 2^128
    // 2^128 / 1e18 = 340282366920938463463.374607431768211456
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0x0", "0x1"] as [string, string] },
    ];
    const tokens = [
      { name: "BIG", address: "0xbig", displayDecimals: 4 },
    ];
    const balances = parseBalances(results, tokens);
    // The integer part of 2^128 / 1e18 is 340282366920938463463
    expect(balances.BIG).toBeGreaterThan(0);
  });

  it("parses multiple tokens", () => {
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0xde0b6b3a7640000", "0x0"] as [string, string] },
      { id: 2, jsonrpc: "2.0", result: ["0x1bc16d674ec80000", "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "TOKEN_A", address: "0xa", displayDecimals: 4 },
      { name: "TOKEN_B", address: "0xb", displayDecimals: 4 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.TOKEN_A).toBe(1);
    expect(balances.TOKEN_B).toBe(2);
  });

  it("handles zero balance", () => {
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0x0", "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "EMPTY", address: "0x0", displayDecimals: 2 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.EMPTY).toBe(0);
  });

  it("respects custom token decimals", () => {
    // 1000000 with 6 decimals = 1.0
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0xf4240", "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "USDC", address: "0xusdc", displayDecimals: 2, decimals: 6 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.USDC).toBe(1);
  });

  it("trims trailing zeros in fractional part", () => {
    // 1.1e18 = 1100000000000000000 = 0xf43fc2c04ee0000
    const results = [
      { id: 1, jsonrpc: "2.0", result: ["0xf43fc2c04ee0000", "0x0"] as [string, string] },
    ];
    const tokens = [
      { name: "TRIMMED", address: "0xt", displayDecimals: 4 },
    ];
    const balances = parseBalances(results, tokens);
    expect(balances.TRIMMED).toBe(1.1);
  });
});

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------
describe("formatAmount", () => {
  it("returns '0' for zero", () => {
    expect(formatAmount(0)).toBe("0");
  });

  it("formats very small numbers (< 0.000001)", () => {
    const result = formatAmount(0.0000001);
    expect(result).toBe("0.0000001");
  });

  it("formats small numbers (< 0.001)", () => {
    // 0.00056 is in the [0.000001, 0.001) range, uses toFixed(5)
    const result = formatAmount(0.00056);
    expect(result).toBe("0.00056");
  });

  it("formats numbers just above 0.001 with up to 4 decimal places", () => {
    // 0.00456 is in the [0.001, 1) range, uses toFixed(4)
    const result = formatAmount(0.00456);
    expect(result).toBe("0.0046");
  });

  it("formats numbers less than 1 with up to 4 decimal places", () => {
    const result = formatAmount(0.1234);
    expect(result).toBe("0.1234");
  });

  it("formats single digit numbers with 2 decimal places", () => {
    expect(formatAmount(5.55)).toBe("5.55");
  });

  it("strips trailing zeros for single digit", () => {
    expect(formatAmount(5.10)).toBe("5.1");
  });

  it("formats double digit numbers with 1 decimal place", () => {
    expect(formatAmount(42.67)).toBe("42.7");
  });

  it("formats large numbers with no decimal places", () => {
    expect(formatAmount(1000)).toBe("1000");
  });

  it("rounds large numbers", () => {
    expect(formatAmount(999.7)).toBe("1000");
  });

  it("handles negative values", () => {
    const result = formatAmount(-5.55);
    expect(result).toBe("-5.55");
  });

  it("formats whole single-digit as integer", () => {
    expect(formatAmount(3.00)).toBe("3");
  });
});

// ---------------------------------------------------------------------------
// formatRewardNumber
// ---------------------------------------------------------------------------
describe("formatRewardNumber", () => {
  it("returns plain number for values under 1000", () => {
    // toLocaleString may add comma separators, but for 500 it should be "500"
    expect(formatRewardNumber(500)).toBe("500");
  });

  it("formats thousands with K suffix", () => {
    expect(formatRewardNumber(1500)).toBe("1.5K");
  });

  it("formats exact thousands", () => {
    expect(formatRewardNumber(1000)).toBe("1.0K");
  });

  it("formats millions with M suffix", () => {
    expect(formatRewardNumber(1500000)).toBe("1.50M");
  });

  it("formats exact million", () => {
    expect(formatRewardNumber(1000000)).toBe("1.00M");
  });

  it("formats small number (0) correctly", () => {
    expect(formatRewardNumber(0)).toBe("0");
  });

  it("formats hundreds correctly", () => {
    expect(formatRewardNumber(999)).toBe("999");
  });
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------
describe("shuffle", () => {
  it("preserves array length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
  });

  it("preserves all elements (sorted comparison)", () => {
    const arr = [10, 20, 30, 40, 50];
    const result = shuffle(arr);
    expect([...result].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50]);
  });

  it("does not mutate original array", () => {
    const arr = [1, 2, 3];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it("returns a new array instance", () => {
    const arr = [1, 2, 3];
    const result = shuffle(arr);
    expect(result).not.toBe(arr);
  });

  it("handles empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it("works with string arrays", () => {
    const arr = ["a", "b", "c"];
    const result = shuffle(arr);
    expect([...result].sort()).toEqual(["a", "b", "c"]);
  });
});

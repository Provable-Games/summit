import { num } from "starknet";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateSwapCalls, getSwapQuote } from "./ekubo";

describe("ekubo quote precision", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps large quote totals as exact strings and clamps UI display", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          total_calculated: "12345678901234567890",
          price_impact: 0.12,
          splits: [],
        }),
      })),
    );

    const quote = await getSwapQuote("1", "0x1", "0x2");

    expect(quote.total).toBe("12345678901234567890");
    expect(quote.totalDisplay).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("accepts numeric total_calculated values and normalizes to string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          total_calculated: -42,
          price_impact: 0,
          splits: [],
        }),
      })),
    );

    const quote = await getSwapQuote("2", "0x3", "0x4");

    expect(quote.total).toBe("-42");
    expect(quote.totalDisplay).toBe(-42);
  });

  it("builds calldata from exact quote.total string", () => {
    const calls = generateSwapCalls(
      { address: "0x5" },
      "0x9",
      {
        tokenAddress: "0x3",
        minimumAmount: 1,
        quote: {
          impact: 0,
          total: "-6000000000000000001",
          totalDisplay: -1,
          splits: [
            {
              amount_specified: "-1",
              route: [
                {
                  pool_key: {
                    token0: "0x3",
                    token1: "0x9",
                    fee: "0x0",
                    tick_spacing: "1",
                    extension: "0x0",
                  },
                  sqrt_ratio_limit: "0",
                  skip_ahead: "0x0",
                },
              ],
            },
          ],
        },
      },
    );

    expect(calls[0]?.entrypoint).toBe("transfer");
    expect(calls[0]?.calldata[1]).toBe(num.toHex(12_000_000_000_000_000_002n));
  });
});

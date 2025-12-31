import { delay } from "@/utils/utils";
import { num } from "starknet";

export interface SwapQuote {
  impact: number;
  price_impact?: number;
  total: number;
  splits: SwapSplit[];
}

interface SwapSplit {
  amount_specified: string;
  route: RouteNode[];
}

interface RouteNode {
  pool_key: {
    token0: string;
    token1: string;
    fee: string;
    tick_spacing: string;
    extension: string;
  };
  sqrt_ratio_limit: string;
  skip_ahead: string;
}

interface TokenQuote {
  tokenAddress: string;
  minimumAmount: number;
  quote?: SwapQuote;
}

interface RouterContract {
  address: string;
  populate: (method: string, params: any[]) => any;
}

interface SwapCall {
  contractAddress: string;
  entrypoint: string;
  calldata: any[];
}

const inflightQuotes: Record<string, Promise<SwapQuote>> = {};
let rateLimitUntil = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

const applySlippage = (value: bigint, slippageBps: number) => {
  const basis = 10_000n;
  const bps = BigInt(slippageBps);
  return (value * (basis - bps)) / basis;
};

export const getSwapQuote = async (
  amount: bigint | string,
  token: string,
  otherToken: string
): Promise<SwapQuote> => {
  const maxRetries = 3;
  const amountParam = typeof amount === "bigint" ? amount.toString() : amount;
  const cacheKey = `${amountParam}-${token}-${otherToken}`;

  // Global cooldown after 429s
  if (Date.now() < rateLimitUntil) {
    throw new Error("Quoter temporarily rate limited");
  }

  if (inflightQuotes[cacheKey]) {
    return inflightQuotes[cacheKey];
  }

  inflightQuotes[cacheKey] = (async () => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let response: Response;
      try {
        response = await fetch(
          `https://prod-api-quoter.ekubo.org/23448594291968334/${amountParam}/${token}/${otherToken}`
        );
      } catch (err) {
        // Network/CORS-style failures
        if (attempt < maxRetries - 1) {
          await delay(2000);
          continue;
        }
        throw err;
      }

      if (!response.ok) {
        // Avoid hammering on known client-side errors (e.g. 4xx like 429).
        if (response.status === 429) {
          rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          console.warn(
            "getSwapQuote: rate limited (429), backing off 60s for all quotes"
          );
          throw new Error("Quoter rate limited");
        }
        if (response.status >= 400 && response.status < 500) {
          const text = await response.text();
          console.warn(
            `getSwapQuote: received ${response.status}, skipping retries`
          );
          throw new Error(text || `Quoter error ${response.status}`);
        }
        // Allow transient server errors to retry.
        if (attempt < maxRetries - 1) {
          await delay(2000);
          continue;
        }
      }

      let data: any;
      try {
        data = await response.json();
      } catch (err) {
        console.error("getSwapQuote: failed to parse response", err);
        if (attempt < maxRetries - 1) {
          await delay(2000);
          continue;
        }
        throw err;
      }

      if (data.total_calculated) {
        return {
          impact: data?.price_impact || 0,
          price_impact: data?.price_impact || 0,
          total: data?.total_calculated || 0,
          splits: data?.splits || [],
        };
      }

      // If total_calculated is missing and we still have retries left, wait and retry
      if (attempt < maxRetries - 1) {
        await delay(2000);
      }
    }

    return {
      impact: 0,
      total: 0,
      splits: [],
    };
  })();

  try {
    return await inflightQuotes[cacheKey];
  } finally {
    delete inflightQuotes[cacheKey];
  }
};

export const generateSwapCalls = (
  ROUTER_CONTRACT: RouterContract,
  purchaseToken: string,
  tokenQuote: TokenQuote,
  slippageBps: number = 100 // 1%
): SwapCall[] => {
  if (!tokenQuote.quote || tokenQuote.quote.splits.length === 0) {
    return [];
  }

  let { tokenAddress, minimumAmount, quote } = tokenQuote;

  let totalQuoteSum = 0n;
  const total = BigInt(tokenQuote.quote.total);

  if (total < 0n) {
    totalQuoteSum = -total;
    const doubledTotal = totalQuoteSum * 2n;
    totalQuoteSum =
      doubledTotal < totalQuoteSum + BigInt(1e19)
        ? doubledTotal
        : totalQuoteSum + BigInt(1e19);
  } else {
    totalQuoteSum = BigInt(minimumAmount * 1e18);
  }

  const transferCall: SwapCall = {
    contractAddress: purchaseToken,
    entrypoint: "transfer",
    calldata: [ROUTER_CONTRACT.address, num.toHex(totalQuoteSum), "0x0"],
  };

  const clearCall: SwapCall = {
    contractAddress: ROUTER_CONTRACT.address,
    entrypoint: "clear",
    calldata: [purchaseToken],
  };

  if (!quote || quote.splits.length === 0) {
    return [transferCall, clearCall];
  }

  let { splits } = quote;

  let minimumClear: string;
  if (total < 0n) {
    const desired = BigInt(minimumAmount) * 10n ** 18n;
    const withSlippage = applySlippage(desired, slippageBps);
    minimumClear = num.toHex(withSlippage);
  } else {
    const withSlippage = applySlippage(total, slippageBps);
    minimumClear = num.toHex(withSlippage);
  }

  const clearProfitsCall = {
    contractAddress: ROUTER_CONTRACT.address,
    entrypoint: "clear_minimum",
    calldata: [tokenAddress, minimumClear, "0x0"],
  };

  let swapCalls: SwapCall[];

  if (splits.length === 1) {
    const split = splits[0];

    swapCalls = [
      {
        contractAddress: ROUTER_CONTRACT.address,
        entrypoint: "multihop_swap",
        calldata: [
          num.toHex(split.route.length),
          ...split.route.reduce(
            (
              memo: { token: string; encoded: string[] },
              routeNode: RouteNode
            ) => {
              const isToken1 =
                BigInt(memo.token) === BigInt(routeNode.pool_key.token1);

              return {
                token: isToken1
                  ? routeNode.pool_key.token0
                  : routeNode.pool_key.token1,
                encoded: memo.encoded.concat([
                  routeNode.pool_key.token0,
                  routeNode.pool_key.token1,
                  routeNode.pool_key.fee,
                  num.toHex(routeNode.pool_key.tick_spacing),
                  routeNode.pool_key.extension,
                  num.toHex(BigInt(routeNode.sqrt_ratio_limit) % 2n ** 128n),
                  num.toHex(BigInt(routeNode.sqrt_ratio_limit) >> 128n),
                  routeNode.skip_ahead,
                ]),
              };
            },
            {
              token: tokenAddress,
              encoded: [],
            }
          ).encoded,
          total < 0n ? tokenAddress : purchaseToken,
          num.toHex(
            BigInt(split.amount_specified) < 0n
              ? -BigInt(split.amount_specified)
              : BigInt(split.amount_specified)
          ),
          total < 0n ? "0x1" : "0x0",
        ],
      },
      clearProfitsCall,
    ];
  } else {
    swapCalls = [
      {
        contractAddress: ROUTER_CONTRACT.address,
        entrypoint: "multi_multihop_swap",
        calldata: [
          num.toHex(splits.length),
          ...splits.reduce((memo: string[], split: SwapSplit) => {
            return memo.concat([
              num.toHex(split.route.length),
              ...split.route.reduce(
                (
                  memo: { token: string; encoded: string[] },
                  routeNode: RouteNode
                ) => {
                  const isToken1 =
                    BigInt(memo.token) === BigInt(routeNode.pool_key.token1);

                  return {
                    token: isToken1
                      ? routeNode.pool_key.token0
                      : routeNode.pool_key.token1,
                    encoded: memo.encoded.concat([
                      routeNode.pool_key.token0,
                      routeNode.pool_key.token1,
                      routeNode.pool_key.fee,
                      num.toHex(routeNode.pool_key.tick_spacing),
                      routeNode.pool_key.extension,
                      num.toHex(
                        BigInt(routeNode.sqrt_ratio_limit) % 2n ** 128n
                      ),
                      num.toHex(BigInt(routeNode.sqrt_ratio_limit) >> 128n),
                      routeNode.skip_ahead,
                    ]),
                  };
                },
                {
                  token: tokenAddress,
                  encoded: [],
                }
              ).encoded,
              total < 0n ? tokenAddress : purchaseToken,
              num.toHex(
                BigInt(split.amount_specified) < 0n
                  ? -BigInt(split.amount_specified)
                  : BigInt(split.amount_specified)
              ),
              total < 0n ? "0x1" : "0x0",
            ]);
          }, []),
        ],
      },
      clearProfitsCall,
    ];
  }

  return [transferCall, ...swapCalls, clearCall];
};

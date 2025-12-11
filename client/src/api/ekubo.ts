import { delay } from "@/utils/utils";
import { num } from "starknet";

interface SwapQuote {
  impact: number;
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

export const getSwapQuote = async (
  amount: number,
  token: string,
  otherToken: string
): Promise<SwapQuote> => {
  const maxRetries = 10;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `https://prod-api-quoter.ekubo.org/loot-quoter/${amount}/${token}/${otherToken}`
    );
    const data = await response.json();

    if (data.total_calculated) {
      return {
        impact: data?.price_impact || 0,
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
};

export const generateSwapCalls = (
  ROUTER_CONTRACT: RouterContract,
  purchaseToken: string,
  tokenQuote: TokenQuote
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

  let minimumClear =
    total < 0n ? num.toHex(BigInt(minimumAmount * 1e18)) : num.toHex(total);

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

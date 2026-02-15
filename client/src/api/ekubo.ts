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

export interface PoolKey {
  token0: string;
  token1: string;
  fee: string;
  tick_spacing: string;
  extension: string;
}

export interface Bounds {
  lower: { mag: string; sign: boolean };
  upper: { mag: string; sign: boolean };
}

const inflightQuotes: Partial<Record<string, Promise<SwapQuote>>> = {};
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
          `${EKUBO_QUOTER_BASE}/${amountParam}/${token}/${otherToken}`
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

  const { tokenAddress, minimumAmount, quote } = tokenQuote;

  const total = BigInt(tokenQuote.quote.total);
  let totalQuoteSum: bigint;

  if (total < 0n) {
    const absTotal = -total;
    const doubledTotal = absTotal * 2n;
    totalQuoteSum =
      doubledTotal < absTotal + BigInt(1e19)
        ? doubledTotal
        : absTotal + BigInt(1e19);
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

  const { splits } = quote;

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

export interface PoolInfo {
  fee: string;
  tick_spacing: number;
  extension: string;
  tvl0_total: string;
  tvl1_total: string;
  fees0_24h: string;
  fees1_24h: string;
  volume0_24h: string;
  volume1_24h: string;
}

const EKUBO_QUOTER_BASE = "https://prod-api-quoter.ekubo.org/23448594291968334";
const EKUBO_API_BASE = "https://prod-api.ekubo.org";
const EKUBO_CHAIN_ID = "23448594291968334";
const EKUBO_MAX_TICK = 88722839;

// Default pool parameters for game token / TEST USD pools.
// These are hardcoded so liquidity provision works without any API dependency.
// 0.05% fee tier: fee = 0.0005 * 2^128 = 170141183460469235273462165868118016
export const DEFAULT_POOL_FEE = "170141183460469235273462165868118016";
export const DEFAULT_POOL_TICK_SPACING = 1000;
export const DEFAULT_POOL_EXTENSION = "0x0";

export const getDefaultPoolInfo = (): PoolInfo => ({
  fee: DEFAULT_POOL_FEE,
  tick_spacing: DEFAULT_POOL_TICK_SPACING,
  extension: DEFAULT_POOL_EXTENSION,
  tvl0_total: '0',
  tvl1_total: '0',
  fees0_24h: '0',
  fees1_24h: '0',
  volume0_24h: '0',
  volume1_24h: '0',
});

export const getPoolsForPair = async (
  tokenA: string,
  tokenB: string
): Promise<PoolInfo[]> => {
  const a = tokenA.toLowerCase();
  const b = tokenB.toLowerCase();
  const url = `${EKUBO_API_BASE}/pair/${EKUBO_CHAIN_ID}/${a}/${b}/pools`;

  const response = await fetch(url);
  if (!response.ok) {
    // API may not recognize some tokens — caller should fall back to discoverPoolFromQuote
    return [];
  }

  const data = await response.json();
  const pools: PoolInfo[] = data.topPools || data || [];
  return pools;
};

/**
 * Discover pool parameters by doing a tiny swap quote.
 * The quoter works even when the pair API doesn't recognize a token.
 * Returns a synthetic PoolInfo from the first route's pool_key.
 */
export const discoverPoolFromQuote = async (
  tokenA: string,
  tokenB: string
): Promise<PoolInfo | null> => {
  try {
    const quote = await getSwapQuote(-1n * 10n ** 18n, tokenA, tokenB);
    if (!quote || !quote.splits || quote.splits.length === 0) return null;

    const firstRoute = quote.splits[0].route;
    if (!firstRoute || firstRoute.length === 0) return null;

    const poolKey = firstRoute[0].pool_key;
    return {
      fee: poolKey.fee,
      tick_spacing: Number(poolKey.tick_spacing),
      extension: poolKey.extension,
      tvl0_total: '0',
      tvl1_total: '0',
      fees0_24h: '0',
      fees1_24h: '0',
      volume0_24h: '0',
      volume1_24h: '0',
    };
  } catch (err) {
    console.warn('discoverPoolFromQuote: failed', err);
    return null;
  }
};

export const getBestPool = (pools: PoolInfo[]): PoolInfo | null => {
  if (pools.length === 0) return null;

  return pools.reduce((best, pool) => {
    const bestTvl = parseFloat(best.tvl0_total || "0") + parseFloat(best.tvl1_total || "0");
    const poolTvl = parseFloat(pool.tvl0_total || "0") + parseFloat(pool.tvl1_total || "0");
    return poolTvl > bestTvl ? pool : best;
  });
};

export const getFullRangeBounds = (tickSpacing: number): Bounds => {
  const alignedMax = Math.floor(EKUBO_MAX_TICK / tickSpacing) * tickSpacing;
  return {
    lower: { mag: num.toHex(alignedMax), sign: true },
    upper: { mag: num.toHex(alignedMax), sign: false },
  };
};

export const estimateApy = (fees24h: number, tvl: number): number => {
  if (tvl === 0) return 0;
  return (fees24h / tvl) * 365 * 100;
};

export const decodeFee = (fee: string): number => {
  return Number(BigInt(fee)) / Number(2n ** 128n);
};

export const calculatePairAmount = (
  gameTokenAmount: number,
  pricePerToken: number
): number => {
  return gameTokenAmount * pricePerToken;
};

export const generateAddLiquidityCalls = (
  positionsContract: string,
  poolKey: PoolKey,
  bounds: Bounds,
  amount0: bigint,
  amount1: bigint,
  minLiquidity: bigint
): SwapCall[] => {
  const transferToken0: SwapCall = {
    contractAddress: poolKey.token0,
    entrypoint: "transfer",
    calldata: [positionsContract, num.toHex(amount0), "0x0"],
  };

  const transferToken1: SwapCall = {
    contractAddress: poolKey.token1,
    entrypoint: "transfer",
    calldata: [positionsContract, num.toHex(amount1), "0x0"],
  };

  const mintAndDeposit: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "mint_and_deposit",
    calldata: [
      poolKey.token0,
      poolKey.token1,
      poolKey.fee,
      num.toHex(poolKey.tick_spacing),
      poolKey.extension,
      bounds.lower.mag,
      bounds.lower.sign ? "0x1" : "0x0",
      bounds.upper.mag,
      bounds.upper.sign ? "0x1" : "0x0",
      num.toHex(minLiquidity),
    ],
  };

  const clearToken0: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token0],
  };

  const clearToken1: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token1],
  };

  return [
    transferToken0,
    transferToken1,
    mintAndDeposit,
    clearToken0,
    clearToken1,
  ];
};

export interface EkuboPosition {
  id: string;
  chain_id: string;
  positions_address: string;
  pool_key: {
    token0: string;
    token1: string;
    fee: string;
    tick_spacing: string | null;
    extension: string;
  };
  bounds: {
    lower: number;
    upper: number;
  };
  liquidity: string;
  pool_state: {
    sqrt_ratio: string;
    tick: number;
    liquidity: string;
  } | null;
  rewards: Record<string, { amount: string; pending: string }>;
}

export interface PositionsResponse {
  data: EkuboPosition[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export const getPositionsForOwner = async (
  ownerAddress: string,
  positionsContract?: string
): Promise<EkuboPosition[]> => {
  const addr = ownerAddress.toLowerCase();
  const url = `${EKUBO_API_BASE}/positions/${addr}?state=opened&chainId=${EKUBO_CHAIN_ID}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch positions: ${response.status}`);
  }

  const data: PositionsResponse = await response.json();
  let positions = data.data || [];

  // Filter to only positions on our positions contract if specified
  if (positionsContract) {
    const normalizedContract = positionsContract.toLowerCase();
    positions = positions.filter(
      (p) => p.positions_address.toLowerCase() === normalizedContract
    );
  }

  return positions;
};

export const generateCollectFeesCalls = (
  positionsContract: string,
  positionId: string,
  poolKey: PoolKey,
  bounds: Bounds
): SwapCall[] => {
  const collectFees: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "collect_fees",
    calldata: [
      num.toHex(positionId),
      poolKey.token0,
      poolKey.token1,
      poolKey.fee,
      num.toHex(poolKey.tick_spacing),
      poolKey.extension,
      bounds.lower.mag,
      bounds.lower.sign ? "0x1" : "0x0",
      bounds.upper.mag,
      bounds.upper.sign ? "0x1" : "0x0",
    ],
  };

  const clearToken0: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token0],
  };

  const clearToken1: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token1],
  };

  return [collectFees, clearToken0, clearToken1];
};

export const generateWithdrawLiquidityCalls = (
  positionsContract: string,
  positionId: string,
  poolKey: PoolKey,
  bounds: Bounds,
  liquidity: bigint,
  minToken0: bigint,
  minToken1: bigint
): SwapCall[] => {
  // Collect fees first, then withdraw
  const collectFees: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "collect_fees",
    calldata: [
      num.toHex(positionId),
      poolKey.token0,
      poolKey.token1,
      poolKey.fee,
      num.toHex(poolKey.tick_spacing),
      poolKey.extension,
      bounds.lower.mag,
      bounds.lower.sign ? "0x1" : "0x0",
      bounds.upper.mag,
      bounds.upper.sign ? "0x1" : "0x0",
    ],
  };

  const withdraw: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "withdraw_v2",
    calldata: [
      num.toHex(positionId),
      poolKey.token0,
      poolKey.token1,
      poolKey.fee,
      num.toHex(poolKey.tick_spacing),
      poolKey.extension,
      bounds.lower.mag,
      bounds.lower.sign ? "0x1" : "0x0",
      bounds.upper.mag,
      bounds.upper.sign ? "0x1" : "0x0",
      num.toHex(liquidity),
      num.toHex(minToken0),
      num.toHex(minToken1),
    ],
  };

  const clearToken0: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token0],
  };

  const clearToken1: SwapCall = {
    contractAddress: positionsContract,
    entrypoint: "clear",
    calldata: [poolKey.token1],
  };

  return [collectFees, withdraw, clearToken0, clearToken1];
};

export const positionBoundsToContractBounds = (
  lower: number,
  upper: number
): Bounds => {
  return {
    lower: {
      mag: num.toHex(Math.abs(lower)),
      sign: lower < 0,
    },
    upper: {
      mag: num.toHex(Math.abs(upper)),
      sign: upper < 0,
    },
  };
};

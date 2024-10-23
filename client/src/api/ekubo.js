import { num } from "starknet"

export const getSwapQuote = async (amount, token, otherToken) => {
  const response = await fetch(`https://mainnet-api.ekubo.org/quote/${amount}/${token}/${otherToken}`)

  const data = await response.json()

  return {
    total: Number(data?.total || 0),
    splits: data?.splits || []
  }
}

export const generateSwapCalls = (ROUTER_CONTRACT, purchaseToken, potionQuotes) => {
  let totalQuoteSum = potionQuotes.reduce((sum, potionQuote) => {
    if (potionQuote.quote && potionQuote.quote.splits.length > 0) {
      const total = BigInt(potionQuote.quote.total);
      return sum + (total < 0n ? -total : total);
    }

    return sum;
  }, 0n);

  const doubledTotal = totalQuoteSum * 2n;
  totalQuoteSum = doubledTotal < (totalQuoteSum + BigInt(1e19)) ? doubledTotal : (totalQuoteSum + BigInt(1e19));

  const transferCall = {
    contractAddress: purchaseToken,
    entrypoint: "transfer",
    calldata: [ROUTER_CONTRACT.address, num.toHex(totalQuoteSum), "0x0"],
  };

  const clearCall = {
    contractAddress: ROUTER_CONTRACT.address,
    entrypoint: "clear",
    calldata: [purchaseToken],
  };

  let swapCalls = potionQuotes.map(potionQuote => {
    let { tokenAddress, minimumAmount, quote } = potionQuote;

    if (!quote || quote.splits.length === 0) {
      return []
    }

    let { splits } = quote;

    const clearProfitsCall = ROUTER_CONTRACT.populate("clear_minimum", [
      { contract_address: tokenAddress },
      minimumAmount * 1e18,
    ]);

    if (splits.length === 1) {
      const split = splits[0];

      if (split.route.length === 1) {
        throw new Error("unexpected single hop route");
      }

      return [
        {
          contractAddress: ROUTER_CONTRACT.address,
          entrypoint: "multihop_swap",
          calldata: [
            num.toHex(split.route.length),
            ...split.route.reduce((memo, routeNode) => {
              const isToken1 = BigInt(memo.token) === BigInt(routeNode.pool_key.token1);

              return {
                token: isToken1 ? routeNode.pool_key.token0 : routeNode.pool_key.token1,
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
            }, {
              token: tokenAddress,
              encoded: [],
            }).encoded,
            tokenAddress,
            num.toHex(BigInt(split.specifiedAmount) < 0n ? -BigInt(split.specifiedAmount) : BigInt(split.specifiedAmount)),
            "0x1",
          ],
        },
        clearProfitsCall,
      ]
    }

    return [
      {
        contractAddress: ROUTER_CONTRACT.address,
        entrypoint: "multi_multihop_swap",
        calldata: [
          num.toHex(splits.length),
          ...splits.reduce((memo, split) => {
            return memo.concat([
              num.toHex(split.route.length),
              ...split.route.reduce((memo, routeNode) => {
                const isToken1 = BigInt(memo.token) === BigInt(routeNode.pool_key.token1);

                return {
                  token: isToken1 ? routeNode.pool_key.token0 : routeNode.pool_key.token1,
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
              tokenAddress,
              num.toHex(BigInt(split.specifiedAmount) < 0n ? -BigInt(split.specifiedAmount) : BigInt(split.specifiedAmount)),
              "0x1",
            ]);
          }, []),
        ],
      },
      clearProfitsCall
    ]
  })

  return [
    transferCall,
    ...swapCalls.flat(),
    clearCall
  ]
}

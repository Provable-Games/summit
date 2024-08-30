import { gql, request } from 'graphql-request';
import { dojoConfig } from '../../dojoConfig';
import { beastDetails } from '../helpers/beasts';

export const getBeasts = async (owner) => {
  let env = import.meta.env.VITE_PUBLIC_STARKNET_ENV

  if (env === 'mainnet') {
    return getBeastsMainnet(owner)
  }

  if (env === 'sepolia') {
    return getBeastsSepolia(owner)
  }
}

export const getBeastsMainnet = async (owner) => {
  const blastUrl = import.meta.env.VITE_PUBLIC_BLAST_API;
  const beastAddress = import.meta.env.VITE_PUBLIC_BEAST_ADDRESS;

  const recursiveFetchBeast = async (beasts, nextPageKey) => {
    let url = `${blastUrl}/builder/getWalletNFTs?contractAddress=${beastAddress}&walletAddress=${owner}&pageSize=100`

    if (nextPageKey) {
      url += `&pageKey=${nextPageKey}`
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      beasts = beasts.concat(data.nfts)

      if (data.nextPageKey) {
        return recursiveFetchBeast(beasts, data.nextPageKey)
      }
    } catch (ex) {
      console.log('error fetching beasts', ex)
    }

    return beasts
  }

  let beasts = await recursiveFetchBeast([], null)

  return beasts.map(beast => {
    const attributesString = beast.tokenUri.match(/"attributes":\[(.*?)\]/)[0];
    const attributesObject = JSON.parse(`{${attributesString}}`).attributes;

    const attributesMap = attributesObject.reduce((acc, attr) => {
      acc[attr.trait_type] = attr.value;
      return acc;
    }, {});

    return {
      id: beast.tokenId,
      ...attributesMap
    }
  })
};

const lookupSepoliaBeast = async (tokenId) => {
  const beastAddress = import.meta.env.VITE_PUBLIC_BEAST_ADDRESS;

  const response = await fetch(dojoConfig.rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "starknet_call",
      params: [
        {
          contract_address: beastAddress,
          entry_point_selector:
            "0x03c33074b453a90f8316fd3ae69336ca824f1bd05a50220c1681c79465b227a9",
          calldata: ["0x" + tokenId.toString(16), "0x0"],
        },
        "pending",
      ],
      id: 0,
    }),
  });

  const data = await response.json();

  if (data.result) {
    return {
      id: tokenId,
      ...beastDetails(parseInt(data.result[0], 16), parseInt(data.result[1], 16), parseInt(data.result[2], 16)),
      level: parseInt(data.result[3], 16),
      health: parseInt(data.result[4], 16)
    }
  }
  return data;
};

export const getBeastsSepolia = async (owner) => {
  const indexerUrl = import.meta.env.VITE_PUBLIC_LS_INDEXER;

  const document = gql`
  {
    beastTokens(where: {ownerAddress: {eq: "${owner}"}}) {
      tokenId
    }
  }`

  const res = await request(indexerUrl, document)

  let beasts = await Promise.all(
    res.beastTokens.map(async token => await lookupSepoliaBeast(token.tokenId))
  )

  return beasts
}
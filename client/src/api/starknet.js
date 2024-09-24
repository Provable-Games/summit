import { gql, request } from 'graphql-request';
import { dojoConfig } from '../../dojoConfig';
import { beastDetails } from '../helpers/beasts';

const BLAST_URL = import.meta.env.VITE_PUBLIC_BLAST_API;
const BEAST_ADDRESS = import.meta.env.VITE_PUBLIC_BEAST_ADDRESS;
const LS_ADDRESS = import.meta.env.VITE_PUBLIC_LS_ADDRESS;

export const getBeasts = async (owner) => {
  let env = import.meta.env.VITE_PUBLIC_CHAIN

  if (env === 'mainnet') {
    return getBeastsMainnet(owner)
  }

  if (env === 'sepolia') {
    return getBeastsSepolia(owner)
  }
}

export const getTotalBeasts = async () => {
  let url = `${BLAST_URL}/builder/getNFTCollection?contractAddress=${BEAST_ADDRESS}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data.totalSupply
}

export const getBeastsMainnet = async (owner) => {
  const recursiveFetchBeast = async (beasts, nextPageKey) => {
    let url = `${BLAST_URL}/builder/getWalletNFTs?contractAddress=${BEAST_ADDRESS}&walletAddress=${owner}&pageSize=100`

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
      acc[attr.trait_type] = isNaN(attr.value) ? attr.value : Number(attr.value);
      return acc;
    }, {});

    return {
      id: Number(beast.tokenId),
      ...attributesMap
    }
  })
};

export const getBeastDetails = async (tokenId) => {
  let url = `${BLAST_URL}/builder/getNFT?contractAddress=${BEAST_ADDRESS}&tokenId=${tokenId}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  
  const attributesString = data.tokenUri.match(/"attributes":\[(.*?)\]/)[0];
  const attributesObject = JSON.parse(`{${attributesString}}`).attributes;

  const attributesMap = attributesObject.reduce((acc, attr) => {
    acc[attr.trait_type] = isNaN(attr.value) ? attr.value : Number(attr.value);
    return acc;
  }, {});

  return {
    id: Number(tokenId),
    owner: data.ownerAddress,
    ...attributesMap
  }
}

export const getAdventurers = async (owner) => {
  const recursiveFetch = async (adventurers, nextPageKey) => {
    let url = `${BLAST_URL}/builder/getWalletNFTs?contractAddress=${LS_ADDRESS}&walletAddress=${owner}&pageSize=100`

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
      adventurers = adventurers.concat(data?.nfts?.map(adventurer => {
        const metadata = JSON.parse(adventurer.tokenMetadata);

        const attributesMap = metadata.attributes.reduce((acc, attr) => {
          acc[attr.trait] = isNaN(attr.value) ? attr.value : Number(attr.value);
          return acc;
        }, {});

        return {
          id: Number(adventurer.tokenId),
          name: attributesMap.Name
        }
      }))

      if (data.nextPageKey) {
        return recursiveFetch(adventurers, data.nextPageKey)
      }
    } catch (ex) {
      console.log('error fetching adventurers', ex)
    }

    return adventurers
  }

  let adventurerData = await recursiveFetch([], null)
  let adventurers = []

  for (const adventurer of adventurerData) {
    const details = await getAdventurerDetails(adventurer.id)

    adventurers.push({
      ...adventurer,
      ...details
    })
  }

  return adventurers
}

export const getAdventurerDetails = async (tokenId) => {
  let storedDetails = JSON.parse(localStorage.getItem('adventurerDetails') ?? '{}')
  if (storedDetails[tokenId]) {
    return storedDetails[tokenId]
  }

  try {
    const adventurer_response = await fetch(BLAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "starknet_call",
        params: [
          {
            contract_address: LS_ADDRESS,
            entry_point_selector: "0x003d3148be1dfdfcfcd22f79afe7aee5a3147ef412bfb2ea27949e7f8c8937a7",
            calldata: [tokenId.toString(16)],
          },
          "pending",
        ],
        id: 0,
      }),
    });

    const data = await adventurer_response.json();
    let adventurer = {
      id: tokenId,
      health: parseInt(data.result[0], 16),
      level: Math.max(1, Math.floor(Math.sqrt(parseInt(data.result[1], 16)))),
    }

    const adventurer_meta_response = await fetch(BLAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "starknet_call",
        params: [
          {
            contract_address: LS_ADDRESS,
            entry_point_selector: "0x03c18cf73012bfe808cdad3d8dc5215379bbf8184c97e36b6fcbe973280cae04",
            calldata: [tokenId.toString(16)],
          },
          "pending",
        ],
        id: 0,
      }),
    });

    const meta_data = await adventurer_meta_response.json();
    adventurer.rank = parseInt(meta_data.result[4], 16);

    storedDetails[tokenId] = adventurer
    localStorage.setItem('adventurerDetails', JSON.stringify(storedDetails))

    return adventurer || {}
  } catch (ex) {
    console.log('error fetching adventurer details')
    return {}
  }
}

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
  return []
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
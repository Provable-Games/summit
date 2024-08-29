export const getBeasts = async (owner) => {
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
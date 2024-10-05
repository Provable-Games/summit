export const getTokenPrice = async (token, amount) => {
  const response = await fetch(`https://mainnet-api.ekubo.org/quote/${amount}/ETH/${token}`)

  const data = await response.json()
  return data.amount
}
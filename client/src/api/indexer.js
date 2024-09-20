import { gql, request } from 'graphql-request';

const GRAPH_URL = import.meta.env.VITE_PUBLIC_TORII_GRAPHQL

export async function fetchDeadBeastCount() {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const twentyThreeHoursAgoInSeconds = nowInSeconds - 23 * 60 * 60;

  const document = gql`
  {
    savageSummitLiveBeastStatsModels(where: { last_death_timestampGT: "${twentyThreeHoursAgoInSeconds}" }) {
      totalCount
    }
  }`

  try {
    const res = await request(GRAPH_URL, document)
    return res?.savageSummitLiveBeastStatsModels?.totalCount ?? 0
  } catch (ex) {
    return 0
  }
}

export async function fetchSummitBeastTokenId() {
  const document = gql`
  {
    savageSummitSummitModels (limit:1) {
      edges {
        node {
          beast_token_id
        }
      }
    }
  }`

  try {
    const res = await request(GRAPH_URL, document)
    return res?.savageSummitSummitModels?.edges[0]?.node?.beast_token_id
  } catch (ex) {

  }
}

export async function fetchBeastLiveData(tokenIds) {
  const document = gql`
  {
    savageSummitLiveBeastStatsModels (limit:10000, where:{
      token_idIN:[${tokenIds}]})
    {
      edges {
        node {
          token_id
          current_health
          last_death_timestamp
          bonus_health
          num_deaths
        }
      }
    }
  }`

  try {
    const res = await request(GRAPH_URL, document)
    let stats = res?.savageSummitLiveBeastStatsModels?.edges.map(edge => edge.node) ?? []

    stats = stats.map(stat => {
      const lastDeathTimestamp = parseInt(stat.last_death_timestamp, 16) * 1000; // convert to milliseconds
      const currentTime = Date.now();
      const hoursSinceDeath = (currentTime - lastDeathTimestamp) / (1000 * 60 * 60);
      return {
        ...stat,
        id: stat.token_id,
        isDead: hoursSinceDeath < 23,
        bonus_health: stat.bonus_health ?? 0
      }
    })

    return stats
  } catch (ex) {
    return []
  }
}

export async function fetchAdventurerData(adventurers) {
  let adventurerIds = adventurers.map(adventurer => `"${adventurer.id.toString()}"`);

  const document = gql`
  {
    savageSummitAdventurerModels (limit:10000, where:{
      token_idIN:[${adventurerIds}]}
    ){
      edges {
        node {
          token_id
          beast_token_id
        }
      }
    }
  }`

  try {
    const res = await request(GRAPH_URL, document)
    let nodeData = res?.savageSummitAdventurerModels?.edges.map(edge => edge.node) ?? []

    nodeData = nodeData.map(adventurer => {
      return parseInt(adventurer.token_id, 16)
    })

    return nodeData
  } catch (ex) {
    return []
  }
}
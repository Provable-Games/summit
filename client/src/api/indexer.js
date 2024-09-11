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

  const res = await request(GRAPH_URL, document)
  return res?.savageSummitLiveBeastStatsModels?.totalCount ?? 0
}

export async function fetchSummitData() {
  const document = gql`
  {
    savageSummitLiveBeastStatsModels(limit:1, where:{current_healthGT:0}) {
      edges {
        node {
          token_id,
          current_health
        }
      }
    }
  }`

  const res = await request(GRAPH_URL, document)
  return res?.savageSummitLiveBeastStatsModels?.edges[0]?.node
}

export async function fetchBeastLiveData(tokenIds) {
  const document = gql`
  {
    savageSummitLiveBeastStatsModels (where:{
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
    }
  })

  return stats
}
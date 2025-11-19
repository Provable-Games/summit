import { useDynamicConnector } from "@/contexts/starknet";
import { GameQueryBuilder } from "@/types/game";

export const useQueries = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const gameEventsQuery = () => {
    return new GameQueryBuilder()
      .withEntityModels([
        `${currentNetworkConfig.namespace}-SummitEvent`,
        `${currentNetworkConfig.namespace}-BattleEvent`,
        `${currentNetworkConfig.namespace}-PoisonEvent`,
        `${currentNetworkConfig.namespace}-LiveBeastStatsEvent`,
      ])
      .withLimit(1)
  };

  return { gameEventsQuery };
};
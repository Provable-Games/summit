import { useDynamicConnector } from "@/contexts/starknet";
import { GameQueryBuilder } from "@/types/game";
import { KeysClause } from "@dojoengine/sdk";

export const useQueries = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const gameEventsQuery = () => {
    return new GameQueryBuilder()
      .withClause(
        KeysClause(
          [
            `${currentNetworkConfig.namespace}-SummitEvent`,
            `${currentNetworkConfig.namespace}-BattleEvent`,
            `${currentNetworkConfig.namespace}-PoisonEvent`,
            `${currentNetworkConfig.namespace}-LiveBeastStatsEvent`,
          ],
          []
        ).build()
      )
      .withEntityModels([
        `${currentNetworkConfig.namespace}-SummitEvent`,
        `${currentNetworkConfig.namespace}-BattleEvent`,
        `${currentNetworkConfig.namespace}-PoisonEvent`,
        `${currentNetworkConfig.namespace}-LiveBeastStatsEvent`,
      ])
      .withLimit(1)
  };

  const dungeonStatsQuery = () => {
    return new GameQueryBuilder()
      .withClause(
        KeysClause(
          [
            `ls_0_0_9-CollectableEntity`,
            `ls_0_0_9-EntityStats`,
          ],
          []
        ).build()
      )
      .withEntityModels([
        `ls_0_0_9-CollectableEntity`,
        `ls_0_0_9-EntityStats`,
      ])
      .withLimit(1)
      .includeHashedKeys()
  };

  return { gameEventsQuery, dungeonStatsQuery };
};
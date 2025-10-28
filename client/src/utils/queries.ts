import { useDynamicConnector } from "@/contexts/starknet";
import { GameQueryBuilder } from "@/types/game";
import { ClauseBuilder } from "@dojoengine/sdk";
import { addAddressPadding } from "starknet";

export const useQueries = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const gameEventsQuery = () => {
    return new GameQueryBuilder()
      .withEntityModels([
        `${currentNetworkConfig.namespace}-SummitEvent`,
        `${currentNetworkConfig.namespace}-BattleEvent`,
      ])
      .withLimit(1)
  };

  const gameModelsQuery = () => {
    return new GameQueryBuilder()
      .withEntityModels([
        `${currentNetworkConfig.namespace}-LiveBeastStats`,
      ])
      .withLimit(1)
  };

  return { gameEventsQuery, gameModelsQuery };
};
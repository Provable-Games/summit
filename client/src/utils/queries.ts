import { useDynamicConnector } from "@/contexts/starknet";
import { GameQueryBuilder } from "@/types/game";
import { ClauseBuilder } from "@dojoengine/sdk";
import { addAddressPadding } from "starknet";

export const useQueries = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const gameEventsQuery = (summitId: number) => {
    return new GameQueryBuilder()
      .withEntityModels([
        `${currentNetworkConfig.namespace}-RewardEvent`,
        `${currentNetworkConfig.namespace}-SummitEvent`,
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
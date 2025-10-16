import { useDynamicConnector } from "@/contexts/starknet";
import { GameQueryBuilder } from "@/types/game";
import { ClauseBuilder } from "@dojoengine/sdk";
import { addAddressPadding } from "starknet";

export const useQueries = () => {
  const { currentNetworkConfig } = useDynamicConnector();

  const gameEventsQuery = (summitId: number) => {
    return new GameQueryBuilder()
      .withClause(
        new ClauseBuilder().keys(
          [
            `${currentNetworkConfig.namespace}-GameEvent`,
          ],
          [addAddressPadding(`0x${summitId.toString(16)}`)]
        ).build()
      )
      .withEntityModels([
        `${currentNetworkConfig.namespace}-GameEvent`,
      ])
      .withLimit(10000)
  };

  const gameModelsQuery = () => {
    return new GameQueryBuilder()
      .withEntityModels([
        `${currentNetworkConfig.namespace}-LiveBeastStats`,
        `${currentNetworkConfig.namespace}-Summit`,
      ])
      .withLimit(1)
  };

  return { gameEventsQuery, gameModelsQuery };
};
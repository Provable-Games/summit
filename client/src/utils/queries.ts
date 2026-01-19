import { GameQueryBuilder } from "@/types/game";
import { KeysClause } from "@dojoengine/sdk";

export const useQueries = () => {
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

  return { dungeonStatsQuery };
};
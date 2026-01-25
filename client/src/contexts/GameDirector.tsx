import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useSound } from "@/contexts/sound";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useWebSocket, SummitData, EventData } from "@/hooks/useWebSocket";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, Diplomacy, GameAction, Summit } from "@/types/game";
import {
  applyPoisonDamage,
  getBeastCurrentHealth,
  getBeastCurrentLevel,
  getBeastDetails,
  getBeastRevivalTime,
} from "@/utils/beasts";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { useController } from "./controller";
import { useDynamicConnector } from "./starknet";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
  pauseUpdates: boolean;
}

export const START_TIMESTAMP = 1760947200;
export const TERMINAL_BLOCK = 7000000;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const {
    summit,
    setSummit,
    setAttackInProgress,
    collection,
    setCollection,
    setBattleEvents,
    setApplyingPotions,
    setAppliedExtraLifePotions,
    setSelectedBeasts,
  } = useGameStore();
  const {
    setRevivePotionsUsed,
    setAttackPotionsUsed,
    setExtraLifePotionsUsed,
    setPoisonPotionsUsed,
  } = useAutopilotStore();
  const { getSummitData } = useStarknetApi();
  const { getDiplomacy } = useSummitApi();
  const {
    executeAction,
    attack,
    feed,
    claimBeastReward,
    claimCorpses,
    claimSkulls,
    addExtraLife,
    applyStatPoints,
    applyPoison,
  } = useSystemCalls();
  const { tokenBalances, setTokenBalances } = useController();
  const { play } = useSound();

  const [nextSummit, setNextSummit] = useState<Summit | null>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  const handleSummit = (data: SummitData) => {
    console.log("[GameDirector] Summit update:", data);

    const current_level = getBeastCurrentLevel(data.level, data.bonus_xp);
    const sameBeast = summit?.beast.token_id === data.token_id;

    setNextSummit({
      beast: {
        ...data,
        ...getBeastDetails(data.beast_id, data.prefix, data.suffix, current_level),
        id: data.beast_id,
        current_level,
        revival_time: 0,
        kills_claimed: 0,
      } as Beast,
      owner: data.owner,
      taken_at: sameBeast ? summit.taken_at : data.block_number,
      poison_count: sameBeast ? summit.poison_count : 0,
      poison_timestamp: sameBeast ? summit.poison_timestamp : 0,
    });
  };

  const handleEvent = (data: EventData) => {
    console.log("[GameDirector] Event:", data.category, data.sub_category, data.data);
  };

  // WebSocket subscription
  useWebSocket({
    url: currentNetworkConfig.wsUrl,
    channels: ["summit", "event"],
    onSummit: handleSummit,
    onEvent: handleEvent,
    onConnectionChange: (state) => {
      console.log("[GameDirector] WebSocket connection state:", state);
    },
  });

  useEffect(() => {
    fetchSummitData();
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setApplyingPotions(false);
  }, [actionFailed]);

  useEffect(() => {
    async function processNextSummit() {
      let newSummit = { ...nextSummit };
      const { currentHealth, extraLives } = applyPoisonDamage(newSummit);
      newSummit.beast.current_health = currentHealth;
      newSummit.beast.extra_lives = extraLives;

      setSelectedBeasts([]);
      setSummit(newSummit);
      setNextSummit(null);
    }

    if (nextSummit && !pauseUpdates) {
      processNextSummit();
    }
  }, [nextSummit, pauseUpdates]);

  // Play roar and fetch diplomacy when summit beast changes
  useEffect(() => {
    if (!summit?.beast.token_id) return;

    play("roar");

    // Fetch diplomacy if not already set
    if (!summit.diplomacy && summit.beast.diplomacy) {
      const fetchDiplomacy = async () => {
        try {
          const beasts = await getDiplomacy(
            summit.beast.prefix,
            summit.beast.suffix
          );

          if (beasts.length > 0) {
            const totalPower = beasts.reduce((sum, b) => sum + b.power, 0);
            const adjustedPower = summit.beast.diplomacy ? totalPower - summit.beast.power : totalPower;
            const bonus = Math.floor(adjustedPower / 250);

            setSummit(prev => prev ? { ...prev, diplomacy: { beasts, totalPower, bonus } } : prev);
          }
        } catch (error) {
          console.error("[GameDirector] Failed to fetch diplomacy:", error);
        }
      };

      fetchDiplomacy();
    }
  }, [summit?.beast.token_id]);

  const fetchSummitData = async () => {
    const summitBeast = await getSummitData();
    if (summitBeast) {
      setNextSummit(summitBeast);
    }
  };

  const updateLiveStats = (beastLiveStats: any[]) => {
    if (beastLiveStats.length === 0) return;

    beastLiveStats = beastLiveStats.reverse();

    setCollection((prevCollection) =>
      prevCollection.map((beast: Beast) => {
        let beastLiveStat = beastLiveStats.find(
          (liveStat: any) => liveStat.token_id === beast.token_id
        );

        if (beastLiveStat) {
          let newBeast = { ...beast, ...beastLiveStat };
          newBeast.current_health = getBeastCurrentHealth(newBeast);
          newBeast.revival_time = getBeastRevivalTime(newBeast);
          newBeast.current_level = getBeastCurrentLevel(
            newBeast.level,
            newBeast.bonus_xp
          );
          newBeast.power = (6 - newBeast.tier) * newBeast.current_level;
          return newBeast;
        } else {
          return beast;
        }
      })
    );
  };

  const executeGameAction = async (action: GameAction) => {
    let txs: any[] = [];

    if (action.pauseUpdates) {
      setPauseUpdates(true);
    }

    if (action.type === "attack") {
      setBattleEvents([]);
      setAttackInProgress(true);
      txs.push(
        ...attack(
          action.beasts,
          action.safeAttack,
          action.vrf,
          action.extraLifePotions
        )
      );
    }

    if (action.type === "attack_until_capture") {
      if (action.beasts.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(...attack(action.beasts, false, true, action.extraLifePotions));
    }

    if (action.type === "claim_starter_pack") {
      txs.push(claimBeastReward(action.beastIds));
    }

    if (action.type === "claim_corpse_reward") {
      txs.push(claimCorpses(action.adventurerIds));
    }

    if (action.type === "claim_skull_reward") {
      txs.push(claimSkulls(action.beastIds));
    }

    if (action.type === "add_extra_life") {
      txs.push(...addExtraLife(action.beastId, action.extraLifePotions));
    }

    if (action.type === "upgrade_beast") {
      if (action.bonusHealth > 0) {
        txs.push(...feed(action.beastId, action.bonusHealth, action.corpseTokens));
      }
      if (action.killTokens > 0) {
        txs.push(
          ...applyStatPoints(action.beastId, action.stats, action.killTokens)
        );
      }
    }

    if (action.type === "apply_poison") {
      txs.push(...applyPoison(action.beastId, action.count));
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events) {
      setActionFailed();
      return false;
    }

    updateLiveStats(
      events.filter((event: any) => event.componentName === "LiveBeastStatsEvent")
    );
    let captured = events
      .filter((event: any) => event.componentName === "BattleEvent")
      .find(
        (event: BattleEvent) =>
          event.attack_count + event.critical_attack_count >
          event.counter_attack_count + event.critical_counter_attack_count
      );

    if (action.type === "attack" || action.type === "attack_until_capture") {
      let summitEvent = events.find(
        (event: any) => event.componentName === "Summit"
      );
      if (summitEvent) {
        setTokenBalances({
          ...tokenBalances,
          ATTACK: tokenBalances["ATTACK"] - summitEvent.attack_potions,
          EXTRA_LIFE:
            tokenBalances["EXTRA LIFE"] -
            (captured ? summitEvent.extra_life_potions : 0),
          REVIVE: tokenBalances["REVIVE"] - summitEvent.revival_potions,
        });

        setAttackPotionsUsed((prev) => prev + summitEvent.attack_potions);
        setRevivePotionsUsed((prev) => prev + summitEvent.revival_potions);
        setExtraLifePotionsUsed((prev) => prev + summitEvent.extra_life_potions);
        setAppliedExtraLifePotions(0);
      }
    }

    if (action.type === "attack") {
      if (action.pauseUpdates) {
        setBattleEvents(
          events.filter((event: any) => event.componentName === "BattleEvent")
        );
      } else {
        setAttackInProgress(false);
      }
    } else if (action.type === "attack_until_capture" && captured) {
      setAttackInProgress(false);
      return false;
    } else if (action.type === "add_extra_life") {
      setTokenBalances({
        ...tokenBalances,
        EXTRA_LIFE: tokenBalances["EXTRA LIFE"] - action.extraLifePotions,
      });
      setApplyingPotions(false);
      setAppliedExtraLifePotions(0);
      setExtraLifePotionsUsed((prev) => prev + action.extraLifePotions);
    } else if (action.type === "apply_poison") {
      setTokenBalances({
        ...tokenBalances,
        POISON: tokenBalances["POISON"] - action.count,
      });
      setApplyingPotions(false);
      setPoisonPotionsUsed((prev) => prev + action.count);
    } else if (action.type === "upgrade_beast") {
      setTokenBalances({
        ...tokenBalances,
        SKULL: tokenBalances["SKULL"] - action.killTokens,
        CORPSE: tokenBalances["CORPSE"] - action.corpseTokens,
      });
    }

    return true;
  };

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
        setPauseUpdates,
        pauseUpdates,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};

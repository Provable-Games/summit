import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useSound } from "@/contexts/sound";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { EventData, SummitData, useWebSocket } from "@/hooks/useWebSocket";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { BattleEvent, Beast, GameAction, SpectatorBattleEvent, Summit } from "@/types/game";
import { ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import {
  applyPoisonDamage,
  getBeastCurrentHealth,
  getBeastCurrentLevel,
  getBeastDetails,
  getBeastRevivalTime,
} from "@/utils/beasts";
import { useAccount } from "@starknet-react/core";
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
import { addAddressPadding } from "starknet";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<boolean>;
  actionFailed: number;
  setPauseUpdates: (pause: boolean) => void;
  pauseUpdates: boolean;
}

export const START_TIMESTAMP = 1769683726;
export const SUMMIT_DURATION_SECONDS = 4320000;
export const SUMMIT_REWARDS_PER_SECOND = 0.01;
export const MAX_BEASTS_PER_ATTACK = 295;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { account } = useAccount();
  const { currentNetworkConfig } = useDynamicConnector();
  const {
    summit,
    setSummit,
    setAttackInProgress,
    collection,
    setCollection,
    setBattleEvents,
    setSpectatorBattleEvents,
    setApplyingPotions,
    setAppliedExtraLifePotions,
    setSelectedBeasts,
    poisonEvent,
    setPoisonEvent,
    addLiveEvent,
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
    const current_level = getBeastCurrentLevel(data.level, data.bonus_xp);
    const sameBeast = summit?.beast.token_id === data.token_id;

    // If summit beast changed and we owned it, mark it as dead in our collection
    if (!sameBeast && summit?.beast.token_id) {
      if (collection.some(b => b.token_id === summit.beast.token_id)) {
        const now = Math.floor(Date.now() / 1000);
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.token_id === summit.beast.token_id
              ? { ...beast, last_death_timestamp: now, current_health: 0 }
              : beast
          )
        );
      }
    }

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
      block_timestamp: sameBeast ? summit.block_timestamp : Date.now() / 1000,
      poison_count: sameBeast ? summit.poison_count : 0,
      poison_timestamp: sameBeast ? summit.poison_timestamp : 0,
    });
  };

  const handleEvent = (data: EventData) => {
    // Add to live events for EventHistoryModal
    addLiveEvent(data);

    const { category, sub_category, data: eventData } = data;

    // Handle Battle events
    if (category === "Battle") {
      if (sub_category === "BattleEvent") {
        // Add to spectator battle events for activity feed
        setSpectatorBattleEvents(prev => [...prev, eventData as unknown as SpectatorBattleEvent]);
      } else if (sub_category === "Applied Poison" && data.player !== addAddressPadding(account?.address)) {
        setPoisonEvent({
          beast_token_id: eventData.beast_token_id as number,
          block_timestamp: Math.floor(new Date(data.created_at).getTime() / 1000),
          count: eventData.count as number,
          player: data.player,
        });
      }
    }

    // Handle LS (Loot Survivor) Events - update collection beasts
    if (category === "LS Events") {
      const entityHash = eventData.entity_hash as string;

      if (sub_category === "EntityStats") {
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.entity_hash === entityHash
              ? { ...beast, adventurers_killed: Number(eventData.adventurers_killed) }
              : beast
          )
        );
      } else if (sub_category === "CollectableEntity") {
        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.entity_hash === entityHash
              ? {
                ...beast,
                last_killed_by: Number(eventData.last_killed_by),
                last_dm_death_timestamp: Number(eventData.timestamp),
              }
              : beast
          )
        );
      }
    }

    // Handle Beast Upgrade/Diplomacy - refresh diplomacy bonus if a matching beast upgraded
    if (category === "Beast Upgrade" && sub_category === "Diplomacy") {
      const prefix = eventData.prefix as number;
      const suffix = eventData.suffix as number;
      const prefixName = ITEM_NAME_PREFIXES[prefix as keyof typeof ITEM_NAME_PREFIXES];
      const suffixName = ITEM_NAME_SUFFIXES[suffix as keyof typeof ITEM_NAME_SUFFIXES];

      // Refresh diplomacy bonus if upgraded beast's name matches summit beast
      if (summit?.beast.prefix === prefixName && summit?.beast.suffix === suffixName) {
        getDiplomacy(prefix, suffix).then(beasts => {
          if (beasts.length > 0) {
            const totalPower = beasts.reduce((sum, b) => sum + b.power, 0);
            // Exclude summit beast's own power if it has diplomacy (can't give bonus to itself)
            const adjustedPower = summit.beast.diplomacy ? totalPower - summit.beast.power : totalPower;
            const bonus = Math.floor(adjustedPower / 250);
            setSummit(prev => prev ? { ...prev, diplomacy: { beasts, totalPower, bonus } } : prev);
          }
        });
      }
    }
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

  useEffect(() => {
    if (poisonEvent) {
      if (poisonEvent.beast_token_id === summit?.beast.token_id) {
        setSummit(prevSummit => ({
          ...prevSummit,
          poison_count: (prevSummit?.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }));
      } else if (poisonEvent.beast_token_id === nextSummit?.beast.token_id) {
        setNextSummit(prevSummit => ({
          ...prevSummit,
          poison_count: (prevSummit?.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }));
      }
    }
  }, [poisonEvent]);

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
      setSummit(prev => prev ? { ...prev, extra_lives: (prev.beast.extra_lives || 0) + action.extraLifePotions } : prev);
    } else if (action.type === "apply_poison") {
      setTokenBalances({
        ...tokenBalances,
        POISON: tokenBalances["POISON"] - action.count,
      });
      setApplyingPotions(false);
      setPoisonPotionsUsed((prev) => prev + action.count);
      setPoisonEvent({
        beast_token_id: action.beastId,
        block_timestamp: Math.floor(Date.now() / 1000),
        count: action.count,
        player: account?.address,
      })
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

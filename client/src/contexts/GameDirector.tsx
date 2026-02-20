import { useStarknetApi } from "@/api/starknet";
import { useSummitApi } from "@/api/summitApi";
import { useSound } from "@/contexts/sound";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import type { TranslatedGameEvent } from "@/dojo/useSystemCalls";
import type { EventData, SummitData } from "@/hooks/useWebSocket";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import type { BattleEvent, Beast, GameAction, SpectatorBattleEvent, Summit } from "@/types/game";
import { BEAST_NAMES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from "@/utils/BeastData";
import { fetchBeastImage } from "@/utils/beasts";
import { lookupAddressName } from "@/utils/addressNameCache";
import type {
  BattleEventTranslation,
  LiveBeastStatsEventTranslation,
  SummitEventTranslation,
} from "@/utils/translation";
import {
  applyPoisonDamage,
  getBeastCurrentHealth,
  getBeastCurrentLevel,
  getBeastDetails,
  getBeastRevivalTime,
} from "@/utils/beasts";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding, type Call } from "starknet";
import type {
  PropsWithChildren
} from "react";
import {
  createContext,
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

export const REWARD_NAME = "Survivor";
export const START_TIMESTAMP = 1771520400;
export const SUMMIT_DURATION_SECONDS = 8000000;
export const SUMMIT_REWARDS_PER_SECOND = 0.007;
export const DIPLOMACY_REWARDS_PER_SECOND = 0.00005;
export const MAX_BEASTS_PER_ATTACK = 295;
export const QUEST_REWARDS_TOTAL_AMOUNT = 36000;

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

const isLiveBeastStatsEvent = (
  event: TranslatedGameEvent
): event is LiveBeastStatsEventTranslation =>
  event.componentName === "LiveBeastStatsEvent";

const isBattleEvent = (
  event: TranslatedGameEvent
): event is BattleEventTranslation => event.componentName === "BattleEvent";

const isSummitEvent = (
  event: TranslatedGameEvent
): event is SummitEventTranslation => event.componentName === "Summit";

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
    sortMethod,
    poisonEvent,
    setPoisonEvent,
    addLiveEvent,
    addGameNotification,
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
    claimCorpses,
    claimSkulls,
    claimQuestRewards,
    claimRewards,
    addExtraLife,
    applyStatPoints,
    applyPoison,
  } = useSystemCalls();
  const { tokenBalances: _tokenBalances, setTokenBalances } = useController();
  const { play } = useSound();

  const [nextSummit, setNextSummit] = useState<Summit | null>(null);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [pauseUpdates, setPauseUpdates] = useState(false);

  const handleSummit = (data: SummitData) => {
    const current_level = getBeastCurrentLevel(data.level, data.bonus_xp);
    const sameBeast = summit?.beast.token_id === data.token_id;
    const previousSummit = sameBeast ? summit : null;

    // If summit beast changed and we owned it, mark it as dead in our collection
    if (!sameBeast && summit?.beast.token_id) {
      if (collection.some(b => b.token_id === summit.beast.token_id)) {
        const now = Math.floor(Date.now() / 1000);
        const secondsHeld = now - summit.block_timestamp;

        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.token_id === summit.beast.token_id
              ? { ...beast, last_death_timestamp: now, current_health: 0, summit_held_seconds: beast.summit_held_seconds + (secondsHeld > 5 ? secondsHeld : 0) }
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
      owner: data.owner ?? "",
      block_timestamp: previousSummit?.block_timestamp ?? Date.now() / 1000,
      poison_count: previousSummit?.poison_count ?? 0,
      poison_timestamp: sameBeast ? Date.now() / 1000 : 0,
    });
  };

  const handleEvent = (data: EventData) => {
    // Add to live events for EventHistoryModal
    addLiveEvent(data);

    const { category, sub_category, data: eventData } = data;
    const isOwnEvent = data.player === addAddressPadding(account?.address ?? "");

    // Helper to get beast info from event data
    const getBeastInfo = () => {
      const beastId = eventData.beast_id as number;
      const beastPrefix = eventData.prefix as number | undefined;
      const beastSuffix = eventData.suffix as number | undefined;
      const beastTypeName = BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] || 'Unknown';
      const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
      const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

      let fullBeastName: string;
      if (prefixName && suffixName && beastTypeName) {
        fullBeastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
      } else if (beastTypeName) {
        fullBeastName = beastTypeName;
      } else {
        fullBeastName = `Beast #${eventData.token_id || 'Unknown'}`;
      }

      const beastImageSrc = fetchBeastImage({ name: beastTypeName, shiny: false, animated: false });
      return { beastName: fullBeastName, beastImageSrc };
    };

    // Helper to add notification with player name lookup
    const addNotificationWithPlayer = (notification: Parameters<typeof addGameNotification>[0]) => {
      if (data.player) {
        lookupAddressName(data.player).then(playerName => {
          addGameNotification({ ...notification, playerName: playerName || 'Unknown' });
        }).catch(() => {
          addGameNotification({ ...notification, playerName: 'Unknown' });
        });
      } else {
        addGameNotification(notification);
      }
    };

    // Handle Battle events
    if (category === "Battle") {
      if (sub_category === "BattleEvent") {
        // Add to spectator battle events for activity feed
        setSpectatorBattleEvents(prev => [...prev, eventData as unknown as SpectatorBattleEvent]);

        // Show battle notification (only for other players)
        const damage = eventData.total_damage as number;
        const xpGained = eventData.xp_gained as number | undefined;
        const attackPotions = eventData.attack_potions as number | undefined;
        const revivePotions = eventData.revive_potions as number | undefined;
        const beastCount = eventData.beast_count as number | undefined;
        addNotificationWithPlayer({
          type: 'battle',
          value: damage,
          xpGained,
          attackPotions,
          revivePotions,
          beastCount,
        });
      } else if (sub_category === "Applied Poison") {
        if (!isOwnEvent) {
          setPoisonEvent({
            beast_token_id: eventData.beast_token_id as number,
            block_timestamp: Math.floor(new Date(data.created_at).getTime() / 1000),
            count: eventData.count as number,
            player: data.player,
          });
        }

        // Show poison notification
        addNotificationWithPlayer({
          type: 'poison',
          value: eventData.count as number,
        });
      } else if (sub_category === "Applied Extra Life") {
        const { beastName, beastImageSrc } = getBeastInfo();
        addNotificationWithPlayer({
          type: 'extra_life',
          value: eventData.difference as number,
          beastName,
          beastImageSrc,
        });
      } else if (sub_category === "Summit Change") {
        const { beastName, beastImageSrc } = getBeastInfo();
        const extraLives = eventData.extra_lives as number | undefined;
        addNotificationWithPlayer({
          type: 'summit_change',
          beastName,
          beastImageSrc,
          extraLives,
        });
      }
    }

    // Handle LS (Loot Survivor) Events - update collection beasts
    if (category === "LS Events") {
      const entityHash = eventData.entity_hash as string;
      const { beastName, beastImageSrc } = getBeastInfo();

      if (sub_category === "EntityStats") {
        // Find the beast in collection to check if kills increased
        const matchingBeast = collection.find(b => b.entity_hash === entityHash);
        const previousKills = matchingBeast?.adventurers_killed || 0;
        const newKills = Number(eventData.adventurers_killed);

        // Show kill notification when a beast kills an adventurer
        if (newKills > previousKills) {
          addNotificationWithPlayer({
            type: 'kill',
            beastName,
            beastImageSrc,
          });
        }

        setCollection(prevCollection =>
          prevCollection.map(beast =>
            beast.entity_hash === entityHash
              ? { ...beast, adventurers_killed: Number(eventData.adventurers_killed) }
              : beast
          )
        );
      } else if (sub_category === "CollectableEntity") {
        // Show locked notification when a beast is killed in LS
        addNotificationWithPlayer({
          type: 'locked',
          beastName,
          beastImageSrc,
        });

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

    // Handle Beast Upgrade events - show notifications and refresh diplomacy
    if (category === "Beast Upgrade") {
      const { beastName, beastImageSrc } = getBeastInfo();

      // Show notifications for upgrades (only for other players)
      const upgradeTypeMap: Record<string, Parameters<typeof addGameNotification>[0]['type']> = {
        'Specials': 'specials',
        'Wisdom': 'wisdom',
        'Diplomacy': 'diplomacy',
        'Spirit': 'spirit',
        'Luck': 'luck',
        'Bonus Health': 'bonus_health',
      };

      const notificationType = upgradeTypeMap[sub_category];
      if (notificationType) {
        // For numeric upgrades, show the difference
        const oldValue = eventData.old_value as number | undefined;
        const newValue = eventData.new_value as number | undefined;
        const diff = (oldValue !== undefined && newValue !== undefined) ? newValue - oldValue : undefined;

        // For Bonus Health, use amount field
        const value = sub_category === 'Bonus Health'
          ? (eventData.amount as number) || (eventData.bonus_health as number) || diff
          : diff;

        addNotificationWithPlayer({
          type: notificationType,
          value: value,
          beastName,
          beastImageSrc,
          oldValue,
          newValue,
        });
      }

      // Refresh diplomacy bonus if a matching beast upgraded diplomacy
      if (sub_category === "Diplomacy") {
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
    }

    // Handle Rewards events
    if (category === "Rewards") {
      if (sub_category === "$SURVIVOR Earned") {
        const rawAmount = typeof eventData.amount === 'number' ? eventData.amount : parseFloat(String(eventData.amount)) || 0;
        const amount = parseFloat((rawAmount / 100000).toFixed(2));
        addNotificationWithPlayer({
          type: 'survivor_earned',
          value: amount,
        });
      } else if (sub_category === "Claimed $SURVIVOR") {
        const rawAmount = typeof eventData.amount === 'number' ? eventData.amount : parseFloat(String(eventData.amount)) || 0;
        const amount = parseFloat((rawAmount / 100000).toFixed(2));

        addNotificationWithPlayer({
          type: 'claimed_survivor',
          value: amount,
        });
      } else if (sub_category === "Claimed Corpses") {
        const corpseAmount = (eventData.corpse_amount as number) || 1;
        const adventurerCount = (eventData.adventurer_count as number) || 1;
        addNotificationWithPlayer({
          type: 'claimed_corpses',
          value: corpseAmount,
          adventurerCount,
        });
      } else if (sub_category === "Claimed Skulls") {
        const skullsClaimed = eventData.skulls_claimed
          ? (typeof eventData.skulls_claimed === 'string' ? parseInt(eventData.skulls_claimed, 10) : (eventData.skulls_claimed as number))
          : 1;
        addNotificationWithPlayer({
          type: 'claimed_skulls',
          value: skullsClaimed,
        });
      }
    }

    // Handle Market events (potion buys/sells via Ekubo)
    if (category === "Market") {
      if (sub_category === "Bought Potions") {
        const amount = (eventData.amount as number) || 1;
        const token = (eventData.token as string) || "Potion";
        addNotificationWithPlayer({
          type: 'bought_potions',
          value: amount,
          tokenName: token,
        });
      } else if (sub_category === "Sold Potions") {
        const amount = (eventData.amount as number) || 1;
        const token = (eventData.token as string) || "Potion";
        addNotificationWithPlayer({
          type: 'sold_potions',
          value: amount,
          tokenName: token,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAttackInProgress(false);
    setApplyingPotions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFailed]);

  useEffect(() => {
    async function processNextSummit(currentSummit: Summit) {
      const newSummit: Summit = {
        ...currentSummit,
        beast: { ...currentSummit.beast },
      };
      const { currentHealth, extraLives } = applyPoisonDamage(newSummit);
      newSummit.beast.current_health = currentHealth;
      newSummit.beast.extra_lives = extraLives;

      setSummit(newSummit);
      setNextSummit(null);
    }

    if (nextSummit && !pauseUpdates) {
      processNextSummit(nextSummit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSummit, pauseUpdates]);

  // Play roar and fetch diplomacy when summit beast changes
  useEffect(() => {
    if (!summit?.beast.token_id) return;

    play("roar");

    if (sortMethod === 'recommended') {
      setSelectedBeasts([]);
    }

    // Fetch diplomacy if not already set
    if (!summit.diplomacy) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast.token_id]);

  useEffect(() => {
    if (poisonEvent) {
      if (poisonEvent.beast_token_id === summit?.beast.token_id) {
        setSummit(prevSummit => prevSummit ? ({
          ...prevSummit,
          poison_count: (prevSummit.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }) : prevSummit);
      } else if (poisonEvent.beast_token_id === nextSummit?.beast.token_id) {
        setNextSummit(prevSummit => prevSummit ? ({
          ...prevSummit,
          poison_count: (prevSummit.poison_count || 0) + poisonEvent.count,
          poison_timestamp: poisonEvent.block_timestamp,
        }) : prevSummit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poisonEvent]);

  const fetchSummitData = async () => {
    const summitBeast = await getSummitData();
    if (summitBeast) {
      setNextSummit(summitBeast);
    }
  };

  const updateLiveStats = (beastLiveStats: LiveBeastStatsEventTranslation[]) => {
    if (beastLiveStats.length === 0) return;

    beastLiveStats = beastLiveStats.reverse();

    setCollection((prevCollection) =>
      prevCollection.map((beast: Beast) => {
        const beastLiveStat = beastLiveStats.find(
          (liveStat) => Number(liveStat.token_id) === beast.token_id
        );

        if (beastLiveStat) {
          const newBeast = { ...beast, ...beastLiveStat };
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
    const txs: Call[] = [];
    const shouldPauseUpdates = action.pauseUpdates === true;

    if (action.type === "attack") {
      const beasts = action.beasts ?? [];
      const safeAttack = action.safeAttack ?? false;
      const vrf = action.vrf ?? false;
      const extraLifePotions = action.extraLifePotions ?? 0;
      const attackCalls = attack(
        beasts,
        safeAttack,
        vrf,
        extraLifePotions
      );

      setBattleEvents([]);
      setAttackInProgress(true);
      if (attackCalls.length === 0) {
        setActionFailed();
        return false;
      }
      txs.push(...attackCalls);
    }

    if (action.type === "attack_until_capture") {
      const beasts = action.beasts ?? [];
      const extraLifePotions = action.extraLifePotions ?? 0;

      if (beasts.length === 0) {
        setActionFailed();
        return false;
      }

      txs.push(...attack(beasts, false, true, extraLifePotions));
    }

    if (action.type === "claim_corpse_reward") {
      txs.push(claimCorpses(action.adventurerIds ?? []));
    }

    if (action.type === "claim_skull_reward") {
      txs.push(claimSkulls(action.beastIds ?? []));
    }

    if (action.type === "claim_quest_reward") {
      txs.push(claimQuestRewards(action.beastIds ?? []));
    }

    if (action.type === "claim_summit_reward") {
      txs.push(claimRewards(action.beastIds ?? []));
    }

    if (action.type === "add_extra_life") {
      if (action.beastId === undefined) {
        setActionFailed();
        return false;
      }
      txs.push(...addExtraLife(action.beastId, action.extraLifePotions ?? 0));
    }

    if (action.type === "upgrade_beast") {
      if (action.beastId === undefined) {
        setActionFailed();
        return false;
      }

      const bonusHealth = action.bonusHealth ?? 0;
      const corpseTokens = action.corpseTokens ?? 0;
      const killTokens = action.killTokens ?? 0;

      if (bonusHealth > 0) {
        txs.push(...feed(action.beastId, bonusHealth, corpseTokens));
      }
      if (killTokens > 0 && action.stats) {
        txs.push(
          ...applyStatPoints(action.beastId, action.stats, killTokens)
        );
      }
    }

    if (action.type === "apply_poison") {
      if (action.beastId === undefined) {
        setActionFailed();
        return false;
      }
      txs.push(...applyPoison(action.beastId, action.count ?? 0));
    }

    if (shouldPauseUpdates) {
      setPauseUpdates(true);
    }

    const events = await executeAction(txs, setActionFailed);

    if (!events) {
      // Revert optimistic upgrade if tx failed
      if (action.type === "upgrade_beast") {
        setCollection(prev =>
          prev.map(b =>
            b.token_id === action.beastId
              ? {
                ...b,
                luck: b.luck - (action.stats?.luck ?? 0),
                spirit: b.spirit - (action.stats?.spirit ?? 0),
                specials: action.stats?.specials ? false : b.specials,
                wisdom: action.stats?.wisdom ? false : b.wisdom,
                diplomacy: action.stats?.diplomacy ? false : b.diplomacy,
                bonus_health: (b.bonus_health || 0) - (action.bonusHealth ?? 0),
              }
              : b
          )
        );
        setTokenBalances((prev: Record<string, number>) => ({
          ...prev,
          SKULL: (prev["SKULL"] || 0) + (action.killTokens ?? 0),
          CORPSE: (prev["CORPSE"] || 0) + (action.corpseTokens ?? 0),
        }));
      }

      setActionFailed();
      return false;
    }

    updateLiveStats(
      events.filter(isLiveBeastStatsEvent)
    );
    const captured = events
      .filter(isBattleEvent)
      .find(
        (event) => {
          const attackCount = Number(event.attack_count ?? 0);
          const criticalAttackCount = Number(event.critical_attack_count ?? 0);
          const counterAttackCount = Number(event.counter_attack_count ?? 0);
          const criticalCounterAttackCount = Number(event.critical_counter_attack_count ?? 0);

          return attackCount + criticalAttackCount >
            counterAttackCount + criticalCounterAttackCount;
        }
      );

    if (action.type === "attack" || action.type === "attack_until_capture") {
      const summitEvent = events.find(isSummitEvent);
      if (summitEvent) {
        const attackPotions = Number(summitEvent.attack_potions ?? 0);
        const extraLifePotions = Number(summitEvent.extra_life_potions ?? 0);
        const revivalPotions = Number(summitEvent.revival_potions ?? 0);

        setTokenBalances((prev: Record<string, number>) => ({
          ...prev,
          ATTACK: (prev["ATTACK"] || 0) - attackPotions,
          "EXTRA LIFE":
            (prev["EXTRA LIFE"] || 0) -
            (captured ? extraLifePotions : 0),
          REVIVE: (prev["REVIVE"] || 0) - revivalPotions,
        }));

        setAttackPotionsUsed((prev) => prev + attackPotions);
        setRevivePotionsUsed((prev) => prev + revivalPotions);
        setExtraLifePotionsUsed((prev) => prev + extraLifePotions);
        setAppliedExtraLifePotions(0);
      }
    }

    if (action.type === "attack") {
      if (action.pauseUpdates) {
        const battleEvents: BattleEvent[] = events
          .filter(isBattleEvent)
          .map(({ componentName: _componentName, ...battleEvent }) => battleEvent);
        setBattleEvents(battleEvents);
      } else {
        setAttackInProgress(false);
      }
    } else if (action.type === "attack_until_capture" && captured) {
      return false;
    } else if (action.type === "add_extra_life") {
      const extraLifePotions = action.extraLifePotions ?? 0;
      setTokenBalances((prev: Record<string, number>) => ({
        ...prev,
        "EXTRA LIFE": (prev["EXTRA LIFE"] || 0) - extraLifePotions,
      }));
      setApplyingPotions(false);
      setAppliedExtraLifePotions(0);
      setExtraLifePotionsUsed((prev) => prev + extraLifePotions);
      setSummit(prev => prev ? {
        ...prev,
        beast: {
          ...prev.beast,
          extra_lives: (prev.beast.extra_lives || 0) + extraLifePotions,
        },
      } : prev);
    } else if (action.type === "apply_poison") {
      const poisonCount = action.count ?? 0;
      const beastId = action.beastId ?? 0;
      setTokenBalances((prev: Record<string, number>) => ({
        ...prev,
        POISON: (prev["POISON"] || 0) - poisonCount,
      }));
      setApplyingPotions(false);
      setPoisonPotionsUsed((prev) => prev + poisonCount);
      setPoisonEvent({
        beast_token_id: beastId,
        block_timestamp: Math.floor(Date.now() / 1000),
        count: poisonCount,
        player: account?.address ?? null,
      })
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

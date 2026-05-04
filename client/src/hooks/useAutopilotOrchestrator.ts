import { useController } from '@/contexts/controller';
import { MAX_BEASTS_PER_ATTACK, useGameDirector } from '@/contexts/GameDirector';
import { useAutopilotStore } from '@/stores/autopilotStore';
import { useGameStore } from '@/stores/gameStore';
import type { Beast, Summit } from '@/types/game';
import React, { useEffect, useMemo, useReducer } from 'react';
import {
  calculateRevivalRequired,
  isOwnerIgnored, isOwnerTargetedForPoison, getTargetedPoisonAmount,
  isBeastTargetedForPoison, getTargetedBeastPoisonAmount,
  getPoisonFloorProjection, hasDiplomacyMatch, selectOptimalBeasts,
} from '../utils/beasts';

type SmartPoisonWaitTarget = {
  tokenId: number;
  summit: Summit;
};

type ApplyPoisonOptions = {
  smartWait?: boolean;
};

function formatPoisonWait(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder}s`;
}

export function useAutopilotOrchestrator() {
  const { executeGameAction } = useGameDirector();
  const { tokenBalances } = useController();

  const { selectedBeasts, summit,
    attackInProgress,
    applyingPotions, setApplyingPotions, setBattleEvents, setAttackInProgress,
    collection, setSelectedBeasts, attackMode, autopilotLog, setAutopilotLog,
    autopilotEnabled, setAutopilotEnabled, setAppliedExtraLifePotions } = useGameStore();
  const {
    attackStrategy,
    extraLifeStrategy,
    extraLifeMax,
    extraLifeTotalMax,
    extraLifeReplenishTo,
    extraLifePotionsUsed,
    useRevivePotions,
    revivePotionMax,
    revivePotionMaxPerBeast,
    useAttackPotions,
    attackPotionMax,
    attackPotionMaxPerBeast,
    revivePotionsUsed,
    attackPotionsUsed,
    setRevivePotionsUsed,
    setAttackPotionsUsed,
    setExtraLifePotionsUsed,
    setPoisonPotionsUsed,
    poisonStrategy,
    poisonTotalMax,
    poisonPotionsUsed,
    poisonConservativeExtraLivesTrigger,
    poisonConservativeAmount,
    poisonAggressiveAmount,
    poisonMinPower,
    poisonMinHealth,
    maxBeastsPerAttack,
    skipSharedDiplomacy,
    ignoredPlayers,
    targetedPoisonPlayers,
    targetedPoisonBeasts,
    questMode,
    questFilters,
  } = useAutopilotStore();

  const [triggerAutopilot, setTriggerAutopilot] = useReducer((x: number) => x + 1, 0);
  const poisonedTokenIdRef = React.useRef<number | null>(null);
  const targetedPoisonKeyRef = React.useRef<string | null>(null);
  const smartPoisonWaitRef = React.useRef<SmartPoisonWaitTarget | null>(null);
  const smartPoisonTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit?.beast?.token_id));
  const poisonBalance = tokenBalances?.["POISON"] || 0;
  const revivalPotionsRequired = calculateRevivalRequired(selectedBeasts);
  const hasEnoughRevivePotions = (tokenBalances["REVIVE"] || 0) >= revivalPotionsRequired;
  const enableAttack = (attackMode === 'autopilot' && !attackInProgress) || ((!isSavage || attackMode !== 'safe') && summit?.beast && !attackInProgress && selectedBeasts.length > 0 && hasEnoughRevivePotions);

  // ── Beast selection ──────────────────────────────────────────────────

  const collectionWithCombat = useMemo<Beast[]>(() => {
    if (summit && collection.length > 0) {
      return selectOptimalBeasts(collection, summit, {
        useRevivePotions,
        revivePotionMax,
        revivePotionMaxPerBeast,
        revivePotionsUsed,
        useAttackPotions,
        attackPotionMax,
        attackPotionMaxPerBeast,
        attackPotionsUsed,
        autopilotEnabled,
        questMode,
        questFilters,
      });
    }

    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast?.token_id, summit?.beast?.extra_lives, summit?.beast?.current_health, collection.length, revivePotionsUsed, attackPotionsUsed, useRevivePotions, useAttackPotions, questMode, questFilters, maxBeastsPerAttack, attackStrategy, autopilotEnabled]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const clearSmartPoisonTimer = () => {
    if (smartPoisonTimerRef.current !== null) {
      clearTimeout(smartPoisonTimerRef.current);
      smartPoisonTimerRef.current = null;
    }
  };

  const clearSmartPoisonWait = () => {
    smartPoisonWaitRef.current = null;
    clearSmartPoisonTimer();
  };

  const scheduleSmartPoisonCheck = (secondsUntilReady: number) => {
    clearSmartPoisonTimer();

    const delayMs = Math.max(250, Math.min(Math.ceil(secondsUntilReady), 1) * 1000);
    smartPoisonTimerRef.current = setTimeout(() => {
      smartPoisonTimerRef.current = null;
      setTriggerAutopilot();
    }, delayMs);
  };

  const startSmartPoisonWait = (targetId: number, amount: number) => {
    const currentSummit = useGameStore.getState().summit;
    if (!currentSummit || currentSummit.beast.token_id !== targetId || amount <= 0) return;

    const nowSec = Math.floor(Date.now() / 1000);
    smartPoisonWaitRef.current = {
      tokenId: targetId,
      summit: {
        ...currentSummit,
        poison_count: Math.max(0, currentSummit.poison_count || 0) + amount,
        poison_timestamp: nowSec,
        beast: {
          ...currentSummit.beast,
        },
      },
    };
    setTriggerAutopilot();
  };

  const handleApplyExtraLife = (amount: number) => {
    if (!summit?.beast || !isSavage || applyingPotions || amount === 0) return;

    setApplyingPotions(true);
    setAutopilotLog('Adding extra lives...');

    executeGameAction({
      type: 'add_extra_life',
      beastId: summit.beast.token_id,
      extraLifePotions: amount,
    });
  };

  const handleApplyPoison = (amount: number, beastId?: number, options: ApplyPoisonOptions = {}): boolean => {
    const targetId = beastId ?? summit?.beast?.token_id;
    if (targetId === undefined || applyingPotions || amount === 0) return false;

    setApplyingPotions(true);
    setAutopilotLog('Applying poison...');

    void executeGameAction({
      type: 'apply_poison',
      beastId: targetId,
      count: amount,
    }).then((result) => {
      if (result) {
        if (options.smartWait) {
          startSmartPoisonWait(targetId, amount);
        }
        return;
      }

      if (poisonedTokenIdRef.current === targetId) {
        poisonedTokenIdRef.current = null;
      }
      targetedPoisonKeyRef.current = null;
      if (smartPoisonWaitRef.current?.tokenId === targetId) {
        clearSmartPoisonWait();
      }
    }).catch(() => {
      if (poisonedTokenIdRef.current === targetId) {
        poisonedTokenIdRef.current = null;
      }
      targetedPoisonKeyRef.current = null;
      if (smartPoisonWaitRef.current?.tokenId === targetId) {
        clearSmartPoisonWait();
      }
      setApplyingPotions(false);
    });

    return true;
  };

  const handleAttackUntilCapture = async (extraLifePotions: number) => {
    const { attackInProgress: alreadyAttacking, applyingPotions: alreadyApplying } = useGameStore.getState();
    if (!enableAttack || alreadyAttacking || alreadyApplying) return;

    setBattleEvents([]);
    setAttackInProgress(true);

    const allBeasts: [Beast, number, number][] = collectionWithCombat.map((beast: Beast) => [beast, 1, beast.combat?.attackPotions || 0]);

    const batches: [Beast, number, number][][] = [];
    for (let i = 0; i < allBeasts.length; i += MAX_BEASTS_PER_ATTACK) {
      batches.push(allBeasts.slice(i, i + MAX_BEASTS_PER_ATTACK));
    }

    const poisonedThisSequence = new Set<number>();

    for (const batch of batches) {
      // Between batches: check if summit changed to an ignored or diplomacy-matched player
      const currentSummit = useGameStore.getState().summit;
      if (currentSummit) {
        const { ignoredPlayers: ig, skipSharedDiplomacy: skipDip, targetedPoisonPlayers: tpp } = useAutopilotStore.getState();
        const currentCollection = useGameStore.getState().collection;
        const isMyBeast = currentCollection.some((b: Beast) => b.token_id === currentSummit.beast.token_id);

        if (isMyBeast) {
          setAutopilotLog('Summit captured — halting attack');
          break;
        }
        if (isOwnerIgnored(currentSummit.owner, ig)) {
          setAutopilotLog('Halted: ignored player took summit');
          break;
        }
        if (skipDip && hasDiplomacyMatch(currentCollection, currentSummit.beast)) {
          setAutopilotLog('Halted: shared diplomacy');
          break;
        }

        // Fire targeted poison between batches (once per target per sequence)
        if (!poisonedThisSequence.has(currentSummit.beast.token_id)) {
          const { poisonTotalMax: ptm, poisonPotionsUsed: ppu, targetedPoisonBeasts: tpb } = useAutopilotStore.getState();
          const isBeastTarget = tpb.length > 0 && isBeastTargetedForPoison(currentSummit.beast.token_id, tpb);
          if (isBeastTarget) {
            const beastAmount = getTargetedBeastPoisonAmount(currentSummit.beast.token_id, tpb);
            const remainingCap = Math.max(0, ptm - ppu);
            const amount = Math.min(beastAmount, poisonBalance, remainingCap);
            if (amount > 0) {
              handleApplyPoison(amount, currentSummit.beast.token_id, { smartWait: attackStrategy !== 'never' });
              poisonedThisSequence.add(currentSummit.beast.token_id);
              setAttackInProgress(false);
              return;
            }
          } else if (tpp.length > 0 && isOwnerTargetedForPoison(currentSummit.owner, tpp)) {
            const playerAmount = getTargetedPoisonAmount(currentSummit.owner, tpp);
            const remainingCap = Math.max(0, ptm - ppu);
            const amount = Math.min(playerAmount, poisonBalance, remainingCap);
            if (amount > 0) {
              handleApplyPoison(amount, currentSummit.beast.token_id, { smartWait: attackStrategy !== 'never' });
              poisonedThisSequence.add(currentSummit.beast.token_id);
              setAttackInProgress(false);
              return;
            }
          }
        }
      }

      const result = await executeGameAction({
        type: 'attack_until_capture',
        beasts: batch,
        extraLifePotions
      });

      if (!result) {
        setAttackInProgress(false);
        return;
      }
    }

    setAttackInProgress(false);
  };

  const startAutopilot = () => {
    setRevivePotionsUsed(() => 0);
    setAttackPotionsUsed(() => 0);
    setExtraLifePotionsUsed(() => 0);
    setPoisonPotionsUsed(() => 0);
    poisonedTokenIdRef.current = null;
    targetedPoisonKeyRef.current = null;
    clearSmartPoisonWait();
    setAutopilotEnabled(true);
  };

  const stopAutopilot = () => {
    clearSmartPoisonWait();
    setAutopilotEnabled(false);
  };

  // ── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearSmartPoisonWait();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when attack mode changes
  useEffect(() => {
    if (attackMode === 'autopilot') {
      setSelectedBeasts([]);
      setAppliedExtraLifePotions(0);
    }

    if (attackMode !== 'autopilot' && autopilotEnabled) {
      setAutopilotEnabled(false);
      poisonedTokenIdRef.current = null;
      clearSmartPoisonWait();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackMode]);

  useEffect(() => {
    poisonedTokenIdRef.current = null;
    targetedPoisonKeyRef.current = null;
    clearSmartPoisonWait();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast?.token_id]);

  useEffect(() => {
    if (!autopilotEnabled || attackStrategy === 'never') {
      clearSmartPoisonWait();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotEnabled, attackStrategy]);

  // Diplomacy / ignored player memos
  const summitSharesDiplomacy = useMemo(() => {
    if (!skipSharedDiplomacy || !summit?.beast) return false;
    return collection.some(
      (beast: Beast) =>
        beast.diplomacy &&
        beast.prefix === summit.beast.prefix &&
        beast.suffix === summit.beast.suffix,
    );
  }, [skipSharedDiplomacy, summit?.beast, collection]);

  const summitOwnerIgnored = useMemo(() => {
    if (ignoredPlayers.length === 0 || !summit?.owner) return false;
    const ownerNormalized = summit.owner.replace(/^0x0+/, '0x').toLowerCase();
    return ignoredPlayers.some((p) => p.address === ownerNormalized);
  }, [ignoredPlayers, summit?.owner]);

  const shouldSkipSummit = summitSharesDiplomacy || summitOwnerIgnored;

  // Autopilot status log
  useEffect(() => {
    if (autopilotEnabled && !attackInProgress && !applyingPotions) {
      if (summitSharesDiplomacy) {
        setAutopilotLog('Ignoring shared diplomacy');
      } else if (summitOwnerIgnored) {
        const owner = summit?.owner?.replace(/^0x0+/, '0x').toLowerCase();
        const player = ignoredPlayers.find((p) => p.address === owner);
        setAutopilotLog(`Ignoring ${player?.name ?? 'player'}`);
      } else {
        setAutopilotLog('Waiting for trigger...');
      }
    } else if (attackInProgress) {
      setAutopilotLog('Attacking...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotEnabled, attackInProgress, applyingPotions, summitSharesDiplomacy, summitOwnerIgnored]);

  // Targeted + aggressive poison on summit change or config change
  useEffect(() => {
    if (!autopilotEnabled || !summit?.beast) return;

    const { attackInProgress: attacking, applyingPotions: applying } = useGameStore.getState();
    if (attacking || applying) return;

    const myBeast = collection.find((beast: Beast) => beast.token_id === summit.beast.token_id);
    if (myBeast) return;

    // Beast-level targeted poison (highest priority)
    const isBeastTarget = targetedPoisonBeasts.length > 0 && isBeastTargetedForPoison(summit.beast.token_id, targetedPoisonBeasts);
    if (isBeastTarget) {
      const beastAmount = getTargetedBeastPoisonAmount(summit.beast.token_id, targetedPoisonBeasts);
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const amount = Math.min(beastAmount, poisonBalance, remainingCap);
      const poisonKey = `beast:${summit.beast.token_id}:${beastAmount}:${poisonTotalMax}`;
      if (amount > 0 && targetedPoisonKeyRef.current !== poisonKey && handleApplyPoison(amount, summit.beast.token_id, { smartWait: attackStrategy !== 'never' })) {
        targetedPoisonKeyRef.current = poisonKey;
      }
      return;
    }

    // Player-level targeted poison
    const isTargeted = targetedPoisonPlayers.length > 0 && isOwnerTargetedForPoison(summit.owner, targetedPoisonPlayers);
    if (isTargeted) {
      const playerAmount = getTargetedPoisonAmount(summit.owner, targetedPoisonPlayers);
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const amount = Math.min(playerAmount, poisonBalance, remainingCap);
      const poisonKey = `player:${summit.beast.token_id}:${summit.owner.toLowerCase()}:${playerAmount}:${poisonTotalMax}`;
      if (amount > 0 && targetedPoisonKeyRef.current !== poisonKey && handleApplyPoison(amount, summit.beast.token_id, { smartWait: attackStrategy !== 'never' })) {
        targetedPoisonKeyRef.current = poisonKey;
      }
      return;
    }

    if (poisonStrategy !== 'aggressive') return;
    if (shouldSkipSummit) return;

    // Reset tracked token when summit beast changes
    if (poisonedTokenIdRef.current !== summit.beast.token_id) {
      poisonedTokenIdRef.current = null;
    }
    if (poisonedTokenIdRef.current === summit.beast.token_id) return;

    if (poisonMinPower > 0 && summit.beast.power < poisonMinPower) return;
    if (poisonMinHealth > 0 && summit.beast.current_health < poisonMinHealth) return;

    const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
    const amount = Math.min(poisonAggressiveAmount, poisonBalance, remainingCap);
    if (amount > 0 && handleApplyPoison(amount, summit.beast.token_id, { smartWait: attackStrategy !== 'never' })) {
      poisonedTokenIdRef.current = summit.beast.token_id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    summit?.beast?.token_id,
    summit?.beast?.power,
    summit?.beast?.current_health,
    summit?.owner,
    autopilotEnabled,
    attackInProgress,
    applyingPotions,
    collection,
    targetedPoisonPlayers,
    targetedPoisonBeasts,
    poisonStrategy,
    poisonTotalMax,
    poisonPotionsUsed,
    poisonAggressiveAmount,
    poisonMinPower,
    poisonMinHealth,
    poisonBalance,
    shouldSkipSummit,
    attackStrategy,
  ]);

  // Main autopilot attack + conservative poison + extra life logic
  useEffect(() => {
    if (!autopilotEnabled || attackInProgress || applyingPotions || !collectionWithCombat || !summit) return;

    const myBeast = collection.find((beast: Beast) => beast.token_id === summit?.beast.token_id);

    if (myBeast) {
      if (extraLifeStrategy === 'aggressive' && myBeast.extra_lives >= 0 && myBeast.extra_lives < extraLifeReplenishTo) {
        const extraLifePotions = Math.min(extraLifeTotalMax - extraLifePotionsUsed, extraLifeReplenishTo - myBeast.extra_lives);
        if (extraLifePotions > 0) {
          handleApplyExtraLife(extraLifePotions);
        }
      }

      return;
    }

    if (shouldSkipSummit) return;

    let summitForAttack = summit;
    const smartPoisonWait = smartPoisonWaitRef.current;
    if (smartPoisonWait?.tokenId === summit.beast.token_id) {
      const projection = getPoisonFloorProjection(smartPoisonWait.summit);
      if (!projection.ready) {
        if (projection.secondsUntilFloor !== null) {
          setAutopilotLog(`Waiting for poison: ${formatPoisonWait(projection.secondsUntilFloor)}`);
          scheduleSmartPoisonCheck(projection.secondsUntilFloor);
          return;
        }

        clearSmartPoisonWait();
      } else {
        clearSmartPoisonWait();
        summitForAttack = {
          ...summit,
          beast: {
            ...summit.beast,
            current_health: projection.currentHealth,
            extra_lives: projection.extraLives,
          },
        };
      }
    }

    if (poisonStrategy === 'conservative'
      && summit.beast.extra_lives >= poisonConservativeExtraLivesTrigger
      && summit.poison_count < poisonConservativeAmount
      && poisonedTokenIdRef.current !== summit.beast.token_id
      && (poisonMinPower <= 0 || summit.beast.power >= poisonMinPower)
      && (poisonMinHealth <= 0 || summit.beast.current_health >= poisonMinHealth)) {
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const amount = Math.min(poisonConservativeAmount - summit.poison_count, poisonBalance, remainingCap);
      if (amount > 0 && handleApplyPoison(amount, undefined, { smartWait: attackStrategy !== 'never' })) {
        poisonedTokenIdRef.current = summit.beast.token_id;
        return;
      }
    }

    let extraLifePotions = 0;
    if (extraLifeStrategy === 'after_capture') {
      extraLifePotions = Math.min(extraLifeTotalMax - extraLifePotionsUsed, extraLifeMax);
    } else if (extraLifeStrategy === 'aggressive') {
      extraLifePotions = Math.min(extraLifeTotalMax - extraLifePotionsUsed, extraLifeReplenishTo);
    }

    if (attackStrategy === 'never') {
      return;
    } else if (attackStrategy === 'all_out') {
      handleAttackUntilCapture(extraLifePotions);
    } else if (attackStrategy === 'guaranteed') {
      const beasts = collectionWithCombat.slice(0, maxBeastsPerAttack);

      const totalSummitHealth = ((summitForAttack.beast.health + summitForAttack.beast.bonus_health) * summitForAttack.beast.extra_lives) + summitForAttack.beast.current_health;
      const totalEstimatedDamage = beasts.reduce((acc, beast) => acc + (beast.combat?.estimatedDamage ?? 0), 0);
      if (totalEstimatedDamage < (totalSummitHealth * 1.1)) {
        return;
      }

      executeGameAction({
        type: 'attack',
        beasts: beasts.map((beast: Beast) => ([beast, 1, beast.combat?.attackPotions || 0])),
        safeAttack: false,
        vrf: true,
        extraLifePotions: extraLifePotions,
        attackPotions: beasts[0]?.combat?.attackPotions || 0
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    collectionWithCombat,
    collection,
    autopilotEnabled,
    attackInProgress,
    applyingPotions,
    summit?.beast?.token_id,
    summit?.beast?.extra_lives,
    summit?.beast?.current_health,
    summit?.beast?.power,
    summit?.poison_count,
    summit?.poison_timestamp,
    summit?.owner,
    shouldSkipSummit,
    extraLifeStrategy,
    extraLifeMax,
    extraLifeTotalMax,
    extraLifeReplenishTo,
    extraLifePotionsUsed,
    poisonStrategy,
    poisonConservativeExtraLivesTrigger,
    poisonConservativeAmount,
    poisonMinPower,
    poisonMinHealth,
    poisonTotalMax,
    poisonPotionsUsed,
    poisonBalance,
    attackStrategy,
    maxBeastsPerAttack,
    triggerAutopilot,
  ]);

  // Re-trigger autopilot when summit beast is about to die (0 extra lives, 1 HP)
  useEffect(() => {
    if (autopilotEnabled && !attackInProgress && summit?.beast.extra_lives === 0 && summit?.beast.current_health === 1) {
      setTriggerAutopilot();
    }
  }, [autopilotEnabled, attackInProgress, summit?.beast.current_health, summit?.beast.extra_lives]);

  // ── Return values needed by ActionBar UI ─────────────────────────────

  return {
    collectionWithCombat,
    isSavage,
    enableAttack,
    revivalPotionsRequired,
    autopilotLog,
    startAutopilot,
    stopAutopilot,
    handleApplyExtraLife,
    handleApplyPoison,
  };
}

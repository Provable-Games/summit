import { useController } from '@/contexts/controller';
import { MAX_BEASTS_PER_ATTACK, useGameDirector } from '@/contexts/GameDirector';
import { useAutopilotStore } from '@/stores/autopilotStore';
import { useGameStore } from '@/stores/gameStore';
import type { Beast } from '@/types/game';
import React, { useEffect, useMemo, useReducer } from 'react';
import {
  calculateRevivalRequired, calculateBattleResult, getBeastCurrentHealth, getBeastRevivalTime, isBeastLocked,
  isOwnerIgnored, isOwnerTargetedForPoison, getTargetedPoisonAmount,
  isBeastTargetedForPoison, getTargetedBeastPoisonAmount,
  hasDiplomacyMatch, selectOptimalBeasts, getStrongType, isWithinPoisonSchedule,
  questNeedsPredicate,
} from '../utils/beasts';

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
    snipeAt1Hp,
    poisonScheduleEnabled,
    poisonScheduleStartHour,
    poisonScheduleStartMinute,
    poisonScheduleEndHour,
    poisonScheduleEndMinute,
    poisonScheduleAmount,
    poisonScheduleTargetedOnly,
    rotateTopBeasts,
    rotateTopBeastIds,
  } = useAutopilotStore();

  const [triggerAutopilot, setTriggerAutopilot] = useReducer((x: number) => x + 1, 0);
  const poisonedTokenIdRef = React.useRef<number | null>(null);

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit?.beast?.token_id));
  const revivalPotionsRequired = calculateRevivalRequired(selectedBeasts);
  const hasEnoughRevivePotions = (tokenBalances["REVIVE"] || 0) >= revivalPotionsRequired;
  const enableAttack = (attackMode === 'autopilot' && !attackInProgress) || ((!isSavage || attackMode !== 'safe') && summit?.beast && !attackInProgress && selectedBeasts.length > 0 && hasEnoughRevivePotions);

  // ── Beast selection ──────────────────────────────────────────────────

  const collectionWithCombat = useMemo<Beast[]>(() => {
    if (!summit || collection.length === 0) return [];

    // Rotate Top Beasts override: filter to rotation pool, counter-pick by type
    if (autopilotEnabled && rotateTopBeasts && rotateTopBeastIds.length > 0) {
      const rotationPool = collection.filter((b) => rotateTopBeastIds.includes(b.token_id));
      const strongType = getStrongType(summit.beast.type);
      const counterPicked = rotationPool.filter((b) => b.type === strongType);
      const candidates = counterPicked.length > 0 ? counterPicked : rotationPool;

      return candidates.map((beast) => {
        const b = { ...beast };
        b.revival_time = getBeastRevivalTime(b);
        b.current_health = getBeastCurrentHealth(beast);
        b.combat = calculateBattleResult(b, summit, 0);
        return b;
      }).filter((b) => !isBeastLocked(b))
        .sort((a, b) => (b.combat?.estimatedDamage ?? 0) - (a.combat?.estimatedDamage ?? 0));
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast?.token_id, summit?.beast?.extra_lives, summit?.beast?.current_health, collection.length, revivePotionsUsed, attackPotionsUsed, useRevivePotions, useAttackPotions, questMode, questFilters, maxBeastsPerAttack, attackStrategy, autopilotEnabled, rotateTopBeasts, rotateTopBeastIds]);

  // ── Handlers ─────────────────────────────────────────────────────────

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

  const handleApplyPoison = (amount: number, beastId?: number): boolean => {
    const targetId = beastId ?? summit?.beast?.token_id;
    if (!targetId || applyingPotions || amount === 0) return false;

    setApplyingPotions(true);
    setAutopilotLog('Applying poison...');

    executeGameAction({
      type: 'apply_poison',
      beastId: targetId,
      count: amount,
    });
    return true;
  };

  const handleAttackUntilCapture = async (extraLifePotions: number) => {
    const { attackInProgress: alreadyAttacking, attackMode: currentAttackMode } = useGameStore.getState();
    if (currentAttackMode !== 'autopilot' || alreadyAttacking) return;

    setBattleEvents([]);
    setAttackInProgress(true);

    try {
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
              const pb = tokenBalances?.["POISON"] || 0;
              const amount = Math.min(beastAmount, pb, remainingCap);
              if (amount > 0) {
                await executeGameAction({ type: 'apply_poison', beastId: currentSummit.beast.token_id, count: amount });
                poisonedThisSequence.add(currentSummit.beast.token_id);
              }
            } else if (tpp.length > 0 && isOwnerTargetedForPoison(currentSummit.owner, tpp)) {
              const playerAmount = getTargetedPoisonAmount(currentSummit.owner, tpp);
              const remainingCap = Math.max(0, ptm - ppu);
              const pb = tokenBalances?.["POISON"] || 0;
              const amount = Math.min(playerAmount, pb, remainingCap);
              if (amount > 0) {
                await executeGameAction({ type: 'apply_poison', beastId: currentSummit.beast.token_id, count: amount });
                poisonedThisSequence.add(currentSummit.beast.token_id);
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
          break;
        }
      }
    } catch (err) {
      console.error('[Autopilot] Attack sequence failed:', err);
    } finally {
      setAttackInProgress(false);
      // Schedule retry so autopilot doesn't stall after a transient failure
      setTimeout(() => setTriggerAutopilot(), 3_000);
    }
  };

  const startAutopilot = () => {
    setRevivePotionsUsed(() => 0);
    setAttackPotionsUsed(() => 0);
    setExtraLifePotionsUsed(() => 0);
    setPoisonPotionsUsed(() => 0);
    setAutopilotEnabled(true);
  };

  const stopAutopilot = () => {
    setAutopilotEnabled(false);
  };

  // ── Effects ──────────────────────────────────────────────────────────

  // Reset state when attack mode changes
  useEffect(() => {
    if (attackMode === 'autopilot') {
      setSelectedBeasts([]);
      setAppliedExtraLifePotions(0);
    }

    if (attackMode !== 'autopilot' && autopilotEnabled) {
      setAutopilotEnabled(false);
      poisonedTokenIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackMode]);

  // Diplomacy / ignored player memos
  const summitSharesDiplomacy = useMemo(() => {
    if (!skipSharedDiplomacy || !summit?.beast) return false;
    return collection.some(
      (beast: Beast) =>
        beast.diplomacy &&
        beast.prefix === summit.beast.prefix &&
        beast.suffix === summit.beast.suffix,
    );
  }, [skipSharedDiplomacy, summit?.beast?.token_id, collection.length]);

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
    } else if (applyingPotions) {
      setAutopilotLog('Applying potions...');
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
      const pb = tokenBalances?.["POISON"] || 0;
      const amount = Math.min(beastAmount, pb, remainingCap);
      if (amount > 0) handleApplyPoison(amount, summit.beast.token_id);
      return;
    }

    // Player-level targeted poison
    const isTargeted = targetedPoisonPlayers.length > 0 && isOwnerTargetedForPoison(summit.owner, targetedPoisonPlayers);
    if (isTargeted) {
      const playerAmount = getTargetedPoisonAmount(summit.owner, targetedPoisonPlayers);
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const pb = tokenBalances?.["POISON"] || 0;
      const amount = Math.min(playerAmount, pb, remainingCap);
      if (amount > 0) handleApplyPoison(amount, summit.beast.token_id);
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
    const pb = tokenBalances?.["POISON"] || 0;
    const amount = Math.min(poisonAggressiveAmount, pb, remainingCap);
    if (amount > 0 && handleApplyPoison(amount, summit.beast.token_id)) {
      poisonedTokenIdRef.current = summit.beast.token_id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast?.token_id, autopilotEnabled, targetedPoisonPlayers, targetedPoisonBeasts, poisonTotalMax]);

  // Main autopilot attack + conservative poison + extra life logic
  useEffect(() => {
    if (!autopilotEnabled || attackInProgress || !collectionWithCombat || !summit) return;

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

    if (poisonStrategy === 'conservative'
      && summit.beast.extra_lives >= poisonConservativeExtraLivesTrigger
      && summit.poison_count < poisonConservativeAmount
      && poisonedTokenIdRef.current !== summit.beast.token_id
      && (poisonMinPower <= 0 || summit.beast.power >= poisonMinPower)
      && (poisonMinHealth <= 0 || summit.beast.current_health >= poisonMinHealth)) {
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const poisonBalance = tokenBalances?.["POISON"] || 0;
      const amount = Math.min(poisonConservativeAmount - summit.poison_count, poisonBalance, remainingCap);
      if (amount > 0 && handleApplyPoison(amount)) {
        poisonedTokenIdRef.current = summit.beast.token_id;
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

      const totalSummitHealth = ((summit.beast.health + summit.beast.bonus_health) * summit.beast.extra_lives) + summit.beast.current_health;
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
      }).then((success) => {
        if (!success) setTimeout(() => setTriggerAutopilot(), 3_000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionWithCombat, autopilotEnabled, summit?.beast.extra_lives, triggerAutopilot, attackInProgress, applyingPotions]);

  // Re-trigger autopilot when summit beast is about to die (0 extra lives, 1 HP)
  useEffect(() => {
    if (autopilotEnabled && !attackInProgress && summit?.beast.extra_lives === 0 && summit?.beast.current_health === 1) {
      setTriggerAutopilot();
    }
  }, [autopilotEnabled, summit?.beast.current_health]);

  // 1HP Snipe: auto-attack when summit drops to 1HP with no extra lives
  useEffect(() => {
    if (!autopilotEnabled || !snipeAt1Hp || !summit?.beast) return;
    if (summit.beast.current_health > 1 || summit.beast.extra_lives > 0) return;

    const { attackInProgress: attacking, applyingPotions: applying } = useGameStore.getState();
    if (attacking || applying) return;

    const myBeast = collection.find((b: Beast) => b.token_id === summit.beast.token_id);
    if (myBeast) return;
    if (isOwnerIgnored(summit.owner, ignoredPlayers)) return;
    if (skipSharedDiplomacy && hasDiplomacyMatch(collection, summit.beast)) return;

    // Pick beast: prefer quest-needing beast, then weakest (any beast can finish 1HP)
    const candidates = collection
      .map((b) => {
        const copy = { ...b };
        copy.current_health = getBeastCurrentHealth(b);
        copy.combat = calculateBattleResult(copy, summit, 0);
        return copy;
      })
      .filter((b) => b.current_health > 0 && !isBeastLocked(b));

    if (candidates.length === 0) return;

    const predicates = questMode
      ? questFilters.map(questNeedsPredicate).filter((p): p is (b: Beast) => boolean => p !== null)
      : [];
    const needsQuest = (b: Beast) => predicates.some((p) => p(b));

    // Prefer quest beast, otherwise weakest (save strong beasts for real fights)
    const questCandidate = predicates.length > 0 ? candidates.find(needsQuest) : undefined;
    const weakest = candidates.sort((a, b) => (a.combat?.estimatedDamage ?? 0) - (b.combat?.estimatedDamage ?? 0))[0];
    const best = questCandidate ?? weakest;
    setAutopilotLog('Sniping 1HP summit beast...');
    executeGameAction({
      type: 'attack',
      beasts: [[best, 1, 0]],
      safeAttack: false,
      vrf: best.luck > 0 || (summit.beast.luck > 0),
      extraLifePotions: 0,
      attackPotions: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summit?.beast?.current_health, summit?.beast?.extra_lives, autopilotEnabled, snipeAt1Hp]);

  // Poison Schedule: 60s interval to apply poison during scheduled window
  useEffect(() => {
    if (!autopilotEnabled || !poisonScheduleEnabled) return;

    const checkSchedule = () => {
      if (!isWithinPoisonSchedule(poisonScheduleStartHour, poisonScheduleStartMinute, poisonScheduleEndHour, poisonScheduleEndMinute)) return;

      const { attackInProgress: attacking, applyingPotions: applying, summit: currentSummit, collection: currentCollection } = useGameStore.getState();
      if (attacking || applying || !currentSummit?.beast) return;

      const myBeast = currentCollection.find((b: Beast) => b.token_id === currentSummit.beast.token_id);
      if (myBeast) return;

      const { ignoredPlayers: ig, skipSharedDiplomacy: skipDip, poisonTotalMax: ptm, poisonPotionsUsed: ppu, targetedPoisonPlayers: tpp, targetedPoisonBeasts: tpb, poisonScheduleTargetedOnly: targetedOnly, poisonScheduleAmount: schedAmount } = useAutopilotStore.getState();

      if (isOwnerIgnored(currentSummit.owner, ig)) return;
      if (skipDip && hasDiplomacyMatch(currentCollection, currentSummit.beast)) return;

      if (targetedOnly) {
        const isBeastTarget = tpb.length > 0 && isBeastTargetedForPoison(currentSummit.beast.token_id, tpb);
        const isPlayerTarget = tpp.length > 0 && isOwnerTargetedForPoison(currentSummit.owner, tpp);
        if (!isBeastTarget && !isPlayerTarget) return;
      }

      const remainingCap = Math.max(0, ptm - ppu);
      const pb = tokenBalances?.["POISON"] || 0;
      const amount = Math.min(schedAmount, pb, remainingCap);
      if (amount > 0) handleApplyPoison(amount, currentSummit.beast.token_id);
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotEnabled, poisonScheduleEnabled, poisonScheduleStartHour, poisonScheduleStartMinute, poisonScheduleEndHour, poisonScheduleEndMinute]);

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

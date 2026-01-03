import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useAutopilotStore } from '@/stores/autopilotStore';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RemoveIcon from '@mui/icons-material/Remove';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box, Button, IconButton, Menu, MenuItem, Slider,
  TextField, Tooltip, Typography
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { isBrowser } from 'react-device-detect';
import attackPotionIcon from '../assets/images/attack-potion.png';
import heart from '../assets/images/heart.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import poisonPotionIcon from '../assets/images/poison-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import {
  calculateBattleResult, calculateOptimalAttackPotions, calculateRevivalRequired,
  getBeastCurrentHealth, getBeastRevivalTime, isBeastLocked
} from '../utils/beasts';
import { gameColors } from '../utils/themes';
import AutopilotConfigModal from './dialogs/AutopilotConfigModal';

function ActionBar() {
  const { executeGameAction } = useGameDirector();
  const { tokenBalances } = useController();
  const reviveBalance = Number((tokenBalances as any)?.['REVIVE'] ?? 0) || 0;
  const attackBalance = Number((tokenBalances as any)?.['ATTACK'] ?? 0) || 0;
  const extraLifeBalance = Number((tokenBalances as any)?.['EXTRA LIFE'] ?? 0) || 0;
  const poisonBalance = Number((tokenBalances as any)?.['POISON'] ?? 0) || 0;

  const { selectedBeasts, summit,
    attackInProgress,
    applyingPotions, setApplyingPotions, appliedPoisonCount, setAppliedPoisonCount,
    collection, collectionSyncing, setSelectedBeasts, attackMode, setAttackMode, autopilotLog, setAutopilotLog,
    autopilotEnabled, setAutopilotEnabled, appliedExtraLifePotions, setAppliedExtraLifePotions } = useGameStore();
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
    initializeMaxCapsFromBalances,
  } = useAutopilotStore();

  const [anchorEl, setAnchorEl] = useState(null);
  const [potion, setPotion] = useState(null)
  const [attackDropdownAnchor, setAttackDropdownAnchor] = useState<null | HTMLElement>(null);
  const [autopilotConfigOpen, setAutopilotConfigOpen] = useState(false);
  const [lastBeastAttacked, setLastBeastAttacked] = useState(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>, potion: any) => {
    setAnchorEl(event.currentTarget);
    setPotion(potion);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPotion(null);
  };

  const handleAttack = () => {
    if (!enableAttack) return;

    executeGameAction({
      type: 'attack',
      pauseUpdates: true,
      beasts: selectedBeasts,
      safeAttack: attackMode === 'safe',
      vrf: (selectedBeasts.find(selectedBeast => selectedBeast[0].stats.luck) || summit?.beast?.stats.luck) ? true : false,
      attackPotions: appliedAttackPotions,
      revivePotions: revivalPotionsRequired,
      extraLifePotions: appliedExtraLifePotions,
    });
  }

  const collectionWithCombat = useMemo<Beast[]>(() => {
    if (summit && collection.length > 0) {
      let revivePotionsEnabled = autopilotEnabled && useRevivePotions && revivePotionsUsed < revivePotionMax;
      let attackPotionsEnabled = autopilotEnabled && useAttackPotions && attackPotionsUsed < attackPotionMax;

      let filtered = collection.map((beast: Beast) => {
        let newBeast = { ...beast }
        newBeast.revival_time = getBeastRevivalTime(newBeast);
        newBeast.current_health = getBeastCurrentHealth(beast);
        newBeast.combat = calculateBattleResult(newBeast, summit, 0);
        return newBeast
      }).filter((beast: Beast) => !isBeastLocked(beast));

      filtered = filtered.sort((a: Beast, b: Beast) => b.combat?.score - a.combat?.score);

      if (revivePotionsEnabled) {
        let revivePotionsRemaining = revivePotionMax - revivePotionsUsed;
        filtered = filtered.map((beast: Beast) => {
          if (beast.current_health === 0) {
            if (beast.revival_count >= revivePotionsRemaining || beast.revival_count >= revivePotionMaxPerBeast) {
              return null;
            } else {
              revivePotionsRemaining -= beast.revival_count + 1;
            }
          }
          return beast;
        }).filter(Boolean);
      } else {
        filtered = filtered.filter((beast: Beast) => beast.current_health > 0);
      }

      if (attackPotionsEnabled) {
        let attackPotions = calculateOptimalAttackPotions(filtered[0], summit, Math.min(attackPotionMax - attackPotionsUsed, 255));
        let newCombat = calculateBattleResult(filtered[0], summit, attackPotions);
        filtered[0].combat = newCombat;
      }

      return filtered
    }

    return [];
  }, [summit?.beast?.token_id, collection.length, revivePotionsUsed, attackPotionsUsed]);

  const handleAttackUntilCapture = (extraLifePotions) => {
    if (!enableAttack) return;

    executeGameAction({
      type: 'attack_until_capture',
      beasts: collectionWithCombat.map((beast: Beast) => [beast, 1, beast.combat?.attackPotions || 0]),
      extraLifePotions
    });
  }

  const handleApplyExtraLife = (amount: number) => {
    if (!summit?.beast || !isSavage || applyingPotions || amount === 0) return;

    setApplyingPotions(true);
    setAutopilotLog('Adding extra lives...')

    executeGameAction({
      type: 'add_extra_life',
      beastId: summit.beast.token_id,
      extraLifePotions: amount,
    });
  }

  const handleApplyPoison = (amount: number) => {
    if (!summit?.beast || applyingPotions || amount === 0) return;

    setApplyingPotions(true);
    setAutopilotLog('Applying poison...')

    executeGameAction({
      type: 'apply_poison',
      beastId: summit.beast.token_id,
      count: amount,
    });
  }

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit?.beast?.token_id))
  const revivalPotionsRequired = calculateRevivalRequired(selectedBeasts);

  useEffect(() => {
    initializeMaxCapsFromBalances(tokenBalances);
  }, [reviveBalance, attackBalance, extraLifeBalance, poisonBalance]);

  useEffect(() => {
    if (attackMode === 'autopilot') {
      setSelectedBeasts([]);
      setAppliedExtraLifePotions(0);
    }

    if (attackMode !== 'autopilot' && autopilotEnabled) {
      setAutopilotEnabled(false);
    }
  }, [attackMode]);

  useEffect(() => {
    if (autopilotEnabled && !attackInProgress && !applyingPotions) {
      setAutopilotLog('Waiting for trigger...')
    } else if (attackInProgress) {
      setAutopilotLog('Attacking...')
    }
  }, [autopilotEnabled, attackInProgress, applyingPotions])

  useEffect(() => {
    if (!autopilotEnabled || poisonStrategy !== 'aggressive') return;
    let myBeast = collection.find((beast: Beast) => beast.token_id === summit?.beast.token_id);
    if (myBeast) return;

    const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
    const poisonBalance = tokenBalances?.["POISON"] || 0;
    handleApplyPoison(Math.min(poisonAggressiveAmount, poisonBalance, remainingCap));
  }, [summit?.beast?.token_id]);

  useEffect(() => {
    if (!autopilotEnabled || attackInProgress || !collectionWithCombat) return;
    if (lastBeastAttacked === summit?.beast.token_id) return;

    let myBeast = collection.find((beast: Beast) => beast.token_id === summit?.beast.token_id);

    if (myBeast) {
      if (extraLifeStrategy === 'aggressive' && myBeast.extra_lives >= 0 && myBeast.extra_lives < extraLifeReplenishTo) {
        let extraLifePotions = Math.min(extraLifeTotalMax - extraLifePotionsUsed, extraLifeReplenishTo - myBeast.extra_lives);
        if (extraLifePotions > 0) {
          handleApplyExtraLife(extraLifePotions);
        }
      }

      return;
    };

    if (poisonStrategy === 'conservative' && summit?.beast?.extra_lives >= poisonConservativeExtraLivesTrigger
      && summit.poison_count < poisonConservativeAmount) {
      const remainingCap = Math.max(0, poisonTotalMax - poisonPotionsUsed);
      const poisonBalance = tokenBalances?.["POISON"] || 0;
      handleApplyPoison(Math.min(poisonConservativeAmount - summit.poison_count, poisonBalance, remainingCap));
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
      setLastBeastAttacked(summit?.beast.token_id);
      handleAttackUntilCapture(extraLifePotions);
    } else if (attackStrategy === 'guaranteed') {
      let beasts = collectionWithCombat.slice(0, 75)

      let totalSummitHealth = ((summit?.beast.health + summit?.beast.bonus_health) * summit?.beast.extra_lives) + summit?.beast.current_health;
      let totalEstimatedDamage = beasts.reduce((acc, beast) => acc + (beast.combat?.estimatedDamage ?? 0), 0)
      if (totalEstimatedDamage < (totalSummitHealth * 1.1)) {
        return;
      }

      setLastBeastAttacked(summit?.beast.token_id);
      executeGameAction({
        type: 'attack',
        beasts: beasts.map((beast: Beast) => ([beast, 1, beast.combat?.attackPotions || 0])),
        safeAttack: false,
        vrf: true,
        extraLifePotions: extraLifePotions,
        attackPotions: beasts[0].combat?.attackPotions || 0
      });
    }
  }, [collectionWithCombat, autopilotEnabled, summit?.beast.extra_lives]);

  const startAutopilot = () => {
    setRevivePotionsUsed(0);
    setAttackPotionsUsed(0);
    setExtraLifePotionsUsed(0);
    setPoisonPotionsUsed(0);
    setAutopilotEnabled(true);
  }

  const stopAutopilot = () => {
    setAutopilotEnabled(false);
    setAttackMode('safe');
  }

  const hasEnoughRevivePotions = (tokenBalances["REVIVE"] || 0) >= revivalPotionsRequired;
  const enableAttack = (attackMode === 'autopilot' && !attackInProgress) || ((!isSavage || attackMode !== 'safe') && summit?.beast && !attackInProgress && selectedBeasts.length > 0 && hasEnoughRevivePotions);
  const highlightAttackButton = attackMode === 'autopilot' ? true : enableAttack;

  const enableExtraLifePotion = tokenBalances["EXTRA LIFE"] > 0;
  const enablePoisonPotion = tokenBalances["POISON"] > 0;
  const enableApplyPoison = summit?.beast && !applyingPotions && appliedPoisonCount > 0;
  const enableApplyExtraLife = isSavage && summit?.beast && !applyingPotions && appliedExtraLifePotions > 0;
  const appliedAttackPotions = selectedBeasts.reduce((acc, beast) => acc + beast[2], 0)

  function RenderRemainingPotion(icon: string, label: string, used: number, max: number) {
    return (
      <Box key={label} sx={styles.autopilotOverlayBudgetPill}>
        <img src={icon} alt="" height={'18px'} />
        <Typography sx={styles.autopilotOverlayBudgetPillLabel}>{label}</Typography>
        <Typography sx={styles.autopilotOverlayBudgetPillValue}>{used} / {max}</Typography>
      </Box>
    )
  }

  if (collection.length === 0) {
    return <Box sx={styles.container}>
    </Box>
  }

  return <Box
    sx={[
      styles.container,
      attackMode === 'autopilot' && autopilotEnabled && { height: 'auto', py: 1 },
    ]}
  >
    {(collection.length > 0 && collectionSyncing) && <Box sx={styles.collectionSyncing}>
      <Typography sx={styles.collectionSyncingText}>Syncing collection</Typography>
      <div className='dotLoader accentGreen' />
    </Box>}

    {/* Attack Button + Potions */}
    <Box sx={[styles.buttonGroup, (attackMode === 'autopilot' && autopilotEnabled) && styles.autopilotButtonGroup]}>
      {attackMode === 'autopilot' && autopilotEnabled ? (
        <Box sx={styles.autopilotOverlay}>
          <Box sx={styles.autopilotOverlayInner}>
            <Box sx={styles.autopilotOverlayHeader}>
              <Box sx={styles.autopilotOverlayTitleWrap}>
                <Box sx={styles.autopilotStatusDot} />
                <Box>
                  <Typography sx={styles.autopilotOverlayTitle}>
                    AUTOPILOT
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1 }} />

              <Button
                onClick={stopAutopilot}
                sx={styles.autopilotOverlayStopButton}
              >
                Stop Autopilot
              </Button>
            </Box>

            <Box sx={styles.autopilotOverlayContent}>
              <Box sx={styles.autopilotOverlayBudgetsHeader}>
                <Box>
                  <Typography sx={styles.autopilotOverlayBudgetsTitle}>Potions Used</Typography>
                </Box>
                <Box sx={styles.autopilotOverlayBudgets}>
                  {useRevivePotions && RenderRemainingPotion(revivePotionIcon, 'Revive', revivePotionsUsed, revivePotionMax)}
                  {useAttackPotions && RenderRemainingPotion(attackPotionIcon, 'Attack', attackPotionsUsed, attackPotionMax)}
                  {extraLifeStrategy !== 'disabled' && RenderRemainingPotion(lifePotionIcon, 'Life', extraLifePotionsUsed, extraLifeTotalMax)}
                  {poisonStrategy !== 'disabled' && RenderRemainingPotion(poisonPotionIcon, 'Poison', poisonPotionsUsed, poisonTotalMax)}
                </Box>
              </Box>

              <Box sx={styles.autopilotOverlayLog}>
                <Box sx={styles.autopilotOverlayLogBody}>
                  <Typography sx={styles.autopilotOverlayLogLine}>
                    <span style={{ opacity: 0.65, marginRight: 8 }}>{'>'}</span>
                    {autopilotLog}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          <Box sx={{ minWidth: isBrowser ? '265px' : '120px' }}>
            {(attackMode === 'autopilot' && autopilotEnabled) ? (
              <Box sx={{ minWidth: isBrowser ? '120px' : '80px' }} />
            ) : applyingPotions ? (
              <Box sx={styles.attackButton}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                  <Box display={'flex'} alignItems={'baseline'}>
                    <Typography variant="h5" sx={styles.buttonText}>Applying</Typography>
                    <div className='dotLoader green' />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={styles.attackButtonGroup}>
                  <Box
                    sx={[
                      styles.attackButton,
                      highlightAttackButton && styles.attackButtonEnabled,
                      styles.attackButtonMain
                    ]}
                    onClick={() => {
                      if (attackMode === 'autopilot') {
                        startAutopilot();
                      } else {
                        handleAttack();
                      }
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                      {attackInProgress ? (
                        <Box display={'flex'} alignItems={'baseline'}>
                          <Typography variant="h5" sx={styles.buttonText}>Attacking</Typography>
                          <div className='dotLoader green' />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={[styles.buttonText, !enableAttack && styles.disabledText]} variant="h5">
                            {attackMode === 'safe'
                              ? 'Safe Attack'
                              : attackMode === 'unsafe'
                                ? 'Unsafe Attack'
                                : 'Start Autopilot'}
                          </Typography>
                        </Box>
                      )}

                      {isBrowser && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {revivalPotionsRequired > 0 && (
                            <Box display={'flex'} alignItems={'center'}>
                              <Typography sx={styles.potionCount}>{revivalPotionsRequired}</Typography>
                              <img src={revivePotionIcon} alt='' height={'14px'} />
                            </Box>
                          )}
                          {appliedAttackPotions > 0 && (
                            <Box display={'flex'} alignItems={'center'}>
                              <Typography sx={styles.potionCount}>{appliedAttackPotions}</Typography>
                              <img src={attackPotionIcon} alt='' height={'14px'} />
                            </Box>
                          )}
                          {(!isSavage && appliedExtraLifePotions > 0) && (
                            <Box display={'flex'} alignItems={'center'}>
                              <Typography sx={styles.potionCount}>{appliedExtraLifePotions}</Typography>
                              <img src={heart} alt='' height={'12px'} />
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={[styles.attackDropdownButton]}
                    onClick={(event) => setAttackDropdownAnchor(event.currentTarget)}
                  >
                    <ArrowDropDownIcon sx={{ fontSize: '21px', color: gameColors.yellow }} />
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          {attackMode === 'autopilot' ? (
            <>
              {/* Divider 1 */}
              <Box sx={styles.divider} />

              {/* Autopilot Configuration Button */}
              <Box sx={styles.potionSubGroup}>
                <Tooltip
                  leaveDelay={300}
                  placement="top"
                  title={(
                    <Box sx={styles.tooltip}>
                      <Typography sx={styles.tooltipTitle}>Autopilot Settings</Typography>
                      <Typography sx={styles.tooltipText}>
                        Configure when Autopilot should attack and spend potions.
                      </Typography>
                    </Box>
                  )}
                >
                  <Box
                    sx={styles.configButton}
                    onClick={() => setAutopilotConfigOpen(true)}
                  >
                    <SettingsIcon sx={{ fontSize: 22, color: gameColors.brightGreen }} />
                  </Box>
                </Tooltip>
              </Box>
            </>
          ) : (
            <>
              <Box sx={styles.divider} />

              <Box sx={styles.potionSubGroup}>
                <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
                  <Typography sx={styles.tooltipTitle}>Extra Life</Typography>
                  <Typography sx={styles.tooltipText}>
                    {appliedExtraLifePotions > 0
                      ? `${appliedExtraLifePotions} extra lives applied`
                      : 'Grant additional lives'}
                  </Typography>
                  <Typography sx={styles.tooltipSubtext}>
                    Applied after you take the Summit
                  </Typography>
                </Box>}>
                  <Box sx={[
                    styles.potionButton,
                    enableExtraLifePotion && styles.potionButtonActive,
                    appliedExtraLifePotions > 0 && styles.potionButtonApplied
                  ]}
                    onClick={(event) => {
                      if (!enableExtraLifePotion) return;
                      handleClick(event, 'extraLife');
                    }}>
                    <img src={lifePotionIcon} alt='' height={'24px'} />
                    {appliedExtraLifePotions > 0 && (
                      <Box sx={styles.appliedIndicator}>
                        <Typography sx={styles.appliedText}>
                          {appliedExtraLifePotions}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={styles.count}>
                      <Typography sx={styles.countText}>
                        {tokenBalances["EXTRA LIFE"]}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>

                <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
                  <Typography sx={styles.tooltipTitle}>Poison</Typography>
                  <Typography sx={styles.tooltipText}>
                    {appliedPoisonCount > 0
                      ? `${appliedPoisonCount} poison potions applied`
                      : 'Poison the summit'}
                  </Typography>
                  <Typography sx={styles.tooltipSubtext}>
                    Deals 1 damage per second
                  </Typography>
                </Box>}>
                  <Box sx={[
                    styles.potionButton,
                    enablePoisonPotion && styles.potionButtonActive,
                    appliedPoisonCount > 0 && styles.potionButtonApplied
                  ]}
                    onClick={(event) => {
                      if (!enablePoisonPotion) return;
                      handleClick(event, 'poison');
                    }}>
                    <img src={poisonPotionIcon} alt='' height={'24px'} />
                    {appliedPoisonCount > 0 && (
                      <Box sx={styles.appliedIndicator}>
                        <Typography sx={styles.appliedText}>
                          {appliedPoisonCount}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={styles.count}>
                      <Typography sx={styles.countText}>
                        {tokenBalances["POISON"]}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Box>

              <Box sx={styles.divider} />

              <Box sx={styles.potionSubGroup}>
                <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
                  <Typography sx={styles.tooltipTitle}>Revive Potions</Typography>
                  <Typography sx={styles.tooltipText}>
                    {revivalPotionsRequired > 0
                      ? `${revivalPotionsRequired} required for attack`
                      : 'Attack with your dead beasts'}
                  </Typography>
                  {revivalPotionsRequired > tokenBalances["REVIVE"] && (
                    <Typography sx={styles.tooltipWarning}>
                      ⚠️ Not enough potions!
                    </Typography>
                  )}
                </Box>}>
                  <Box sx={[
                    styles.potionButton,
                    revivalPotionsRequired > 0 && styles.potionButtonActive,
                    revivalPotionsRequired > tokenBalances["REVIVE"] && styles.potionButtonInsufficient
                  ]}>
                    <img src={revivePotionIcon} alt='' height={'24px'} />
                    {revivalPotionsRequired > 0 && (
                      <Box sx={styles.requiredIndicator}>
                        <Typography sx={styles.requiredText}>
                          {revivalPotionsRequired}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={styles.count}>
                      <Typography sx={styles.countText}>
                        {tokenBalances["REVIVE"]}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>

                <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.tooltip}>
                  <Typography sx={styles.tooltipTitle}>Attack Potion</Typography>
                  <Typography sx={styles.tooltipText}>
                    {appliedAttackPotions > 0
                      ? `${appliedAttackPotions * 10}% damage boost applied`
                      : 'Add 10% damage boost per potion'}
                  </Typography>
                  <Typography sx={styles.tooltipSubtext}>
                    Applied on next attack
                  </Typography>
                </Box>}>
                  <Box sx={[
                    styles.potionButton,
                    appliedAttackPotions > 0 && styles.potionButtonActive,
                    appliedAttackPotions > 0 && styles.potionButtonApplied,
                  ]}>
                    <img src={attackPotionIcon} alt='' height={'24px'} />
                    {appliedAttackPotions > 0 && (
                      <Box sx={styles.appliedIndicator}>
                        <Typography sx={styles.appliedText}>
                          {appliedAttackPotions}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={styles.count}>
                      <Typography sx={styles.countText}>
                        {tokenBalances["ATTACK"]}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Box>
            </>
          )}
        </>
      )}
    </Box>

    {autopilotConfigOpen && (
      <AutopilotConfigModal
        open={autopilotConfigOpen}
        close={() => setAutopilotConfigOpen(false)}
      />
    )}

    {/* Attack Mode Dropdown Menu */}
    <Menu
      sx={{
        zIndex: 10000,
        '& .MuiPaper-root': {
          backgroundColor: '#1a1f1a',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${gameColors.brightGreen}`,
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          overflow: 'visible',
        }
      }}
      anchorEl={attackDropdownAnchor}
      open={Boolean(attackDropdownAnchor)}
      onClose={() => setAttackDropdownAnchor(null)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem
        onClick={() => {
          setAttackMode('safe');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'safe' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Safe Attack</Typography>
          <Typography sx={styles.menuItemDescription}>
            Attack only if Summit beast hasn't changed
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem
        onClick={() => {
          setAttackMode('unsafe');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'unsafe' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Unsafe Attack</Typography>
          <Typography sx={styles.menuItemDescription}>
            Attack no matter what
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem
        onClick={() => {
          setAttackMode('autopilot');
          setAttackDropdownAnchor(null);
        }}
        sx={{
          ...styles.menuItem,
          backgroundColor: attackMode === 'autopilot' ? `${gameColors.brightGreen}20` : 'transparent',
        }}
      >
        <Box>
          <Typography sx={styles.menuItemTitle}>Autopilot</Typography>
          <Typography sx={styles.menuItemDescription}>
            Toggle automatic attacking on or off
          </Typography>
        </Box>
      </MenuItem>
    </Menu>

    {potion && <Menu
      sx={{
        zIndex: 10000,
        '& .MuiPaper-root': {
          backgroundColor: '#1a1f1a',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${gameColors.brightGreen}`,
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          overflow: 'visible',
        }
      }}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Box width={'220px'} display={'flex'} flexDirection={'column'} p={1.25} gap={0.5}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <img
              src={potion === 'extraLife' ? lifePotionIcon : poisonPotionIcon}
              alt=""
              height={'18px'}
              style={{ opacity: 0.95 }}
            />
            <Typography sx={styles.menuItemTitle} noWrap>
              {potion === 'extraLife' ? 'Extra Life' : 'Poison Summit Beast'}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ ...styles.menuItemDescription, opacity: 0.9, my: 1 }}>
          {potion === 'poison'
            ? 'Select amount to apply'
            : isSavage
              ? 'Select amount to apply to the Summit'
              : 'Select amount to apply after you take the Summit'
          }
        </Typography>

        <Box
          display={'flex'}
          alignItems={'center'}
          justifyContent={'space-between'}
          width={'100%'}
          mb={1}
        >
          <IconButton
            size="small"
            sx={{
              color: gameColors.gameYellow,
              backgroundColor: 'transparent',
              border: `1px solid ${gameColors.gameYellow}30`,
              borderRadius: '4px',
              padding: '4px',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `${gameColors.gameYellow}10`,
                borderColor: gameColors.gameYellow,
              }
            }}
            onClick={() => {
              if (potion === 'poison') {
                setAppliedPoisonCount(Math.max(0, appliedPoisonCount - 1));
              } else if (potion === 'extraLife') {
                setAppliedExtraLifePotions(Math.max(0, appliedExtraLifePotions - 1));
              }
            }}>
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Typography
            component={'div'}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <TextField
              type="text"
              size="small"
              variant="outlined"
              value={potion === 'extraLife' ? appliedExtraLifePotions : appliedPoisonCount}
              onChange={(e) => {
                const raw = e.target.value;
                let next = parseInt(raw, 10);
                if (isNaN(next)) next = 0;
                next = Math.max(0, next);
                const maxCap =
                  potion === 'extraLife'
                    ? Math.min(tokenBalances["EXTRA LIFE"] || 4000)
                    : Math.min(tokenBalances["POISON"] || 0, 2050);
                next = Math.min(next, maxCap);
                if (potion === 'poison') {
                  setAppliedPoisonCount(next);
                } else if (potion === 'extraLife') {
                  setAppliedExtraLifePotions(next);
                }
              }}
              slotProps={{
                input: {
                  inputProps: {
                    min: 0,
                    max:
                      potion === 'extraLife'
                        ? Math.min(tokenBalances["EXTRA LIFE"] || 4000)
                        : Math.min(tokenBalances["POISON"] || 0, 2050),
                    inputMode: 'numeric',
                  }
                }
              }}
              sx={{
                width: 96,
                '& .MuiInputBase-input': {
                  color: gameColors.gameYellow,
                  textAlign: 'center',
                  padding: '4px 6px',
                  fontWeight: 500,
                  fontSize: '14px',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${gameColors.gameYellow}30`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: gameColors.gameYellow,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: gameColors.gameYellow,
                },
              }}
            />
          </Typography>

          <IconButton
            size="small"
            sx={{
              color: gameColors.gameYellow,
              backgroundColor: 'transparent',
              border: `1px solid ${gameColors.gameYellow}30`,
              borderRadius: '4px',
              padding: '4px',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: `${gameColors.gameYellow}10`,
                borderColor: gameColors.gameYellow,
              }
            }}
            onClick={() => {
              if (potion === 'poison') {
                setAppliedPoisonCount(Math.min(appliedPoisonCount + 1, Math.min(tokenBalances["POISON"], 2050)));
              } else if (potion === 'extraLife') {
                setAppliedExtraLifePotions(Math.min(appliedExtraLifePotions + 1, Math.min(tokenBalances["EXTRA LIFE"] || 4000)));
              }
            }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ width: '100%', px: 1, boxSizing: 'border-box' }}>
          <Slider
            value={potion === 'extraLife' ? appliedExtraLifePotions : appliedPoisonCount}
            step={1}
            min={0}
            max={
              Math.min(
                potion === 'extraLife'
                  ? Math.min(tokenBalances["EXTRA LIFE"] || 4000)
                  : Math.min(tokenBalances["POISON"] || 0, 2050)
              )
            }
            onChange={(e, value) => {
              if (potion === 'poison') {
                setAppliedPoisonCount(value);
              } else if (potion === 'extraLife') {
                setAppliedExtraLifePotions(value);
              }
            }}
            size='small'
            sx={{
              color: gameColors.gameYellow,
              width: '100%',
              height: 4,
              '& .MuiSlider-thumb': {
                backgroundColor: gameColors.gameYellow,
                width: 14,
                height: 14,
                border: 'none',
                boxShadow: 'none',
                transition: 'opacity 0.15s ease',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              '& .MuiSlider-track': {
                backgroundColor: gameColors.gameYellow,
                height: 4,
                border: 'none',
              },
              '& .MuiSlider-rail': {
                backgroundColor: `${gameColors.gameYellow}20`,
                height: 4,
              },
              '& .MuiSlider-valueLabel': {
                backgroundColor: '#2a2f2a',
                border: `1px solid ${gameColors.gameYellow}40`,
                borderRadius: '4px',
                fontSize: '12px',
                '& *': {
                  color: gameColors.gameYellow,
                }
              }
            }}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            boxSizing: 'border-box',
            px: 0.5,
          }}
        >
          <Typography sx={{ fontSize: '11px', color: gameColors.gameYellow, opacity: 0.6 }}>
            0
          </Typography>
          <Typography sx={{ fontSize: '11px', color: gameColors.gameYellow, opacity: 0.6 }}>
            {
              Math.min(
                potion === 'extraLife'
                  ? Math.min(tokenBalances["EXTRA LIFE"] || 4000)
                  : Math.min(tokenBalances["POISON"] || 0, 2050)
              )
            }
          </Typography>
        </Box>

        {potion === 'poison' && (
          <Button
            fullWidth
            variant="contained"
            disabled={!enableApplyPoison}
            onClick={() => {
              handleApplyPoison(appliedPoisonCount);
              handleClose();
            }}
            sx={{
              mt: 1,
              background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}70 100%)`,
              border: `1px solid ${gameColors.brightGreen}`,
              borderRadius: '5px',
              color: '#ffedbb',
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                color: '#ffedbb',
                background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}80 100%)`,
              },
              '&.Mui-disabled': {
                borderColor: `${gameColors.lightGreen}40`,
                color: `${gameColors.lightGreen}`,
                opacity: 0.7,
              },
            }}
          >
            {applyingPotions ? 'Applying…' : 'Apply Poison'}
          </Button>
        )}

        {potion === 'extraLife' && isSavage && (
          <Button
            fullWidth
            variant="contained"
            disabled={!enableApplyExtraLife}
            onClick={() => {
              handleApplyExtraLife(appliedExtraLifePotions);
              handleClose();
            }}
            sx={{
              mt: 1,
              background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}70 100%)`,
              border: `1px solid ${gameColors.brightGreen}`,
              borderRadius: '5px',
              color: '#ffedbb',
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                color: '#ffedbb',
                background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}80 100%)`,
              },
              '&.Mui-disabled': {
                borderColor: `${gameColors.lightGreen}40`,
                color: `${gameColors.lightGreen}`,
                opacity: 0.7,
              },
            }}
          >
            {applyingPotions ? 'Applying…' : 'Apply Extra Life'}
          </Button>
        )}
      </Box>
    </Menu>}
  </Box>
}

export default ActionBar;

const styles = {
  container: {
    height: '60px',
    width: '100%',
    maxWidth: '100dvw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    boxSizing: 'border-box',
    zIndex: 100,
    overflowX: 'auto',
    overflowY: 'hidden',
    position: 'relative',
  },
  autopilotOverlay: {
    width: '100%',
    backdropFilter: 'blur(12px) saturate(1.2)',
    boxShadow: `
    inset 0 1px 0 ${gameColors.accentGreen}30,
    0 4px 16px rgba(0, 0, 0, 0.4),
    0 0 0 1px ${gameColors.darkGreen}60
  `,
  },
  autopilotOverlayInner: {
    borderRadius: '18px',
    border: `1px solid ${gameColors.brightGreen}70`,
    backdropFilter: 'blur(14px) saturate(1.25)',
    boxShadow: `
      0 18px 42px rgba(0, 0, 0, 0.55),
      0 0 36px ${gameColors.brightGreen}25,
      inset 0 1px 0 ${gameColors.accentGreen}35,
      inset 0 0 0 1px ${gameColors.darkGreen}70
    `,
    overflow: 'hidden',
    position: 'relative' as const,
    '@keyframes autopilotGlowBig': {
      '0%': { filter: 'brightness(1)' },
      '50%': { filter: 'brightness(1.06)' },
      '100%': { filter: 'brightness(1)' },
    },
    animation: 'autopilotGlowBig 2.6s ease-in-out infinite',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, transparent 0%, ${gameColors.brightGreen}14 35%, transparent 70%)`,
      transform: 'translateX(-60%)',
      '@keyframes autopilotScanBig': {
        '0%': { transform: 'translateX(-60%)' },
        '100%': { transform: 'translateX(60%)' },
      },
      animation: 'autopilotScanBig 2.2s linear infinite',
      pointerEvents: 'none',
      opacity: 0.55,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '100% 3px',
      opacity: 0.10,
      pointerEvents: 'none',
    },
  },
  autopilotOverlayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    px: 1.6,
    py: 1.1,
    borderBottom: `1px solid ${gameColors.accentGreen}35`,
    position: 'relative' as const,
  },
  autopilotOverlayTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.2,
    minWidth: 0,
  },
  autopilotOverlayTitle: {
    fontSize: isBrowser ? '14px' : '13px',
    fontWeight: 1000,
    letterSpacing: '1.2px',
    color: '#ffedbb',
    lineHeight: 1.05,
    textShadow: `0 0 18px ${gameColors.brightGreen}35`,
  },
  autopilotOverlayStatus: {
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '0.9px',
    color: gameColors.accentGreen,
    opacity: 0.95,
    mt: 0.25,
  },
  autopilotOverlayStopButton: {
    textTransform: 'none' as const,
    color: '#ffedbb',
    fontWeight: 1000,
    letterSpacing: '0.2px',
    borderRadius: '12px',
    height: '36px',
    px: 1.4,
    background: `linear-gradient(135deg, ${gameColors.red}55 50%, ${gameColors.darkGreen}30 100%)`,
    border: `1px solid ${gameColors.red}`,
    '&:hover': {
      color: '#ffedbb',
      background: `linear-gradient(135deg, ${gameColors.red}70 0%, ${gameColors.darkGreen}95 100%)`,
    },
  },
  autopilotOverlayContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    px: 1.6,
    py: 1,
    position: 'relative' as const,
  },
  autopilotOverlayBudgetsHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0.4,
  },
  autopilotOverlayBudgetsTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: gameColors.accentGreen,
    opacity: 0.8,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  autopilotOverlayBudgets: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap' as const,
  },
  autopilotOverlayBudgetPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    borderRadius: '999px',
    border: `1px solid ${gameColors.accentGreen}45`,
    background: `${gameColors.darkGreen}70`,
    boxShadow: `inset 0 1px 0 ${gameColors.accentGreen}18`,
    height: '30px',
    px: 1.2,
  },
  autopilotOverlayBudgetPillLabel: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#ffedbb',
    letterSpacing: '0.2px',
  },
  autopilotOverlayBudgetPillValue: {
    fontSize: '12px',
    fontWeight: 1000,
    color: gameColors.brightGreen,
    minWidth: '22px',
    textAlign: 'right' as const,
    textShadow: `0 0 14px ${gameColors.brightGreen}22`,
    marginLeft: '2px',
  },
  autopilotOverlayLog: {
    borderRadius: '14px',
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}6A`,
    boxShadow: `inset 0 1px 0 ${gameColors.accentGreen}18`,
    overflow: 'hidden',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: isBrowser ? '150px' : '130px',
  },
  autopilotOverlayLogBody: {
    px: 1.2,
    py: 0.9,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    flex: 1,
    '@keyframes autopilotCursorBig': {
      '0%': { opacity: 0.2 },
      '50%': { opacity: 1 },
      '100%': { opacity: 0.2 },
    },
  },
  autopilotOverlayLogLine: {
    fontSize: '12px',
    fontWeight: 800,
    color: gameColors.accentGreen,
    lineHeight: 1.35,
    textShadow: `0 0 12px ${gameColors.brightGreen}15`,
    wordBreak: 'break-word' as const,
    '&:last-of-type::after': {
      content: '"▌"',
      marginLeft: '8px',
      color: gameColors.brightGreen,
      animation: 'autopilotCursorBig 1.0s ease-in-out infinite',
    },
  },
  collectionSyncing: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'baseline',
  },
  collectionSyncingText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: `
      linear-gradient(135deg, 
        ${gameColors.darkGreen}90 0%, 
        ${gameColors.mediumGreen}80 50%, 
        ${gameColors.darkGreen}90 100%
      )
    `,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '8px',
    marginBottom: '-1px',
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}30,
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${gameColors.darkGreen}60
    `,
  },
  autopilotButtonGroup: {
    border: 'none',
    backdropFilter: 'none',
    boxShadow: 'none',
    background: 'transparent',
    padding: '0px',
    px: 1,
  },
  potionSubGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  attackButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  attackButton: {
    padding: '10px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}20`,
    border: `2px solid ${gameColors.lightGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: isBrowser ? '200px' : '120px',
    textAlign: 'center',
    opacity: 0.7,
    '&:hover': {
      opacity: 0.9,
      boxShadow: `0 2px 6px rgba(0, 0, 0, 0.2)`,
    }
  },
  attackButtonMain: {
    borderTopRightRadius: '0px',
    borderBottomRightRadius: '0px',
    borderRight: 'none',
  },
  attackDropdownButton: {
    padding: '10px 8px',
    borderRadius: '8px',
    borderTopLeftRadius: '0px',
    borderBottomLeftRadius: '0px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}50 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}60 100%)`,
    }
  },
  attackButtonEnabled: {
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}30 0%, ${gameColors.darkGreen}50 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    boxShadow: `
      0 0 16px ${gameColors.brightGreen}40,
      0 4px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 ${gameColors.accentGreen}30
    `,
    '&:hover': {
      opacity: 1,
      background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}60 100%)`,
      boxShadow: `
        0 0 20px ${gameColors.brightGreen}60,
        0 6px 12px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 ${gameColors.brightGreen}40
      `,
    }
  },
  savageButton: {
    background: `linear-gradient(135deg, ${gameColors.yellow}20 0%, ${gameColors.orange}20 100%)`,
    border: `1px solid ${gameColors.yellow}`,
    boxShadow: `0 0 12px ${gameColors.yellow}40`,
  },
  potionButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}40`,
    border: `2px solid ${gameColors.accentGreen}60`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0.6,
    '&:hover': {
      border: `2px solid ${gameColors.brightGreen}80`,
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.3)`,
      opacity: 0.8,
    }
  },
  configButton: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}60`,
    border: `2px solid ${gameColors.accentGreen}80`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 0 10px ${gameColors.accentGreen}40
    `,
    '&:hover': {
      borderColor: gameColors.brightGreen,
      background: `linear-gradient(135deg, ${gameColors.mediumGreen}60 0%, ${gameColors.darkGreen} 100%)`,
      boxShadow: `
        0 0 14px ${gameColors.brightGreen}60,
        0 4px 10px rgba(0, 0, 0, 0.6)
      `,
      transform: 'translateY(-1px)',
    },
  },
  potionButtonActive: {
    opacity: 1,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}60 0%, ${gameColors.darkGreen}80 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}50,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 ${gameColors.accentGreen}40
    `,
    '&:hover': {
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}70,
        0 6px 12px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 ${gameColors.brightGreen}60
      `,
      background: `linear-gradient(135deg, ${gameColors.lightGreen}60 0%, ${gameColors.mediumGreen}80 100%)`,
    }
  },
  count: {
    position: 'absolute',
    bottom: '-6px',
    right: '-6px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.darkGreen}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    boxShadow: `
      0 2px 4px rgba(0, 0, 0, 0.6),
      0 0 8px ${gameColors.brightGreen}40,
      inset 0 1px 0 rgba(255, 255, 255, 0.2)
    `,
  },
  countText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    lineHeight: 1,
    textShadow: `0 1px 1px rgba(255, 255, 255, 0.3)`,
  },
  buttonText: {
    color: '#58b000',
    fontWeight: 'bold',
  },
  autopilotOnText: {
    color: '#ffedbb',
  },
  autopilotOffText: {
    opacity: 0.7,
  },
  disabledText: {
    color: `${gameColors.lightGreen}`,
  },
  statText: {
    color: gameColors.brightGreen,
    fontSize: '14px',
    fontWeight: 'bold',
  },
  potionCount: {
    color: '#ffedbb',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tooltip: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    border: `2px solid ${gameColors.accentGreen}`,
    borderRadius: '6px',
    padding: '8px 12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  tooltipTitle: {
    color: '#ffedbb',
    fontWeight: 'bold',
    fontSize: '14px',
    mb: 0.3,
  },
  tooltipText: {
    color: gameColors.accentGreen,
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tooltipSubtext: {
    color: '#999',
    fontSize: '11px',
    fontStyle: 'italic',
    lineHeight: 1.1,
    mt: 0.5,
  },
  divider: {
    width: '1px',
    height: '40px',
    background: `linear-gradient(to bottom, transparent 0%, ${gameColors.accentGreen}60 25%, ${gameColors.accentGreen}60 75%, transparent 100%)`,
    opacity: 0.6,
  },
  // Autopilot UI moved to fixed overlay (see autopilotOverlay*)
  autopilotStatusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '999px',
    background: gameColors.brightGreen,
    boxShadow: `0 0 10px ${gameColors.brightGreen}90`,
    '@keyframes autopilotBeat': {
      '0%': { transform: 'scale(1)', opacity: 0.85 },
      '50%': { transform: 'scale(1.25)', opacity: 1 },
      '100%': { transform: 'scale(1)', opacity: 0.85 },
    },
    animation: 'autopilotBeat 1.15s ease-in-out infinite',
  },
  potionButtonInsufficient: {
    border: `2px solid ${gameColors.red}`,
    background: `linear-gradient(135deg, ${gameColors.red}20 0%, ${gameColors.darkGreen}80 100%)`,
    '&:hover': {
      border: `2px solid ${gameColors.red}`,
      boxShadow: `0 0 12px ${gameColors.red}40`,
    }
  },
  potionButtonApplied: {
    border: `2px solid ${gameColors.yellow}`,
    boxShadow: `
      0 0 16px ${gameColors.yellow}50,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 ${gameColors.yellow}40
    `,
  },
  requiredIndicator: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    borderRadius: '50%',
    background: gameColors.red,
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${gameColors.darkGreen}`,
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.6)`,
  },
  requiredText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffedbb',
    lineHeight: 1,
  },
  appliedIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: `${gameColors.yellow}90`,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 8px ${gameColors.yellow}60`,
  },
  appliedText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    lineHeight: 1,
  },
  insufficientWarning: {
    fontSize: '9px',
    color: gameColors.red,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  tooltipWarning: {
    color: gameColors.red,
    fontSize: '11px',
    fontWeight: 'bold',
    mt: 0.5,
  },
  menuItem: {
    padding: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: `${gameColors.brightGreen}30`,
    }
  },
  menuItemTitle: {
    color: gameColors.brightGreen,
    fontWeight: 'bold',
    fontSize: '14px',
  },
  menuItemDescription: {
    color: gameColors.accentGreen,
    fontSize: '12px',
    lineHeight: 1.3,
  },
}
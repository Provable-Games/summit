import { useController } from '@/contexts/controller';
import { MAX_BEASTS_PER_ATTACK } from '@/contexts/GameDirector';
import { useQuestGuide } from '@/contexts/QuestGuide';
import type { BeastTypeFilter, QuestFilterKey, SortMethod } from '@/stores/gameStore';
import { useGameStore } from '@/stores/gameStore';
import type { Beast, selection } from '@/types/game';
import {
  calculateMaxAttackPotions, calculateOptimalAttackPotions, getBeastCurrentHealth,
  getBeastRevivalTime,
  isBeastLocked
} from '@/utils/beasts';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import DiamondIcon from '@mui/icons-material/Diamond';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FilterListIcon from '@mui/icons-material/FilterList';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import RemoveIcon from '@mui/icons-material/Remove';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, IconButton, Link, Popover, TextField, Tooltip, Typography } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import attackPotionIcon from '../assets/images/attack-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import swordIcon from '../assets/images/sword.png';
import bruteIcon from '../assets/types/brute.svg';
import { calculateBattleResult } from "../utils/beasts";
import { gameColors } from '../utils/themes';
import BeastCard from './BeastCard';
import BeastProfile from './BeastProfile';

function BeastCollection() {
  const {
    loadingCollection, collection, selectedBeasts, setSelectedBeasts,
    attackInProgress, summit, attackMode,
    hideDeadBeasts, setHideDeadBeasts,
    sortMethod, setSortMethod,
    typeFilter, setTypeFilter,
    nameMatchFilter, setNameMatchFilter,
    questFilter, toggleQuestFilter,
  } = useGameStore()
  const { tokenBalances } = useController()
  const { address } = useAccount()
  const { notifyTargetClicked, isStepTarget: _isStepTarget } = useQuestGuide()
  const [hoveredBeast, setHoveredBeast] = useState<Beast | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const [attackSettingsBeastId, setAttackSettingsBeastId] = useState<number | null>(null)
  const [attackSettingsAnchorEl, setAttackSettingsAnchorEl] = useState<HTMLElement | null>(null)
  const [potionSettingsAnchorEl, setPotionSettingsAnchorEl] = useState<HTMLElement | null>(null)
  const [bulkAttackAnchorEl, setBulkAttackAnchorEl] = useState<HTMLElement | null>(null)
  const [bulkPotionAnchorEl, setBulkPotionAnchorEl] = useState<HTMLElement | null>(null)

  const MAX_ATTACKS_PER_BEAST = 65000;
  const clampAttacks = (value: number) => Math.max(1, Math.min(MAX_ATTACKS_PER_BEAST, value));

  const setBeastAttacks = useCallback((beastId: number, nextAttacks: number) => {
    const next = clampAttacks(nextAttacks);
    setSelectedBeasts((prev) =>
      prev.map((selection) =>
        selection[0].token_id === beastId ? [selection[0], next, selection[2]] : selection
      )
    );
  }, []);

  const setBulkAttacks = useCallback((count: number) => {
    const next = clampAttacks(count);
    setSelectedBeasts((prev) => prev.map((s) => [s[0], next, s[2]]));
  }, []);

  const setBulkPotions = useCallback((mode: 'none' | 'optimal' | 'max' | number) => {
    const maxAvailable = Math.min(tokenBalances["ATTACK"] || 0, 255);
    if (mode === 'none') {
      setSelectedBeasts((prev) => prev.map((s) => [s[0], s[1], 0]));
    } else if (mode === 'optimal') {
      if (!summit) return;
      setSelectedBeasts((prev) => prev.map((s) => {
        const potions = calculateOptimalAttackPotions(s, summit, maxAvailable);
        return [s[0], s[1], potions];
      }));
    } else if (mode === 'max') {
      if (!summit) return;
      setSelectedBeasts((prev) => prev.map((s) => {
        const potions = calculateMaxAttackPotions(s, summit, maxAvailable);
        return [s[0], s[1], potions];
      }));
    } else {
      const value = Math.max(0, Math.min(maxAvailable, mode));
      setSelectedBeasts((prev) => prev.map((s) => [s[0], s[1], value]));
    }
  }, [summit, tokenBalances]);

  const isStrongAgainst = (attackerType: string, defenderType: string): boolean => {
    return (
      (attackerType === 'Hunter' && defenderType === 'Magic') ||
      (attackerType === 'Magic' && defenderType === 'Brute') ||
      (attackerType === 'Brute' && defenderType === 'Hunter')
    );
  };

  // Calculate combat results - lightweight operation (just math)
  // useMemo prevents recalculation when filters/sorting change
  const collectionWithCombat = useMemo(() => {
    if (summit && collection.length > 0) {
      let filtered = collection.map((beast: Beast) => {
        const newBeast = { ...beast }
        newBeast.revival_time = getBeastRevivalTime(newBeast);
        newBeast.current_health = getBeastCurrentHealth(newBeast)
        newBeast.combat = calculateBattleResult(newBeast, summit, 0)
        return newBeast
      });

      // Apply type filter
      if (typeFilter === 'strong') {
        filtered = filtered.filter(beast => isStrongAgainst(beast.type, summit.beast.type));
      }

      // Apply name match filter
      if (nameMatchFilter) {
        filtered = filtered.filter(beast =>
          beast.prefix === summit.beast.prefix || beast.suffix === summit.beast.suffix
        );
      }

      // Apply dead beast filter
      if (hideDeadBeasts) {
        filtered = filtered.filter(beast => beast.current_health > 0 && !isBeastLocked(beast));
      }

      // Apply quest filters (show beasts that have NOT completed selected quests)
      if (questFilter.firstBlood) {
        filtered = filtered.filter(beast => beast.bonus_xp === 0);
      }
      if (questFilter.consistencyIsKey) {
        filtered = filtered.filter(beast => !beast.max_attack_streak);
      }
      if (questFilter.levelUp1) {
        filtered = filtered.filter(beast => beast.current_level - beast.level < 1);
      }
      if (questFilter.levelUp3) {
        filtered = filtered.filter(beast => beast.current_level - beast.level < 3);
      }
      if (questFilter.levelUp5) {
        filtered = filtered.filter(beast => beast.current_level - beast.level < 5);
      }
      if (questFilter.levelUp10) {
        filtered = filtered.filter(beast => beast.current_level - beast.level < 10);
      }
      if (questFilter.summitConqueror) {
        filtered = filtered.filter(beast => !beast.captured_summit);
      }
      if (questFilter.ironGrip) {
        filtered = filtered.filter(beast => beast.summit_held_seconds < 10);
      }
      if (questFilter.secondWind) {
        filtered = filtered.filter(beast => !beast.used_revival_potion);
      }
      if (questFilter.vitalBoost) {
        filtered = filtered.filter(beast => !beast.used_attack_potion);
      }

      // Sort the filtered collection
      return filtered.sort((a: Beast, b: Beast) => {
        // Always keep summit beast at the top
        if (a.token_id === summit.beast.token_id) {
          return -1
        } else if (b.token_id === summit.beast.token_id) {
          return 1
        }

        // Apply selected sorting method
        if (sortMethod === 'recommended') {
          // When nameMatchFilter is active, prioritize beasts that match both prefix & suffix
          if (nameMatchFilter) {
            const aMatchesBoth = a.prefix === summit.beast.prefix && a.suffix === summit.beast.suffix;
            const bMatchesBoth = b.prefix === summit.beast.prefix && b.suffix === summit.beast.suffix;

            if (aMatchesBoth && !bMatchesBoth) {
              return -1; // a comes first
            } else if (!aMatchesBoth && bMatchesBoth) {
              return 1; // b comes first
            }
            // If both match both or neither matches both, continue with normal sorting
          }

          if (a.combat?.score !== b.combat?.score) {
            return (b.combat?.score ?? Number.NEGATIVE_INFINITY) - (a.combat?.score ?? Number.NEGATIVE_INFINITY)
          } else if (b.combat?.attack !== a.combat?.attack) {
            return (b.combat?.attack ?? Number.NEGATIVE_INFINITY) - (a.combat?.attack ?? Number.NEGATIVE_INFINITY)
          } else if (b.power !== a.power) {
            return b.power - a.power
          } else if (b.health + b.bonus_health !== a.health + a.bonus_health) {
            return (b.health + b.bonus_health) - (a.health + a.bonus_health)
          }
        } else if (sortMethod === 'power') {
          return b.power - a.power
        } else if (sortMethod === 'attack') {
          return (b.combat?.attack || 0) - (a.combat?.attack || 0)
        } else if (sortMethod === 'health') {
          return (b.health + b.bonus_health) - (a.health + a.bonus_health)
        } else if (sortMethod === 'seconds held') {
          if (b.summit_held_seconds !== a.summit_held_seconds) {
            return b.summit_held_seconds - a.summit_held_seconds
          }
          // Tiebreaker: lower power wins (same as top 5000 logic)
          if (a.power !== b.power) {
            return a.power - b.power
          }
          // Second tiebreaker: lower health wins
          return (a.health + a.bonus_health) - (b.health + b.bonus_health)
        }
        return 0
      })
    }

    return collection.sort((a, b) => b.power - a.power)
  }, [collection, summit?.beast.token_id, sortMethod, typeFilter, nameMatchFilter, hideDeadBeasts, questFilter]);

  const selectBeast = useCallback((beast: Beast, isFirstBeast: boolean = false) => {
    if (attackInProgress || attackMode === 'autopilot') return;
    if (isBeastLocked(beast)) return;

    // Notify quest guide if this is the first beast being clicked
    if (isFirstBeast) {
      notifyTargetClicked('beast-card-first');
    }

    if (selectedBeasts.find(selection => selection[0].token_id === beast.token_id)) {
      setSelectedBeasts((prev: selection) => prev.filter(selection => selection[0].token_id !== beast.token_id));
    } else {
      setSelectedBeasts((prev: selection) => [...prev, [beast, 1, 0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackInProgress, attackMode, selectedBeasts, notifyTargetClicked]);

  const selectAllBeasts = () => {
    if (attackInProgress) return;

    const allBeasts = collectionWithCombat.filter((beast: Beast) => !isBeastLocked(beast));
    const maxBeasts = Math.min(MAX_BEASTS_PER_ATTACK, allBeasts.length);

    if (selectedBeasts.length >= maxBeasts) {
      setSelectedBeasts([])
    } else {
      setSelectedBeasts(allBeasts.slice(0, maxBeasts).map(beast => [beast, 1, 0]))
    }
  }

  const hideDead = (hide: boolean) => {
    if (attackInProgress) return;

    setHideDeadBeasts(hide)
  }

  const maxBeastsSelected = useMemo(() => {
    const allBeasts = collectionWithCombat.filter((beast: Beast) => !isBeastLocked(beast));
    const maxBeasts = Math.min(MAX_BEASTS_PER_ATTACK, allBeasts.length);
    return allBeasts.length > 0 && selectedBeasts.length >= maxBeasts;
  }, [collectionWithCombat, selectedBeasts]);

  const handleHoverEnter = useCallback((event: React.MouseEvent<HTMLElement>, beast: Beast) => {
    setAnchorEl(event.currentTarget);
    setHoveredBeast(beast);
  }, []);

  const handleHoverLeave = useCallback(() => {
    setAnchorEl(null);
    setHoveredBeast(null);
  }, []);

  const openAttackSettings = useCallback((e: React.MouseEvent<HTMLElement>, beastId: number) => {
    e.stopPropagation();
    setPotionSettingsAnchorEl(null);
    setAttackSettingsAnchorEl(e.currentTarget);
    setAttackSettingsBeastId(beastId);
  }, []);

  const openPotionSettings = useCallback((e: React.MouseEvent<HTMLElement>, beastId: number) => {
    e.stopPropagation();
    setAttackSettingsAnchorEl(null);
    setAttackSettingsBeastId(beastId);
    setPotionSettingsAnchorEl(e.currentTarget);
  }, []);

  const closeAttackSettings = useCallback(() => {
    setAttackSettingsAnchorEl(null);
    setAttackSettingsBeastId(null);
  }, []);

  const closePotionSettings = useCallback(() => {
    setPotionSettingsAnchorEl(null);
  }, []);

  // Virtual scrolling setup for horizontal list
  const parentRef = useRef<HTMLDivElement>(null);

  const ITEM_WIDTH = 148; // 140px card + 8px gap - FIXED SIZE

  const virtualizer = useVirtualizer({
    count: collectionWithCombat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_WIDTH, // Fixed size, no estimation needed
    horizontal: true,
    overscan: 100,
    // No measureElement - we know exact size, so no re-measurement jumps!
  });

  return (
    <Box sx={styles.container}>
      {!address && !loadingCollection && (
        <Box sx={styles.emptyState}>
          <Box sx={styles.connectWalletContent}>
            {/* Text and Steps */}
            <Box sx={styles.connectTextContainer}>
              <Typography sx={styles.emptyStateTitle}>
                GET STARTED
              </Typography>

              {/* Steps */}
              <Box sx={styles.stepsContainer}>
                <Box sx={styles.step}>
                  <Box sx={styles.stepNumber}>1</Box>
                  <Typography sx={styles.stepText}>Connect your Beast Wallet</Typography>
                </Box>
                <Box sx={styles.step}>
                  <Box sx={styles.stepNumber}>2</Box>
                  <Typography sx={styles.stepText}>Select your beasts for battle</Typography>
                </Box>
                <Box sx={styles.step}>
                  <Box sx={styles.stepNumber}>3</Box>
                  <Typography sx={styles.stepText}>Conquer the summit</Typography>
                </Box>
              </Box>
            </Box>

            {/* Beast Images */}
            <Box sx={styles.beastShowcase}>
              <Box sx={[styles.showcaseBeast, styles.showcaseBeastLeft]}>
                <img src="/images/beasts/titan.png" alt="" style={styles.showcaseImage} />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {address && !loadingCollection && collection.length < 1 && (
        <Box sx={styles.emptyState}>
          <Box sx={styles.noBeastsContent}>
            {/* Text and Steps */}
            <Box sx={styles.noBeastsTextContainer}>
              <Typography sx={styles.emptyStateTitle} mb={1}>
                NO BEASTS FOUND
              </Typography>

              <Box sx={styles.noBeastsOptions}>
                <Box sx={styles.noBeastsOption}>
                  <Typography sx={styles.emptyStateSubtitle} mb={'2px'}>
                    COLLECT BEASTS BY PLAYING
                  </Typography>
                  <Link
                    sx={[styles.emptyStateSubtitle, { textDecoration: 'underline !important' }]}
                    href="https://lootsurvivor.io/survivor"
                    target="_blank"
                  >
                    LOOT SURVIVOR 2
                  </Link>
                </Box>

                <Box sx={styles.noBeastsOptionsDivider}>
                  <Box sx={styles.emptyStateDividerLine} />
                  <Typography sx={styles.emptyStateDividerText}>OR</Typography>
                  <Box sx={styles.emptyStateDividerLine} />
                </Box>

                <Box sx={styles.noBeastsOption}>
                  <Typography sx={styles.emptyStateSubtitle}>
                    BUY BEASTS ON {' '}
                    <Link
                      sx={[styles.emptyStateSubtitle, { textDecoration: 'underline !important' }]}
                      href="https://beast-dex.vercel.app/marketplace"
                      target="_blank"
                    >
                      MARKETPLACE
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Sad Beast */}
            <Box sx={styles.singleBeastShowcase}>
              <img src="/images/beasts/wolf.png" alt="" style={styles.sadBeastImage} />
            </Box>
          </Box>
        </Box>
      )}

      {loadingCollection && (
        <Box sx={styles.emptyState}>
          <Box sx={styles.loadingStateContent}>
            {/* Text Content */}
            <Box sx={styles.loadingTextContainer}>
              <Typography sx={styles.emptyStateTitle}>
                SUMMONING BEASTS
              </Typography>
              <Typography sx={styles.loadingText}>
                Gathering your collection...
              </Typography>
              <Box sx={styles.loadingDots}>
                <Box sx={styles.loadingDot} />
                <Box sx={[styles.loadingDot, styles.loadingDotDelay1]} />
                <Box sx={[styles.loadingDot, styles.loadingDotDelay2]} />
              </Box>
            </Box>

            {/* Loading Beast */}
            <Box sx={styles.loadingBeastContainer}>
              <Box sx={styles.loadingGlow} />
              <img src="/images/beasts/warlock.png" alt="" style={styles.loadingBeastImage} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Beast Grid with Utility Buttons */}
      {!loadingCollection && collection.length > 0 && (
        <Box sx={styles.beastGridContainer}>
          {/* Left side: Utility Buttons and Filter Panel */}
          <Box sx={styles.leftSideContainer}>
            {/* Utility Buttons Column */}
            <Box sx={styles.utilityButtonsContainer}>
              <Tooltip placement='top' title={<Box sx={styles.tooltipContent}>Filter & Sort</Box>}>
                <Box
                  sx={[styles.utilityButton, filterExpanded && styles.selectedItem]}
                  onClick={() => setFilterExpanded(!filterExpanded)}
                >
                  <FilterListIcon sx={{ color: gameColors.brightGreen, fontSize: '20px' }} />
                </Box>
              </Tooltip>

              {attackMode !== 'autopilot' && <Tooltip placement='bottom' title={<Box sx={styles.tooltipContent}>Select 295</Box>}>
                <Box sx={[styles.utilityButton, maxBeastsSelected && styles.selectedItem]} onClick={() => selectAllBeasts()}>
                  <LibraryAddCheckIcon sx={{ color: gameColors.brightGreen, fontSize: '20px' }} />
                </Box>
              </Tooltip>}

              {attackMode !== 'autopilot' && selectedBeasts.length > 1 && (
                <>
                  <Tooltip placement='bottom' title={<Box sx={styles.tooltipContent}>Set Attacks For All</Box>}>
                    <Box sx={styles.utilityButton} onClick={(e) => { setBulkPotionAnchorEl(null); setBulkAttackAnchorEl(e.currentTarget); }}>
                      <img src="/images/sword.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    </Box>
                  </Tooltip>
                  <Tooltip placement='bottom' title={<Box sx={styles.tooltipContent}>Set Potions For All</Box>}>
                    <Box sx={styles.utilityButton} onClick={(e) => { setBulkAttackAnchorEl(null); setBulkPotionAnchorEl(e.currentTarget); }}>
                      <img src={attackPotionIcon} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                    </Box>
                  </Tooltip>
                </>
              )}
            </Box>

            {/* Filter Panel - Expands to the right */}
            <AnimatePresence>
              {filterExpanded && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Box sx={styles.filterPanel}>
                    {/* Sort Dropdown */}
                    <Box>
                      <Typography sx={styles.filterHeadline}>SORT BEASTS BY</Typography>
                      <Box
                        sx={styles.sortDropdown}
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      >
                        <Box sx={styles.sortDropdownCurrent}>
                          <Box sx={styles.sortOptionIcon}>
                            {sortMethod === 'recommended' && <TipsAndUpdatesIcon sx={{ fontSize: '12px', color: gameColors.gameYellow }} />}
                            {sortMethod === 'power' && <FlashOnIcon sx={{ fontSize: '12px', color: gameColors.yellow }} />}
                            {sortMethod === 'health' && <FavoriteIcon sx={{ fontSize: '12px', color: gameColors.red }} />}
                            {sortMethod === 'seconds held' && <img src="/images/survivor_token.png" alt="seconds held" style={{ width: '16px', height: '16px' }} />}
                          </Box>
                          <Typography sx={styles.sortDropdownText}>
                            {sortMethod === 'recommended' ? 'Recommended' : sortMethod.charAt(0).toUpperCase() + sortMethod.slice(1)}
                          </Typography>
                        </Box>
                      </Box>

                      <AnimatePresence>
                        {sortDropdownOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <Box sx={styles.sortDropdownOptions}>
                              {(['recommended', 'power', 'health', 'seconds held'] as SortMethod[]).map((method) => (
                                <Box
                                  key={method}
                                  sx={[styles.sortDropdownOption, sortMethod === method && styles.sortDropdownOptionActive]}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSortMethod(method);
                                    setSortDropdownOpen(false);
                                  }}
                                >
                                  <Box sx={styles.sortOptionIcon}>
                                    {method === 'recommended' && <TipsAndUpdatesIcon sx={{ fontSize: '12px', color: gameColors.gameYellow }} />}
                                    {method === 'power' && <FlashOnIcon sx={{ fontSize: '12px', color: gameColors.yellow }} />}
                                    {method === 'health' && <FavoriteIcon sx={{ fontSize: '12px', color: gameColors.red }} />}
                                    {method === 'seconds held' && <img src="/images/survivor_token.png" alt="seconds held" style={{ width: '16px', height: '16px' }} />}
                                  </Box>
                                  <Typography sx={styles.sortDropdownOptionText}>
                                    {method === 'recommended' ? 'Recommended' : method.charAt(0).toUpperCase() + method.slice(1)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Box>

                    {/* Type Section */}
                    {/* <Box mb={0.5}>
                      <Typography sx={styles.filterHeadline}>BEAST TYPE</Typography>
                      <Box sx={styles.filterButtons}>
                        {(['all', 'strong'] as BeastTypeFilter[]).map((type) => (
                          <Box
                            key={type}
                            sx={[styles.filterButton, typeFilter === type && styles.filterButtonActive]}
                            onClick={() => setTypeFilter(type)}
                          >
                            <Typography sx={styles.filterButtonText}>
                              {type === 'all' ? 'All' : 'Strong'}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box> */}

                    {/* Filters Section */}
                    <Box>
                      <Typography sx={styles.filterHeadline}>FILTER</Typography>
                      <Box sx={styles.compactToggles}>
                        <Box
                          sx={[styles.compactToggle, hideDeadBeasts && styles.compactToggleActive]}
                          onClick={() => hideDead(!hideDeadBeasts)}
                        >
                          <Typography sx={styles.compactToggleText}>Hide Dead</Typography>
                        </Box>
                        <Box
                          sx={[styles.compactToggle, nameMatchFilter && styles.compactToggleActive]}
                          onClick={() => setNameMatchFilter(!nameMatchFilter)}
                        >
                          <Typography sx={styles.compactToggleText}>Name Match</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Quest Filter Section */}
                    <Box>
                      <Typography sx={styles.filterHeadline}>QUESTS</Typography>
                      <Box sx={styles.questFilterIcons}>
                        {([
                          { key: 'firstBlood' as QuestFilterKey, icon: <Box component="img" src={swordIcon} sx={{ width: 16, height: 16 }} /> },
                          { key: 'consistencyIsKey' as QuestFilterKey, icon: <LocalFireDepartmentIcon sx={{ fontSize: '18px', color: '#ff5722' }} /> },
                          { key: 'summitConqueror' as QuestFilterKey, icon: <MilitaryTechIcon sx={{ fontSize: '18px', color: '#ffd54f' }} /> },
                          { key: 'ironGrip' as QuestFilterKey, icon: <Box component="img" src={bruteIcon} sx={{ width: 16, height: 16, filter: 'invert(60%) sepia(80%) saturate(500%) hue-rotate(5deg) brightness(1.1)' }} /> },
                          { key: 'secondWind' as QuestFilterKey, icon: <Box component="img" src={revivePotionIcon} sx={{ width: 16, height: 16 }} /> },
                        ]).map(({ key, icon }) => (
                          <Box
                            key={key}
                            sx={[styles.questFilterIcon, questFilter[key] && styles.questFilterIconActive]}
                            onClick={() => toggleQuestFilter(key)}
                          >
                            {icon}
                            {questFilter[key] && (
                              <CloseIcon sx={styles.questFilterX} />
                            )}
                          </Box>
                        ))}
                      </Box>
                      <Box sx={{ ...styles.questFilterIcons, mt: '3px' }}>
                        {([
                          { key: 'vitalBoost' as QuestFilterKey, icon: <Box component="img" src={attackPotionIcon} sx={{ width: 16, height: 16 }} /> },
                          { key: 'levelUp1' as QuestFilterKey, icon: <TrendingUpIcon sx={{ fontSize: '18px', color: '#4fc3f7' }} /> },
                          { key: 'levelUp3' as QuestFilterKey, icon: <KeyboardDoubleArrowUpIcon sx={{ fontSize: '18px', color: '#7c4dff' }} /> },
                          { key: 'levelUp5' as QuestFilterKey, icon: <BoltIcon sx={{ fontSize: '18px', color: '#ffab00' }} /> },
                          { key: 'levelUp10' as QuestFilterKey, icon: <DiamondIcon sx={{ fontSize: '18px', color: '#e040fb' }} /> },
                        ]).map(({ key, icon }) => (
                          <Box
                            key={key}
                            sx={[styles.questFilterIcon, questFilter[key] && styles.questFilterIconActive]}
                            onClick={() => toggleQuestFilter(key)}
                          >
                            {icon}
                            {questFilter[key] && (
                              <CloseIcon sx={styles.questFilterX} />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* Beast Grid - Virtualized horizontal scrolling */}
          {collectionWithCombat.length > 0 && (
            <Box
              id="beast-collection-container"
              ref={parentRef}
              sx={{
                ...styles.beastGrid,
                height: selectedBeasts.length > 0 ? '230px' : styles.beastGrid.height,
                transition: 'height 0.35s cubic-bezier(0.4, 0.0, 0.2, 1)', // Added smooth transition
                contain: 'strict',
                overflowX: 'auto',
                overflowY: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${virtualizer.getTotalSize()}px`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const beast = collectionWithCombat[virtualItem.index];
                  const isSelected = selectedBeasts.some(b => b[0].token_id === beast.token_id);
                  const isSavage = summit?.beast.token_id === beast.token_id;
                  const isDead = beast.current_health === 0;
                  const isLocked = isBeastLocked(beast);
                  const selectionIndex = selectedBeasts.findIndex(b => b[0].token_id === beast.token_id) + 1;
                  const combat = summit && !isSavage ? beast.combat : null;
                  const isFirstBeast = virtualItem.index === 0;

                  return (
                    <div
                      key={beast.token_id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${ITEM_WIDTH}px`,
                        transform: `translateX(${virtualItem.start}px)`,
                      }}
                    >
                      <Box
                        id={isFirstBeast ? 'beast-card-first' : undefined}
                        sx={styles.cardWithSettings}
                      >
                        <BeastCard
                          beast={beast}
                          isSelected={isSelected}
                          isSavage={isSavage}
                          isDead={isDead}
                          isLocked={isLocked}
                          combat={combat ?? null}
                          selectionIndex={selectionIndex}
                          summitHealth={summit?.beast.current_health || 0}
                          attackMode={attackMode}
                          onClick={() => selectBeast(beast, isFirstBeast)}
                          onMouseEnter={(e) => handleHoverEnter(e, beast)}
                          onMouseLeave={handleHoverLeave}
                        />

                        {isSelected && (
                          <Box
                            sx={styles.cardQuickRow}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Tooltip placement="top" title={<Box sx={styles.tooltipContent}>Click to edit</Box>}>
                              <Box
                                sx={styles.quickPills}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Box sx={styles.quickPill} onClick={(e) => openAttackSettings(e, beast.token_id)}>
                                  <img src="/images/sword.png" alt="" style={styles.quickPillIcon} />
                                  <Typography sx={styles.quickPillText}>{selectedBeasts.find(selection => selection[0].token_id === beast.token_id)?.[1]}</Typography>
                                </Box>
                                <Box
                                  id={isFirstBeast && isSelected ? 'beast-card-potion-pill' : undefined}
                                  sx={styles.quickPill}
                                  onClick={(e) => {
                                    openPotionSettings(e, beast.token_id);
                                    if (isFirstBeast) {
                                      notifyTargetClicked('beast-card-potion-pill');
                                    }
                                  }}
                                >
                                  <img src={attackPotionIcon} alt="" style={styles.quickPillIcon} />
                                  <Typography sx={styles.quickPillText}>{selectedBeasts.find(selection => selection[0].token_id === beast.token_id)?.[2]}</Typography>
                                </Box>
                              </Box>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </div>
                  );
                })}
              </div>
            </Box>
          )}

          {/* No beasts found after filtering */}
          {collectionWithCombat.length === 0 && address && collection.length > 0 && (
            <Box sx={styles.noFilterResults}>
              <Typography sx={styles.noFilterResultsText}>
                No beasts available
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Beast Profile Popover - only show if anchor still exists */}
      {anchorEl && document.body.contains(anchorEl) && (
        <Popover
          open={Boolean(anchorEl && hoveredBeast)}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          disableRestoreFocus
          onClose={handleHoverLeave}
          sx={{
            pointerEvents: 'none',
            '& .MuiPopover-paper': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              mt: -2,
            }
          }}
        >
          {hoveredBeast && <BeastProfile beast={hoveredBeast} />}
        </Popover>
      )}

      {/* Attacks popover */}
      {attackSettingsAnchorEl && attackSettingsBeastId && (
        <Popover
          open={Boolean(attackSettingsAnchorEl)}
          anchorEl={attackSettingsAnchorEl}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          onClose={closeAttackSettings}
          disableRestoreFocus
          sx={[styles.popoverSx, { width: '230px' }]}
        >
          <Box sx={styles.settingsPopover}>
            <Box sx={styles.settingsPopoverBody}>
              {(() => {
                const rawAttacks = selectedBeasts.find(selection => selection[0].token_id === attackSettingsBeastId)?.[1];
                const currentAttacks = clampAttacks(Number(rawAttacks) || 1);
                return (
                  <Box sx={styles.popRow}>
                    <Typography sx={styles.popLabel}>Number of attacks</Typography>
                    <Box sx={styles.popStepperRow}>
                      <IconButton
                        size="small"
                        disabled={currentAttacks <= 1}
                        onClick={() => setBeastAttacks(attackSettingsBeastId, currentAttacks - 1)}
                        sx={styles.popStepperButton}
                      >
                        <RemoveIcon sx={styles.popStepperIcon} />
                      </IconButton>
                      <TextField
                        size="small"
                        type="number"
                        value={currentAttacks}
                        onChange={(e) => {
                          const next = clampAttacks(parseInt(e.target.value, 10) || 1);
                          setBeastAttacks(attackSettingsBeastId, next);
                        }}
                        inputProps={{ min: 1, max: MAX_ATTACKS_PER_BEAST, step: 1 }}
                        sx={[styles.popInput, styles.popStepperInput]}
                      />
                      <IconButton
                        size="small"
                        disabled={currentAttacks >= MAX_ATTACKS_PER_BEAST}
                        onClick={() => setBeastAttacks(attackSettingsBeastId, currentAttacks + 1)}
                        sx={styles.popStepperButton}
                      >
                        <AddIcon sx={styles.popStepperIcon} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          </Box>
        </Popover>
      )}

      {/* Attack potions popover */}
      {potionSettingsAnchorEl && attackSettingsBeastId && (
        <Popover
          open={Boolean(potionSettingsAnchorEl)}
          anchorEl={potionSettingsAnchorEl}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          onClose={closePotionSettings}
          disableRestoreFocus
          sx={[styles.popoverSx, { width: '250px' }]}
        >
          <Box sx={styles.settingsPopover}>
            <Box sx={styles.settingsPopoverBody}>
              {(() => {
                const currentPotions = selectedBeasts.find(selection => selection[0].token_id === attackSettingsBeastId)?.[2] || 0;
                const maxAvailable = Math.min(tokenBalances["ATTACK"] || 0, 255);
                return (
                  <Box sx={styles.popRow}>
                    <Typography sx={styles.popLabel}>Apply attack potions</Typography>
                    <Box sx={styles.popToggleGroup}>
                      {([
                        { key: 'none' as const, label: 'None' },
                        { key: 'optimal' as const, label: 'Optimal' },
                        { key: 'max' as const, label: 'Max' },
                      ] as const).map((opt) => {
                        return (
                          <Box
                            key={opt.key}
                            sx={[styles.popToggle, styles.popToggleActive]}
                            onClick={() => {
                              if (opt.key === 'none') {
                                setSelectedBeasts((prev) => prev.map(selection => selection[0].token_id === attackSettingsBeastId ? [selection[0], selection[1], 0] : selection));
                              } else if (opt.key === 'optimal') {
                                const selected = selectedBeasts.find(selection => selection[0].token_id === attackSettingsBeastId);
                                if (!selected || !summit) return;
                                const optimalPotions = calculateOptimalAttackPotions(selected, summit, maxAvailable);
                                setSelectedBeasts((prev) => prev.map(selection => selection[0].token_id === attackSettingsBeastId ? [selection[0], selection[1], optimalPotions] : selection));
                              } else if (opt.key === 'max') {
                                const selected = selectedBeasts.find(selection => selection[0].token_id === attackSettingsBeastId);
                                if (!selected || !summit) return;
                                const maxPotions = calculateMaxAttackPotions(selected, summit, maxAvailable);
                                setSelectedBeasts((prev) => prev.map(selection => selection[0].token_id === attackSettingsBeastId ? [selection[0], selection[1], maxPotions] : selection));
                              }
                            }}
                          >
                            <Typography sx={styles.popToggleText}>{opt.label}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                    <Box sx={styles.popCustomRow}>
                      <Typography sx={styles.popCustomLabel}>Custom:</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={currentPotions}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(maxAvailable, parseInt(e.target.value, 10) || 0));
                          setSelectedBeasts((prev) => prev.map(selection => selection[0].token_id === attackSettingsBeastId ? [selection[0], selection[1], value] : selection));
                        }}
                        inputProps={{ min: 0, max: maxAvailable, step: 1 }}
                        sx={styles.popCustomInput}
                      />
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          </Box>
        </Popover>
      )}

      {/* Bulk attack count popover */}
      <Popover
        open={Boolean(bulkAttackAnchorEl)}
        anchorEl={bulkAttackAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => setBulkAttackAnchorEl(null)}
        disableRestoreFocus
        sx={[styles.popoverSx, { width: '230px' }]}
      >
        <Box sx={styles.settingsPopover}>
          <Box sx={styles.settingsPopoverBody}>
            {(() => {
              const first = selectedBeasts[0];
              const currentAttacks = first ? clampAttacks(first[1]) : 1;
              return (
                <Box sx={styles.popRow}>
                  <Typography sx={styles.popLabel}>Attacks for all ({selectedBeasts.length})</Typography>
                  <Box sx={styles.popStepperRow}>
                    <IconButton
                      size="small"
                      disabled={currentAttacks <= 1}
                      onClick={() => setBulkAttacks(currentAttacks - 1)}
                      sx={styles.popStepperButton}
                    >
                      <RemoveIcon sx={styles.popStepperIcon} />
                    </IconButton>
                    <TextField
                      size="small"
                      type="number"
                      value={currentAttacks}
                      onChange={(e) => setBulkAttacks(parseInt(e.target.value, 10) || 1)}
                      inputProps={{ min: 1, max: MAX_ATTACKS_PER_BEAST, step: 1 }}
                      sx={[styles.popInput, styles.popStepperInput]}
                    />
                    <IconButton
                      size="small"
                      disabled={currentAttacks >= MAX_ATTACKS_PER_BEAST}
                      onClick={() => setBulkAttacks(currentAttacks + 1)}
                      sx={styles.popStepperButton}
                    >
                      <AddIcon sx={styles.popStepperIcon} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </Box>
      </Popover>

      {/* Bulk potion popover */}
      <Popover
        open={Boolean(bulkPotionAnchorEl)}
        anchorEl={bulkPotionAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => setBulkPotionAnchorEl(null)}
        disableRestoreFocus
        sx={[styles.popoverSx, { width: '250px' }]}
      >
        <Box sx={styles.settingsPopover}>
          <Box sx={styles.settingsPopoverBody}>
            <Box sx={styles.popRow}>
              <Typography sx={styles.popLabel}>Potions for all ({selectedBeasts.length})</Typography>
              <Box sx={styles.popToggleGroup}>
                {([
                  { key: 'none' as const, label: 'None' },
                  { key: 'optimal' as const, label: 'Optimal' },
                  { key: 'max' as const, label: 'Max' },
                ] as const).map((opt) => (
                  <Box
                    key={opt.key}
                    sx={[styles.popToggle, styles.popToggleActive]}
                    onClick={() => setBulkPotions(opt.key)}
                  >
                    <Typography sx={styles.popToggleText}>{opt.label}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={styles.popCustomRow}>
                <Typography sx={styles.popCustomLabel}>Custom:</Typography>
                <TextField
                  size="small"
                  type="number"
                  defaultValue={0}
                  onChange={(e) => setBulkPotions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  inputProps={{ min: 0, max: 255, step: 1 }}
                  sx={styles.popCustomInput}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}

export default BeastCollection;

const styles = {
  container: {
    width: '100%',
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: 2,
    pt: 0.5,
    pb: 0,
    overflowY: 'hidden',
    boxSizing: 'border-box',
    position: 'relative',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '208px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  emptyStateContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  emptyStateTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  emptyStateSubtitle: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
  },
  // Connect wallet state styles
  connectWalletContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobile ? 2 : 4,
    position: 'relative',
    zIndex: 1,
  },
  connectTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  beastShowcase: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    height: '150px',
    position: 'relative',
  },
  showcaseBeast: {
    position: 'relative',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))',
    transition: 'all 0.4s ease',
  },
  showcaseBeastLeft: {
    zIndex: 1,
  },
  showcaseImage: {
    height: '160px',
    width: 'auto',
  },
  // No beasts found state styles
  noBeastsContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    zIndex: 1,
  },
  noBeastsTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  noBeastsOptions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0.5,
    marginTop: 1,
  },
  noBeastsOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  noBeastsOptionsDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    width: '100%',
    marginTop: 1,
    marginBottom: 1,
  },
  emptyStateDividerLine: {
    flex: 1,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${gameColors.accentGreen}60, transparent)`,
  },
  emptyStateDividerText: {
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: gameColors.accentGreen,
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.6)`,
  },
  singleBeastShowcase: {
    position: 'relative',
    height: '210px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sadBeastImage: {
    height: '160px',
    width: 'auto',
    opacity: 1,
  },
  tearDrop: {
    position: 'absolute',
    top: '30px',
    right: '45%',
    fontSize: '16px',
    animation: 'tearfall 2s ease-in-out infinite',
    '@keyframes tearfall': {
      '0%': {
        transform: 'translateY(0)',
        opacity: 0,
      },
      '20%': {
        opacity: 1,
      },
      '100%': {
        transform: 'translateY(40px)',
        opacity: 0,
      },
    },
  },
  // Loading state styles
  loadingBeastContainer: {
    position: 'relative',
    height: '150px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGlow: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    background: `radial-gradient(circle, ${gameColors.brightGreen}30 0%, transparent 60%)`,
    animation: 'pulseGlow 2s ease-in-out infinite',
    '@keyframes pulseGlow': {
      '0%, 100%': {
        opacity: 0.3,
        transform: 'scale(0.8)',
      },
      '50%': {
        opacity: 0.8,
        transform: 'scale(1.2)',
      },
    },
  },
  loadingStateContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobile ? 2 : 4,
    position: 'relative',
    zIndex: 1,
  },
  loadingTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
  },
  loadingBeastImage: {
    height: '180px',
    width: 'auto',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))',
    animation: 'rotate 20s linear infinite',
    '@keyframes rotate': {
      '0%': {
        transform: 'rotate(0deg)',
      },
      '100%': {
        transform: 'rotate(360deg)',
      },
    },
  },
  loadingDots: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginTop: '8px',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: gameColors.brightGreen,
    animation: 'bounce 1.4s ease-in-out infinite',
    '@keyframes bounce': {
      '0%, 60%, 100%': {
        transform: 'translateY(0)',
        opacity: 0.3,
      },
      '30%': {
        transform: 'translateY(-10px)',
        opacity: 1,
      },
    },
  },
  loadingDotDelay1: {
    animationDelay: '0.2s',
  },
  loadingDotDelay2: {
    animationDelay: '0.4s',
  },
  // Steps styles
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxWidth: '300px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    flexShrink: 0,
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3)`,
  },
  stepText: {
    fontSize: '13px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textAlign: 'left',
  },
  loadingText: {
    fontSize: '13px',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
    mb: 1,
    fontStyle: 'italic',
  },
  beastGridContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
  },
  leftSideContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    flexShrink: 0,
  },
  beastGrid: {
    height: '200px',
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
    overflowX: 'scroll',
    overflowY: 'hidden',
    flex: 1,
    px: '4px',
  },
  utilityButton: {
    width: '32px',
    height: '32px',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}40`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    },
  },
  selectedItem: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}80,
      0 2px 6px rgba(127, 255, 0, 0.3),
      0 0 0 1px ${gameColors.brightGreen}
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen}20 0%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        inset 0 1px 0 ${gameColors.brightGreen},
        0 4px 10px rgba(127, 255, 0, 0.4),
        0 0 0 1px ${gameColors.brightGreen}
      `,
    }
  },
  utilityButtonsContainer: {
    display: 'flex',
    gap: '6px',
    flexDirection: 'column',
    flexShrink: 0,
    marginTop: '6px',
  },
  tooltipContent: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    padding: '6px 10px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}60`,
    color: gameColors.brightGreen,
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
  },
  filterPanel: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    ml: 0.5,
    mt: '6px',
    gap: '3px',
    borderRadius: '4px',
    border: `2px solid ${gameColors.accentGreen}60`,
    width: '150px',
    height: '195px',
    boxSizing: 'border-box',
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    backdropFilter: 'blur(12px)',
  },
  filterHeadline: {
    fontSize: '10px',
    lineHeight: '18px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
  filterButtons: {
    display: 'flex',
    gap: '3px',
  },
  filterButton: {
    flex: 1,
    padding: '4px 6px',
    borderRadius: '3px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}60`,
    },
  },
  filterButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}40,
      0 2px 4px rgba(127, 255, 0, 0.3)
    `,
  },
  filterButtonText: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  compactToggles: {
    display: 'flex',
    gap: '3px',
  },
  compactToggle: {
    flex: 1,
    padding: '4px 6px',
    borderRadius: '3px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}60`,
    },
  },
  compactToggleActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}40,
      0 2px 4px rgba(127, 255, 0, 0.3)
    `,
  },
  compactToggleText: {
    fontSize: '9px',
    lineHeight: '11px',
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  questFilterIcons: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  questFilterIcon: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    color: '#888',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}60`,
      color: '#FFF',
    },
  },
  questFilterIconActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}40,
      0 2px 4px rgba(127, 255, 0, 0.3)
    `,
    color: '#FFF',
  },
  questFilterX: {
    position: 'absolute',
    fontSize: '14px',
    color: '#FF4444',
    filter: 'drop-shadow(0 0 2px #000)',
    pointerEvents: 'none',
  },
  filterDivider: {
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${gameColors.accentGreen}40, transparent)`,
    margin: '2px 0',
  },
  sortDropdown: {
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '3px',
    padding: '4px 6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.darkGreen}`,
      border: `1px solid ${gameColors.accentGreen}60`,
    },
  },
  sortDropdownCurrent: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  sortDropdownText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'capitalize',
    letterSpacing: '0.3px',
    flex: 1,
  },
  sortDropdownOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '3px',
  },
  sortDropdownOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 6px',
    borderRadius: '3px',
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}30`,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': {
      background: `${gameColors.darkGreen}80`,
      border: `1px solid ${gameColors.accentGreen}50`,
    },
  },
  sortDropdownOptionActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
  },
  sortDropdownOptionText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'capitalize',
    letterSpacing: '0.3px',
  },
  sortOptionIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: gameColors.brightGreen,
  },
  noFilterResults: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '205px',
    flex: 1,
  },
  cardWithSettings: {
    width: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardQuickRow: {
    mt: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  quickPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    flex: 1,
    '&:hover': {
      filter: 'brightness(1.08)',
    }
  },
  quickPill: {
    height: '22px',
    flex: 1,
    borderRadius: '10px',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}60 0%, ${gameColors.darkGreen}80 100%)`,
    border: `1px solid ${gameColors.accentGreen}60`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  quickPillIcon: {
    width: '14px',
    height: '14px',
    objectFit: 'contain' as const,
  },
  quickPillText: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#ffedbb',
    letterSpacing: '0.2px',
  },
  quickEditButton: {
    width: '24px',
    height: '22px',
    borderRadius: '6px',
    border: `1px solid ${gameColors.brightGreen}50`,
    background: `linear-gradient(135deg, ${gameColors.lightGreen}40 0%, ${gameColors.mediumGreen}60 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#FFF',
    boxShadow: `0 0 10px rgba(127, 255, 0, 0.18)`,
    '&:hover': {
      border: `1px solid ${gameColors.brightGreen}80`,
      boxShadow: `0 0 14px rgba(127, 255, 0, 0.28)`,
    }
  },
  popoverSx: {
    zIndex: 10000,
    '& .MuiPopover-paper': {
      background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.mediumGreen} 100%)`,
      border: `1px solid ${gameColors.accentGreen}60`,
      borderRadius: '10px',
      overflow: 'hidden',
      mb: 1,
    }
  },
  settingsPopover: {
    width: '200px',
  },
  settingsPopoverHeader: {
    px: 1.25,
    py: 1,
    borderBottom: `1px solid ${gameColors.accentGreen}30`,
    background: `${gameColors.darkGreen}80`,
  },
  settingsPopoverTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: '#ffedbb',
  },
  settingsPopoverSubTitle: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: gameColors.accentGreen,
    opacity: 0.95,
    mt: '2px',
  },
  settingsPopoverBody: {
    px: 1.25,
    py: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  popRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  popLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: gameColors.accentGreen,
  },
  popInput: {
    '& .MuiOutlinedInput-root': {
      background: `${gameColors.darkGreen}B0`,
      borderRadius: '8px',
      '& fieldset': {
        borderColor: `${gameColors.accentGreen}35`,
      },
      '&:hover fieldset': {
        borderColor: `${gameColors.accentGreen}70`,
      },
      '&.Mui-focused fieldset': {
        borderColor: `${gameColors.brightGreen}80`,
      },
    },
    '& input': {
      color: '#FFF',
      fontSize: '14px',
      fontWeight: 800,
      padding: '6px 8px',
    },
  },
  popStepperRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  popStepperButton: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: `1px solid ${gameColors.accentGreen}35`,
    background: `${gameColors.darkGreen}B0`,
    color: '#FFF',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}70`,
      background: `${gameColors.darkGreen}CC`,
    },
    '&.Mui-disabled': {
      opacity: 0.45,
    },
  },
  popStepperIcon: {
    fontSize: '18px',
  },
  popStepperInput: {
    width: '90px',
    '& input': {
      textAlign: 'center',
      MozAppearance: 'textfield',
    },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
  },
  popToggleGroup: {
    display: 'flex',
    gap: '4px',
    width: '100%',
  },
  popToggle: {
    flex: 1,
    height: '28px',
    borderRadius: '8px',
    px: 1,
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}70`,
    },
  },
  popToggleActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}70`,
    boxShadow: `0 0 10px rgba(127, 255, 0, 0.25)`,
  },
  popToggleText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    lineHeight: '10px',
  },
  popCustomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  popCustomLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  popCustomInput: {
    flex: 1,
    '& .MuiOutlinedInput-root': {
      background: `${gameColors.darkGreen}B0`,
      borderRadius: '6px',
      '& fieldset': {
        borderColor: `${gameColors.accentGreen}35`,
      },
      '&:hover fieldset': {
        borderColor: `${gameColors.accentGreen}70`,
      },
      '&.Mui-focused fieldset': {
        borderColor: `${gameColors.brightGreen}80`,
      },
    },
    '& input': {
      color: '#FFF',
      fontSize: '12px',
      fontWeight: 800,
      padding: '4px 8px',
      textAlign: 'center',
      MozAppearance: 'textfield',
    },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
  },
  noFilterResultsText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.6)`,
  },
}

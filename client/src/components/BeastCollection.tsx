import { useGameStore, SortMethod, BeastTypeFilter } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FilterListIcon from '@mui/icons-material/FilterList';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { Box, Link, Popover, Tooltip, Typography } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useVirtualizer } from '@tanstack/react-virtual';
import { calculateBattleResult } from "../utils/beasts";
import { gameColors } from '../utils/themes';
import BeastCard from './BeastCard';
import BeastProfile from './BeastProfile';

function BeastCollection() {
  const {
    loadingCollection, collection, selectedBeasts, setSelectedBeasts,
    attackInProgress, summit, appliedPotions, attackMode,
    hideDeadBeasts, setHideDeadBeasts,
    sortMethod, setSortMethod,
    typeFilter, setTypeFilter,
    nameMatchFilter, setNameMatchFilter
  } = useGameStore()
  const { address } = useAccount()
  const [hoveredBeast, setHoveredBeast] = useState<Beast | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  // Helper function to check if attacker is strong against defender
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
      let filtered = collection.map((beast: Beast) => ({
        ...beast,
        combat: calculateBattleResult(beast, summit.beast, appliedPotions?.attack || 0)
      }));

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
        filtered = filtered.filter(beast => beast.current_health > 0);
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
          if (a.combat?.score !== b.combat?.score) {
            return b.combat?.score - a.combat?.score
          } else if (b.combat?.attack !== a.combat?.attack) {
            return b.combat?.attack - a.combat?.attack
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
        }
        return 0
      })
    }

    return collection.sort((a, b) => b.power - a.power)
  }, [collection, summit, appliedPotions?.attack, sortMethod, typeFilter, nameMatchFilter, hideDeadBeasts]);

  const selectBeast = useCallback((beast: Beast) => {
    if (attackInProgress || attackMode === 'capture') return;

    if (selectedBeasts.find(prevBeast => prevBeast.token_id === beast.token_id)) {
      setSelectedBeasts((prev: Beast[]) => prev.filter(prevBeast => prevBeast.token_id !== beast.token_id));
    } else {
      setSelectedBeasts((prev: Beast[]) => [...prev, beast]);
    }
  }, [attackInProgress, attackMode, selectedBeasts]);

  const selectAllBeasts = () => {
    if (attackInProgress) return;

    const allBeasts = collectionWithCombat;
    const maxBeasts = Math.min(50, allBeasts.length);

    // If 50 or more beasts are selected, or all alive beasts are selected, deselect all
    if (selectedBeasts.length >= maxBeasts) {
      setSelectedBeasts([])
    } else {
      // Select up to 50 beasts (or all if less than 50)
      setSelectedBeasts(allBeasts.slice(0, maxBeasts))
    }
  }

  const hideDead = (hide) => {
    if (attackInProgress) return;

    setHideDeadBeasts(hide)
  }

  // Helper to check if max beasts are selected (50 or all if less than 50)
  const maxBeastsSelected = useMemo(() => {
    const allBeasts = collectionWithCombat;
    const maxBeasts = Math.min(50, allBeasts.length);
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
              <Typography sx={styles.emptyStateTitle} mb={2}>
                NO BEASTS FOUND
              </Typography>
              <Typography sx={styles.emptyStateSubtitle} mb={'2px'}>
                COLLECT BEASTS BY PLAYING
              </Typography>
              <Link sx={[styles.emptyStateSubtitle, { textDecoration: 'underline !important' }]} href="https://lootsurvivor.io" target="_blank">
                LOOT SURVIVOR 2
              </Link>
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
      {!loadingCollection && (
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

              <Tooltip placement='bottom' title={<Box sx={styles.tooltipContent}>Select 50</Box>}>
                <Box sx={[styles.utilityButton, maxBeastsSelected && styles.selectedItem]} onClick={() => selectAllBeasts()}>
                  <LibraryAddCheckIcon sx={{ color: gameColors.brightGreen, fontSize: '20px' }} />
                </Box>
              </Tooltip>
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
                              {(['recommended', 'power', 'health'] as SortMethod[]).map((method) => (
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

                    {/* Divider */}
                    <Box sx={styles.filterDivider} />

                    {/* Type Section */}
                    <Box mb={0.5}>
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
                    </Box>

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
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* Beast Grid - Virtualized horizontal scrolling */}
          {collectionWithCombat.length > 0 && (
            <Box
              ref={parentRef}
              sx={{
                ...styles.beastGrid,
                contain: 'strict',
                overflow: 'auto',
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
                  const isSelected = selectedBeasts.some(b => b.token_id === beast.token_id);
                  const isSavage = summit?.beast.token_id === beast.token_id;
                  const isDead = beast.current_health === 0;
                  const selectionIndex = selectedBeasts.findIndex(b => b.token_id === beast.token_id) + 1;
                  const combat = summit && !isSavage ? beast.combat : null;

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
                      <BeastCard
                        beast={beast}
                        isSelected={isSelected}
                        isSavage={isSavage}
                        isDead={isDead}
                        combat={combat}
                        selectionIndex={selectionIndex}
                        summitHealth={summit?.beast.current_health || 0}
                        onClick={() => selectBeast(beast)}
                        onMouseEnter={(e) => handleHoverEnter(e, beast)}
                        onMouseLeave={handleHoverLeave}
                      />
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
    gap: 2,
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
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.6)`,
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
    height: '205px',
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
    height: '180px',
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
  noFilterResultsText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.6)`,
  },
}
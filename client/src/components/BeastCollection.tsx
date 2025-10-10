import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Link, Popover, Tooltip, Typography } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import { useEffect, useMemo, useState } from 'react';
import { calculateBattleResult, fetchBeastImage } from "../utils/beasts";
import { gameColors } from '../utils/themes';
import BeastProfile from './BeastProfile';
import { isMobile } from 'react-device-detect';

function BeastCollection() {
  const { loadingCollection, collection, selectedBeasts, setSelectedBeasts, attackInProgress, summit, appliedPotions, setTotalDamage } = useGameStore()
  const { address } = useAccount()
  const [hideDeadBeasts, setHideDeadBeasts] = useState(true)
  const [hoveredBeast, setHoveredBeast] = useState<Beast | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const collectionWithCombat = useMemo(() => {
    if (summit && collection.length > 0) {
      return collection.map((beast: Beast) => ({
        ...beast,
        combat: calculateBattleResult(beast, summit.beast, appliedPotions?.attack || 0)
      })).sort((a: Beast, b: Beast) => {
        if (a.token_id === summit.beast.token_id) {
          return -1
        } else if (b.token_id === summit.beast.token_id) {
          return 1
        } else if (a.combat?.elemental !== b.combat?.elemental) {
          return b.combat?.elemental - a.combat?.elemental
        } else if (b.power !== a.power) {
          return b.power - a.power
        } else {
          return (b.health + b.bonus_health) - (a.health + a.bonus_health)
        }
      })
    }

    return collection
  }, [collection, summit, appliedPotions?.attack]);

  useEffect(() => {
    const total = selectedBeasts.reduce((acc, beast) => {
      const combatBeast = collectionWithCombat.find(cb => cb.token_id === beast.token_id);
      return acc + (combatBeast?.combat?.damage || 0);
    }, 0);

    setTotalDamage(total);
  }, [selectedBeasts, collectionWithCombat]);

  const selectBeast = (beast: Beast) => {
    if (attackInProgress) return;

    if (selectedBeasts.find(prevBeast => prevBeast.token_id === beast.token_id)) {
      setSelectedBeasts(selectedBeasts.filter(prevBeast => prevBeast.token_id !== beast.token_id))
    } else {
      setSelectedBeasts([...selectedBeasts, beast])
    }
  }

  const selectAllBeasts = () => {
    if (attackInProgress) return;

    const allBeasts = collectionWithCombat.filter(x => hideDeadBeasts ? x.current_health > 0 : true);
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
    const allBeasts = collectionWithCombat.filter(x => hideDeadBeasts ? x.current_health > 0 : true);
    const maxBeasts = Math.min(50, allBeasts.length);
    return allBeasts.length > 0 && selectedBeasts.length >= maxBeasts;
  }, [collectionWithCombat, selectedBeasts, hideDeadBeasts]);

  const handleHoverEnter = (event: React.MouseEvent<HTMLElement>, beast: Beast) => {
    setAnchorEl(event.currentTarget);
    setHoveredBeast(beast);
  };

  const handleHoverLeave = () => {
    setAnchorEl(null);
    setHoveredBeast(null);
  };

  const RenderBeastCard = (beast: Beast) => {
    const isSelected = selectedBeasts.find(prevBeast => prevBeast.token_id === beast.token_id)
    const isSavage = summit?.beast.token_id === beast.token_id
    const isDead = beast.current_health === 0

    // Use pre-calculated combat result
    const battleResult = summit && !isSavage ? beast.combat : null

    if (hideDeadBeasts && isDead) return null;

    return (
      <Box
        key={beast.token_id}
        sx={[
          styles.beastCard,
          isSelected && styles.selectedCard,
          isDead && styles.deadCard
        ]}
        onClick={() => selectBeast(beast)}
        onMouseEnter={(e) => handleHoverEnter(e, beast)}
        onMouseLeave={handleHoverLeave}
      >
        {/* Glow effect for selected cards */}
        {isSelected && (
          <Box sx={styles.glowEffect} />
        )}

        {/* Beast Image */}
        <Box sx={styles.imageContainer}>
          <img
            src={fetchBeastImage(beast)}
            alt={beast.name}
            style={{ ...styles.beastImage }}
          />
        </Box>

        {/* Beast Name */}
        <Typography sx={styles.beastName}>
          {beast.name}
        </Typography>

        {/* Stats Row */}
        <Box sx={styles.statsRow}>
          {/* Power */}
          <Box sx={styles.stat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.yellow}>
              <path d="M7 2v11h3v9l7-12h-4l4-8z" />
            </svg>
            <Typography sx={styles.statText}>
              {beast.power}
            </Typography>
          </Box>

          {/* Health */}
          <Box sx={styles.stat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.red}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <Typography sx={styles.statText}>
              {isSavage ? summit?.beast.current_health : beast.current_health}
            </Typography>
          </Box>
        </Box>

        {/* Combat Preview */}
        {battleResult && (
          <Box sx={[
            styles.combatPreview,
            battleResult.capture && styles.combatCapture,
          ]}>
            <Box sx={styles.combatContent}>
              <img src={'/images/sword.png'} alt='' height={'12px'} />
              <Typography sx={[
                styles.combatText,
                battleResult.capture ? styles.combatTextSuccess : styles.combatTextFailure
              ]}>
                {battleResult.capture
                  ? `${battleResult.healthLeft} HP LEFT`
                  : `${battleResult.damage} DMG`
                }
              </Typography>
            </Box>
          </Box>
        )}

        {/* Status indicators */}
        {isSavage && (
          <Box sx={styles.savageIndicator}>
            <Typography sx={styles.savageText}>
              SUMMIT
            </Typography>
          </Box>
        )}

        {/* Selection order number */}
        {isSelected && (
          <Box sx={styles.selectionIndicator}>
            <Typography sx={styles.selectionNumber}>
              {selectedBeasts.findIndex(prevBeast => prevBeast.token_id === beast.token_id) + 1}
            </Typography>
          </Box>
        )}
      </Box>
    )
  }

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
      {!loadingCollection && collectionWithCombat.length > 0 && (
        <Box sx={styles.beastGridContainer}>
          {/* Utility Buttons */}
          <Box sx={styles.utilityButtonsContainer}>
            <Tooltip placement='right' title={<Box sx={styles.tooltipContent}>Select 50</Box>}>
              <Box sx={[styles.utilityButton, maxBeastsSelected && styles.selectedItem]} onClick={() => selectAllBeasts()}>
                <LibraryAddCheckIcon sx={{ color: gameColors.brightGreen, fontSize: '20px' }} />
              </Box>
            </Tooltip>

            <Tooltip placement='right' title={<Box sx={styles.tooltipContent}>Hide dead</Box>}>
              <Box sx={[styles.utilityButton, hideDeadBeasts && styles.selectedItem]} onClick={() => hideDead(!hideDeadBeasts)}>
                <VisibilityOffIcon sx={{
                  color: gameColors.brightGreen,
                  fontSize: '20px',
                  opacity: hideDeadBeasts ? 1 : 0.6
                }} />
              </Box>
            </Tooltip>
          </Box>

          {/* Beast Grid */}
          <Box sx={styles.beastGrid}>
            {collectionWithCombat.filter(beast => !hideDeadBeasts || beast.current_health > 0).map((beast: Beast) => RenderBeastCard(beast))}
          </Box>
        </Box>
      )}

      {/* Beast Profile Popover */}
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
  beastGrid: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
    overflowX: 'scroll',
    flex: 1,
    px: '4px',
  },
  beastCard: {
    position: 'relative',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: '6px',
    padding: '6px',
    mt: '6px',
    mb: '4px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    width: '140px',
    minWidth: '140px',
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `
        inset 0 1px 0 ${gameColors.brightGreen}60,
        0 8px 16px rgba(127, 255, 0, 0.2),
        0 0 0 2px ${gameColors.accentGreen}
      `,
    },
  },
  selectedCard: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.brightGreen}80,
      0 4px 12px rgba(127, 255, 0, 0.4),
      0 0 0 2px ${gameColors.brightGreen}
    `,
    '&:hover': {
      boxShadow: `
        inset 0 1px 0 ${gameColors.brightGreen},
        0 8px 20px rgba(127, 255, 0, 0.5),
        0 0 0 2px ${gameColors.brightGreen}
      `,
    }
  },
  deadCard: {
    opacity: 0.5,
    filter: 'grayscale(100%)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `
        inset 0 1px 0 ${gameColors.darkGray}40,
        0 2px 4px rgba(0, 0, 0, 0.3),
        0 0 0 1px ${gameColors.darkGray}
      `,
    }
  },
  glowEffect: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `radial-gradient(circle, ${gameColors.brightGreen}20 0%, transparent 70%)`,
    animation: 'pulse 2s ease-in-out infinite',
    '@keyframes pulse': {
      '0%, 100%': {
        opacity: 0.5,
      },
      '50%': {
        opacity: 0.8,
      }
    }
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '110px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '4px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.black} 100%)`,
    boxShadow: `inset 0 1px 0 ${gameColors.darkGreen}, inset 0 -1px 0 ${gameColors.black}`,
  },
  beastImage: {
    maxWidth: '90%',
    maxHeight: '90%',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
  },
  typeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    pointerEvents: 'none',
  },
  beastName: {
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 1,
    marginBottom: '6px',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: '3px',
    padding: '3px 10px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}80`,
    backdropFilter: 'blur(4px)',
  },
  statText: {
    fontSize: '14px',
    color: '#FFF',
    fontWeight: 'bold',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  savageIndicator: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: gameColors.yellow,
    padding: '2px 6px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  savageText: {
    fontSize: '9px',
    color: gameColors.darkGreen,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '10px',
    left: '10px',
  },
  selectionNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#d0c98d',
    lineHeight: 1,
  },
  combatPreview: {
    padding: '2px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(4px)',
    border: `1px solid ${gameColors.red}60`,
    textAlign: 'center',
    marginTop: 'auto',
  },
  combatCapture: {
    border: `1px solid ${gameColors.brightGreen}60`,
  },
  combatContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    justifyContent: 'center',
  },
  combatText: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  combatTextSuccess: {
    color: gameColors.brightGreen,
  },
  combatTextFailure: {
    color: gameColors.red,
  },
  boostIndicator: {
    fontSize: '10px',
    color: gameColors.yellow,
    fontWeight: 'bold',
    marginLeft: '4px',
  },
  utilityButton: {
    position: 'relative',
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
}
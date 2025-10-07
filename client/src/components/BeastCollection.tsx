import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { Box, Typography, Popover, Tooltip } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import { useMemo, useState } from 'react';
import { fetchBeastImage, normaliseHealth, calculateBattleResult } from "../utils/beasts";
import { gameColors } from '../utils/themes';
import BeastProfile from './BeastProfile';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

function BeastCollection() {
  const { loadingCollection, setCollection, collection, selectedBeasts, setSelectedBeasts, attackInProgress, summit, appliedPotions } = useGameStore()
  const { address } = useAccount()
  const [hideDeadBeasts, setHideDeadBeasts] = useState(false)
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
        } else if (b.combat?.power !== a.combat?.power) {
          return b.combat?.power - a.combat?.power
        } else {
          return b.health - a.health
        }
      })
    }

    return collection
  }, [collection, summit, appliedPotions?.attack]);

  const selectBeast = (beast: Beast) => {
    if (selectedBeasts.find(prevBeast => prevBeast.token_id === beast.token_id)) {
      setSelectedBeasts(selectedBeasts.filter(prevBeast => prevBeast.token_id !== beast.token_id))
    } else {
      setSelectedBeasts([...selectedBeasts, beast])
    }
  }

  const selectAllBeasts = () => {
    const allBeasts = collectionWithCombat.filter(x => hideDeadBeasts ? x.current_health > 0 : true);

    // If all alive beasts are selected, deselect all
    if (selectedBeasts.length === allBeasts.length) {
      setSelectedBeasts([])
    } else {
      // Select all alive beasts
      setSelectedBeasts(allBeasts)
    }
  }

  const hideDead = (hide) => {
    setHideDeadBeasts(hide)
  }

  // Helper to check if all alive beasts are selected
  const allAliveBeastsSelected = useMemo(() => {
    const allBeasts = collection.filter(x => hideDeadBeasts ? x.current_health > 0 : true);
    return allBeasts.length > 0 && allBeasts.length === selectedBeasts.length;
  }, [collection, selectedBeasts, hideDeadBeasts]);

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
              {beast.current_health}
            </Typography>
          </Box>
        </Box>

        {/* Combat Preview */}
        {battleResult && (
          <Box sx={[
            styles.combatPreview,
            battleResult.capture && styles.combatCapture
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
          <Typography variant="h2">
            CONNECT YOUR WALLET
          </Typography>
          <Typography variant="h3">
            TO TAKE THE SUMMIT
          </Typography>
        </Box>
      )}

      {address && !loadingCollection && collection.length < 1 && (
        <Box sx={styles.emptyState}>
          <Typography variant="h2">
            NO BEASTS FOUND
          </Typography>
          <Typography variant="h3">
            COLLECT IN LOOT SURVIVOR
          </Typography>
        </Box>
      )}

      {loadingCollection && (
        <Box sx={styles.emptyState}>
          <Typography variant="h2">
            LOADING BEASTS...
          </Typography>
        </Box>
      )}

      {/* Beast Grid with Utility Buttons */}
      {collectionWithCombat.length > 0 && (
        <Box sx={styles.beastGridContainer}>
          {/* Utility Buttons */}
          <Box sx={styles.utilityButtonsContainer}>
            <Tooltip placement='right' title={<Box sx={styles.tooltipContent}>Select all</Box>}>
              <Box sx={[styles.utilityButton, allAliveBeastsSelected && styles.selectedItem]} onClick={() => selectAllBeasts()}>
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
    padding: 1,
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
    minHeight: '300px',
    gap: 2,
    textAlign: 'center',
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
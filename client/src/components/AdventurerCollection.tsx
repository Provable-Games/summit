import { useGameStore } from '@/stores/gameStore';
import { Adventurer } from "@/types/game";
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import { Box, Tooltip, Typography } from "@mui/material";
import React, { useMemo } from 'react';
import { gameColors } from '../utils/themes';
import AdventurerProfile from './AdventurerProfile';

function AdventurerCollection() {
  const { adventurerCollection, selectedAdventurers, setSelectedAdventurers, killedByAdventurers } = useGameStore()

  // Sort adventurers: killedByAdventurers first, then by level
  const sortedAdventurers = useMemo(() => {
    return [...adventurerCollection].sort((a, b) => {
      const aIsKilledBy = killedByAdventurers.includes(a.id)
      const bIsKilledBy = killedByAdventurers.includes(b.id)

      // If one is killedBy and the other isn't, killedBy comes first
      if (aIsKilledBy && !bIsKilledBy) return -1
      if (!aIsKilledBy && bIsKilledBy) return 1

      // If both are in the same group, sort by level (descending)
      return b.level - a.level
    })
  }, [adventurerCollection, killedByAdventurers])

  const selectAdventurer = (adventurer) => {
    if (selectedAdventurers.find((selected: Adventurer) => selected.id === adventurer.id)) {
      setSelectedAdventurers(selectedAdventurers.filter((prev: Adventurer) => prev.id !== adventurer.id))
    } else {
      setSelectedAdventurers([...selectedAdventurers, adventurer as Adventurer])
    }
  }

  const selectAllAdventurers = () => {
    // If all adventurers are selected, deselect all
    if (sortedAdventurers.every(adventurer => selectedAdventurers.some(selected => selected.id === adventurer.id))) {
      setSelectedAdventurers([])
    } else {
      // Select all adventurers
      setSelectedAdventurers([...sortedAdventurers])
    }
  }

  // Helper to check if all adventurers are selected
  const allAdventurersSelected = useMemo(() => {
    return sortedAdventurers.length > 0 && sortedAdventurers.every(adventurer =>
      selectedAdventurers.some(selected => selected.id === adventurer.id)
    );
  }, [sortedAdventurers, selectedAdventurers]);

  return (
    <Box sx={styles.container}>
      {/* Adventurer Grid with Utility Button */}
      {sortedAdventurers.length > 0 && (
        <Box sx={styles.adventurerGridContainer}>
          {/* Utility Button */}
          <Box sx={styles.utilityButtonsContainer}>
            <Tooltip placement='right' title={<Box sx={styles.tooltipContent}>Select all</Box>}>
              <Box sx={[styles.utilityButton, allAdventurersSelected && styles.selectedItem]} onClick={() => selectAllAdventurers()}>
                <LibraryAddCheckIcon sx={{ color: gameColors.brightGreen, fontSize: '20px' }} />
              </Box>
            </Tooltip>
          </Box>

          {/* Adventurer Grid */}
          <Box sx={styles.adventurerGrid}>
            {React.Children.toArray(
              sortedAdventurers.map(adventurer => {
                const isSelected = selectedAdventurers.some(selected => selected.id === adventurer.id)
                const healthGiven = killedByAdventurers.includes(adventurer.id) ? adventurer.level * 10 : adventurer.level
                const isKilledBy = killedByAdventurers.includes(adventurer.id)

                return <Tooltip
                  key={adventurer.id}
                  title={<AdventurerProfile adventurer={adventurer} />}
                  placement="top"
                  arrow
                  PopperProps={{
                    sx: {
                      '& .MuiTooltip-tooltip': {
                        backgroundColor: 'transparent',
                        maxWidth: 'none',
                        padding: 0,
                      },
                      '& .MuiTooltip-arrow': {
                        color: '#d0c98d',
                      }
                    }
                  }}
                >
                  <Box
                    onClick={() => { selectAdventurer(adventurer); }}
                    sx={[
                      styles.adventurerCard,
                      isKilledBy && styles.killedByCard,
                      isSelected && styles.selectedCard,
                      ((selectedAdventurers.length > 0) && !isSelected) && { opacity: 0.5 }
                    ]}
                  >
                  {/* Glow effect for selected cards */}
                  {isSelected && (
                    <Box sx={styles.glowEffect} />
                  )}

                  {/* Tombstone Image */}
                  <Box sx={styles.imageContainer}>
                    <img
                      src={'/images/tombstone.png'}
                      alt="tombstone"
                      style={styles.tombstoneImage}
                    />
                  </Box>

                  {/* Adventurer Name */}
                  <Typography sx={[styles.adventurerName, isKilledBy && styles.killedByText]}>
                    Adventurer #{adventurer.id}
                  </Typography>

                  {/* Level */}
                  <Box sx={styles.levelContainer}>
                    <Typography sx={styles.levelText}>
                      Level {adventurer.level}
                    </Typography>
                  </Box>

                  {/* Combat Preview - Health Given */}
                  <Box sx={styles.combatPreview}>
                    <Box sx={styles.combatContent}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.brightGreen}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <Typography sx={styles.combatTextSuccess}>
                        +{healthGiven} HP
                      </Typography>
                    </Box>
                  </Box>
                  </Box>
                </Tooltip>
              })
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default AdventurerCollection;

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
  adventurerGridContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
  },
  adventurerGrid: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
    overflowX: 'scroll',
    flex: 1,
    px: '4px',
  },
  adventurerCard: {
    position: 'relative',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: '6px',
    padding: '6px',
    mt: '6px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    width: '140px',
    minWidth: '140px',
    mb: '4px',
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
  tombstoneImage: {
    maxWidth: '90%',
    maxHeight: '90%',
  },
  adventurerName: {
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
  },
  levelContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '6px',
  },
  levelText: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
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
    border: `1px solid ${gameColors.brightGreen}60`,
    textAlign: 'center',
    marginTop: 'auto',
  },
  combatContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    justifyContent: 'center',
  },
  combatTextSuccess: {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
    color: gameColors.brightGreen,
  },
  killedByText: {
    color: gameColors.brightGreen,
  },
  killedByCard: {
    border: `1px solid ${gameColors.brightGreen}`,
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
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { fetchBeastImage } from '@/utils/beasts';
import { gameColors } from '@/utils/themes';
import CasinoIcon from '@mui/icons-material/Casino';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import StarIcon from '@mui/icons-material/Star';
import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface Upgrade {
  id: 'spirit' | 'luck' | 'specials';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const UPGRADES: Upgrade[] = [
  {
    id: 'spirit',
    name: 'Spirit',
    description: 'Your beast revives 50% faster',
    icon: <EnergyIcon sx={{ fontSize: '32px' }} />,
    color: '#00ffff',
  },
  {
    id: 'luck',
    name: 'Luck',
    description: 'Your beast gains 50% crit chance',
    icon: <CasinoIcon sx={{ fontSize: '32px' }} />,
    color: '#ff69b4',
  },
  {
    id: 'specials',
    name: 'Specials',
    description: 'Your beast unlocks name match bonus',
    icon: <StarIcon sx={{ fontSize: '32px' }} />,
    color: '#ffd700',
  },
];

function BeastUpgradeModal(props) {
  const { open, close } = props;
  const { executeGameAction, actionFailed } = useGameDirector();
  const { collection } = useGameStore();

  // Filter beasts that have available upgrades
  const beastsWithUpgrades = collection.filter(beast => {
    const totalStats = Object.values(beast.stats).filter(Boolean).length;
    return (beast.adventurers_killed || 0) > totalStats;
  }).sort((a, b) => b.power - a.power);

  const [currentBeastIndex, setCurrentBeastIndex] = useState(0);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [beastUpgrades, setBeastUpgrades] = useState<{ [key: number]: { spirit: boolean; luck: boolean; specials: boolean } }>({});

  const currentBeast = beastsWithUpgrades[currentBeastIndex];
  const activeStatsCount = currentBeast ? Object.values(currentBeast.stats).filter(Boolean).length : 0;
  const totalKills = currentBeast ? (currentBeast.adventurers_killed || 0) : 0;
  const availableUpgradeSlots = currentBeast ? UPGRADES.filter(u => !currentBeast.stats[u.id]).length : 0;
  const maxPossibleUpgrades = Math.min(availableUpgradeSlots, Math.max(0, totalKills - activeStatsCount));

  // Calculate remaining available points after accounting for selected upgrades
  const currentBeastUpgrades = currentBeast ? (beastUpgrades[currentBeast.token_id] || { spirit: false, luck: false, specials: false }) : { spirit: false, luck: false, specials: false };
  const selectedUpgradesCount = Object.values(currentBeastUpgrades).filter(Boolean).length;
  const availablePoints = Math.max(0, maxPossibleUpgrades - selectedUpgradesCount);

  useEffect(() => {
    setUpgradeInProgress(false);
  }, [actionFailed]);

  const handleNext = () => {
    if (currentBeastIndex < beastsWithUpgrades.length - 1) {
      setCurrentBeastIndex(currentBeastIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentBeastIndex > 0) {
      setCurrentBeastIndex(currentBeastIndex - 1);
    }
  };

  const handleSelectUpgrade = (upgradeId: 'luck' | 'spirit' | 'specials') => {
    if (!currentBeast || currentBeast.stats[upgradeId]) return;

    const currentBeastUpgrades = beastUpgrades[currentBeast.token_id] || { spirit: false, luck: false, specials: false };
    const selectedUpgradesCount = Object.values(currentBeastUpgrades).filter(Boolean).length;

    // Check if we can add more upgrades (have available points)
    if (!currentBeastUpgrades[upgradeId] && selectedUpgradesCount >= maxPossibleUpgrades) {
      return; // Can't select more upgrades than max possible
    }

    const updatedUpgrades = {
      ...currentBeastUpgrades,
      [upgradeId]: !currentBeastUpgrades[upgradeId] // Toggle the upgrade
    };

    // Check if all upgrades are false
    const hasAnySelected = Object.values(updatedUpgrades).some(Boolean);

    // Check if this selection completes all available upgrades
    const newSelectedCount = Object.values(updatedUpgrades).filter(Boolean).length;
    const isAddingUpgrade = updatedUpgrades[upgradeId] && !currentBeastUpgrades[upgradeId];
    const completesAllUpgrades = isAddingUpgrade && newSelectedCount >= maxPossibleUpgrades && maxPossibleUpgrades > 0;
    const isNotLastBeast = currentBeastIndex < beastsWithUpgrades.length - 1;

    if (hasAnySelected) {
      const newUpgrades = {
        ...beastUpgrades,
        [currentBeast.token_id]: updatedUpgrades
      };

      // Auto-advance to next beast if all upgrades are now selected
      if (completesAllUpgrades && isNotLastBeast) {
        // Update both states together to avoid flicker
        setBeastUpgrades(newUpgrades);
        setCurrentBeastIndex(currentBeastIndex + 1);
      } else {
        setBeastUpgrades(newUpgrades);
      }
    } else {
      const { [currentBeast.token_id]: removed, ...remainingUpgrades } = beastUpgrades;
      setBeastUpgrades(remainingUpgrades);
    }
  };

  const handleUpgradeAll = async (shouldClose: boolean = true) => {
    setUpgradeInProgress(true);

    try {
      // Merge active stats with selected upgrades
      const upgradesWithActiveStats = Object.entries(beastUpgrades).reduce((acc, [tokenId, selectedUpgrades]) => {
        const beast = collection.find(b => b.token_id.toString() === tokenId);
        if (beast) {
          // Combine active stats with newly selected upgrades
          acc[tokenId] = {
            spirit: beast.stats.spirit || selectedUpgrades.spirit || false,
            luck: beast.stats.luck || selectedUpgrades.luck || false,
            specials: beast.stats.specials || selectedUpgrades.specials || false,
          };
        }
        return acc;
      }, {} as { [key: number]: { spirit: boolean; luck: boolean; specials: boolean } });

      let result = await executeGameAction({
        type: 'apply_stat_points',
        upgrades: upgradesWithActiveStats
      });

      if (result) {
        close(false);
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setUpgradeInProgress(false);
    }
  };

  const hasSelectedUpgrades = Object.values(beastUpgrades).some(upgrades =>
    Object.values(upgrades).some(Boolean)
  );

  const isLastBeast = currentBeastIndex === beastsWithUpgrades.length - 1;

  if (!currentBeast) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={() => { close(false) }}
      maxWidth={'md'}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `
          }
        }
      }}
    >
      <Box sx={[styles.dialogContainer]}>
        <Box sx={styles.container}>
          <Box sx={styles.beastSection}>
            <Box sx={styles.navigationContainer}>
              <IconButton
                onClick={handlePrevious}
                disabled={currentBeastIndex === 0}
                sx={styles.navButton}
              >
                <NavigateBeforeIcon />
              </IconButton>

              <Box sx={styles.beastInfo}>
                <Typography sx={styles.beastName}>
                  "{currentBeast.prefix} {currentBeast.suffix}" {currentBeast.name}
                </Typography>
                <Box sx={styles.beastDetailsRow}>
                  <Box sx={styles.beastImageContainer}>
                    <img src={fetchBeastImage(currentBeast)} alt={currentBeast.name} style={{ height: '90%' }} />
                  </Box>
                  <Box sx={styles.beastStatsColumn}>
                    <Box sx={styles.statsGrid}>
                      {/* Power */}
                      <Box sx={styles.statBox}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={gameColors.yellow}>
                          <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                        </svg>
                        <Typography sx={styles.statValue}>{currentBeast.power}</Typography>
                      </Box>

                      {/* Health */}
                      <Box sx={styles.statBox}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={gameColors.red}>
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <Typography sx={styles.statValue}>{currentBeast.health}</Typography>
                      </Box>
                    </Box>

                    <Box sx={styles.secondaryStats}>
                      <Box sx={styles.secondaryStatRow}>
                        <Typography sx={styles.secondaryStatLabel}>Level</Typography>
                        <Typography sx={styles.secondaryStatValue}>{currentBeast.current_level}</Typography>
                      </Box>
                      <Box sx={styles.secondaryStatRow}>
                        <Typography sx={styles.secondaryStatLabel}>Kills</Typography>
                        <Typography sx={styles.secondaryStatValue}>{currentBeast.adventurers_killed || 0}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <IconButton
                onClick={handleNext}
                disabled={currentBeastIndex === beastsWithUpgrades.length - 1}
                sx={styles.navButton}
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>

          </Box>

          <Typography sx={styles.availablePoints}>
            {availablePoints} upgrade{availablePoints !== 1 ? 's' : ''} available
          </Typography>

          <Box sx={styles.upgradesContainer}>

            {UPGRADES.map((upgrade) => {
              const isUnlocked = currentBeast.stats[upgrade.id];
              const currentBeastUpgrades = beastUpgrades[currentBeast.token_id] || { spirit: false, luck: false, specials: false };
              const isSelected = currentBeastUpgrades[upgrade.id];
              const selectedUpgradesCount = Object.values(currentBeastUpgrades).filter(Boolean).length;
              const canSelect = !isUnlocked && (isSelected || selectedUpgradesCount < maxPossibleUpgrades);

              return (
                <Box
                  key={upgrade.id}
                  sx={[
                    styles.upgradeCard,
                    isSelected && styles.upgradeCardSelected,
                    !canSelect && !isUnlocked && styles.upgradeCardUnavailable,
                    {
                      borderColor: isSelected ? upgrade.color :
                        isUnlocked ? upgrade.color :
                          canSelect ? `${gameColors.accentGreen}60` : '#444'
                    }
                  ]}
                  onClick={() => canSelect && handleSelectUpgrade(upgrade.id)}
                >
                  <Box sx={[styles.upgradeIcon, { color: upgrade.color }]}>
                    {upgrade.icon}
                  </Box>

                  <Typography sx={[
                    styles.upgradeName,
                    { color: upgrade.color }
                  ]}>
                    {upgrade.name}
                  </Typography>

                  <Typography sx={styles.upgradeDescription}>
                    {upgrade.description}
                  </Typography>

                  {isUnlocked ? (
                    <Box sx={styles.statusContainer}>
                      <Box sx={[styles.unlockedBadge, { borderColor: upgrade.color + '60' }]}>
                        <Typography sx={[styles.unlockedText, { color: upgrade.color }]}>
                          ACTIVE
                        </Typography>
                      </Box>
                    </Box>
                  ) : isSelected ? (
                    <Box sx={styles.statusContainer}>
                      <Box sx={[styles.selectedBadge, { backgroundColor: upgrade.color + '20', borderColor: upgrade.color }]}>
                        <Typography sx={[styles.selectedText, { color: upgrade.color }]}>
                          SELECTED
                        </Typography>
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>

          <Box sx={styles.beastCounter}>
            <Typography sx={styles.beastCounterText}>
              Beast {currentBeastIndex + 1} of {beastsWithUpgrades.length}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Button
              disabled={upgradeInProgress || !hasSelectedUpgrades}
              onClick={() => handleUpgradeAll(true)}
              sx={[
                styles.upgradeButton,
                hasSelectedUpgrades && styles.upgradeButtonActive
              ]}
            >
              <Typography sx={styles.upgradeButtonText}>
                {upgradeInProgress
                  ? <Box display={'flex'} alignItems={'baseline'}>
                    <span>Upgrading</span>
                    <div className='dotLoader white' />
                  </Box>
                  : `UPGRADE ${Object.keys(beastUpgrades).length} BEASTS`
                }
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default BeastUpgradeModal;

const styles = {
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    maxWidth: '98dvw',
    maxHeight: '85dvh',
    overflowX: 'hidden',
    p: 3,
  },
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    lineHeight: '24px',
    color: gameColors.gameYellow,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  subtitle: {
    fontSize: '16px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  beastSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  navigationContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    width: '100%',
    justifyContent: 'center',
  },
  navButton: {
    color: '#ffedbb',
    border: `1px solid ${gameColors.gameYellow}`,
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}80`,
      border: `1px solid ${gameColors.gameYellow}`,
    },
    '&:disabled': {
      opacity: 0.3,
      cursor: 'not-allowed',
    },
  },
  beastInfo: {
    my: 1,
    textAlign: 'center',
    width: '100%',
  },
  beastName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'capitalize',
    mb: 2,
  },
  beastDetailsRow: {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beastImageContainer: {
    background: '#000',
    borderRadius: '8px',
    width: '125px',
    maxWidth: '28dvw',
    height: '100px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: `2px solid ${gameColors.accentGreen}60`,
    boxShadow: `
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      0 2px 8px rgba(0, 0, 0, 0.3)
    `,
  },
  beastStatsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    justifyContent: 'center',
  },
  statsGrid: {
    display: 'flex',
    gap: 1,
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '4px',
    background: `${gameColors.darkGreen}80`,
    backdropFilter: 'blur(4px)',
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  statValue: {
    fontSize: '16px',
    color: '#FFF',
    fontWeight: 'bold',
    textShadow: `0 1px 1px ${gameColors.darkGreen}`,
  },
  secondaryStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  },
  secondaryStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: `${gameColors.darkGreen}60`,
    padding: '4px 12px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}20`,
  },
  secondaryStatLabel: {
    fontSize: '13px',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
  },
  secondaryStatValue: {
    fontSize: '14px',
    color: '#ffedbb',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  beastKills: {
    fontSize: '15px',
    color: gameColors.gameYellow,
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    mt: 0.5,
  },
  availablePoints: {
    fontSize: '15px',
    color: gameColors.yellow,
    fontWeight: '600',
    textShadow: `0 0 8px ${gameColors.brightGreen}40`,
  },
  upgradesContainer: {
    display: 'flex',
    gap: 2,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
    '@media (min-width: 600px)': {
      flexWrap: 'nowrap',
    },
  },
  upgradeCard: {
    flex: '1 1 200px',
    width: '180px',
    maxWidth: '220px',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    p: 1.5,
    background: `${gameColors.mediumGreen}60`,
    border: `2px solid`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    '@media (max-width: 600px)': {
      minWidth: '150px',
      flex: '1 1 150px',
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4)`,
    },
  },
  upgradeCardDisabled: {
    opacity: 0.7,
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
  upgradeCardSelected: {
    background: `${gameColors.mediumGreen}80`,
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4)`,
  },
  upgradeCardUnavailable: {
    opacity: 0.4,
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
  upgradeIcon: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
  },
  upgradeName: {
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  upgradeNameDisabled: {
    textDecoration: 'line-through',
  },
  upgradeDescription: {
    fontSize: '13px',
    color: '#ffedbb',
    textAlign: 'center',
    lineHeight: '16px',
    letterSpacing: '0.3px',
  },
  statusContainer: {
    marginTop: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    pt: 1,
  },
  unlockedBadge: {
    background: `${gameColors.darkGreen}90`,
    border: `2px solid`,
    borderRadius: '6px',
    px: 1.5,
    py: 0.5,
  },
  unlockedText: {
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  selectedBadge: {
    border: `2px solid`,
    borderRadius: '6px',
    px: 1.5,
    py: 0.5,
  },
  selectedText: {
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  beastCounter: {
    mt: -1,
  },
  beastCounterText: {
    fontSize: '14px',
    color: '#999',
    letterSpacing: '0.5px',
  },
  upgradeButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    width: '200px',
    height: '48px',
    mt: '6px',
    border: `2px solid ${gameColors.gameYellow}`,
    transition: 'all 0.3s ease',
    opacity: 0.9,
    '&:hover': {
      background: `${gameColors.mediumGreen}90`,
    },
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
      border: `2px solid ${gameColors.gameYellow}40`,
    },
  },
  upgradeButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}50,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 30px ${gameColors.brightGreen}80,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
    },
  },
  upgradeButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
  },
  multiUpgradeHint: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
    letterSpacing: '0.3px',
  },
  textButton: {
    background: 'transparent',
    border: 'none',
    textTransform: 'none',
    '&:hover': {
      background: `${gameColors.mediumGreen}30`,
    },
    '&:disabled': {
      opacity: 0.4,
    },
  },
  textButtonText: {
    color: gameColors.accentGreen,
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.3px',
    textDecoration: 'underline',
    '&:hover': {
      color: gameColors.brightGreen,
    },
  },
};
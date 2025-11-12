import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/kill-token.png';
import { useGameDirector } from '@/contexts/GameDirector';
import { fetchBeastImage } from '@/utils/beasts';
import { gameColors } from '@/utils/themes';
import AddIcon from '@mui/icons-material/Add';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

// DUMMY VALUES FOR COSTS
const UPGRADE_COSTS = {
  luck_per_level: 5,
  spirit_per_level: 5,
  diplomacy: 100,
  specials: 150,
  wisdom: 200,
  health_per_point: 2,
};

interface BeastUpgradeModalProps {
  open: boolean;
  beast: any;
  close: () => void;
}

function BeastUpgradeModal(props: BeastUpgradeModalProps) {
  const { open, close, beast } = props;
  const { executeGameAction, actionFailed } = useGameDirector();

  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [luckUpgrade, setLuckUpgrade] = useState(0);
  const [spiritUpgrade, setSpiritUpgrade] = useState(0);
  const [diplomacySelected, setDiplomacySelected] = useState(false);
  const [specialsSelected, setSpecialsSelected] = useState(false);
  const [wisdomSelected, setWisdomSelected] = useState(false);
  const [bonusHealthUpgrade, setBonusHealthUpgrade] = useState(0);

  const killTokens = beast?.kill_tokens || 1000;
  const corpseTokens = beast?.corpse_tokens || 500;
  const currentBeast = beast;

  useEffect(() => {
    setUpgradeInProgress(false);
  }, [actionFailed]);

  useEffect(() => {
    if (open) {
      setLuckUpgrade(0);
      setSpiritUpgrade(0);
      setDiplomacySelected(false);
      setSpecialsSelected(false);
      setWisdomSelected(false);
      setBonusHealthUpgrade(0);
    }
  }, [open, beast?.token_id]);

  const calculateTotalCost = () => {
    let killTokenCost = 0;
    let corpseTokenCost = 0;

    killTokenCost += luckUpgrade * UPGRADE_COSTS.luck_per_level;
    killTokenCost += spiritUpgrade * UPGRADE_COSTS.spirit_per_level;

    if (diplomacySelected && !currentBeast?.stats?.diplomacy) {
      killTokenCost += UPGRADE_COSTS.diplomacy;
    }
    if (specialsSelected && !currentBeast?.stats?.specials) {
      killTokenCost += UPGRADE_COSTS.specials;
    }
    if (wisdomSelected && !currentBeast?.stats?.wisdom) {
      killTokenCost += UPGRADE_COSTS.wisdom;
    }

    corpseTokenCost += bonusHealthUpgrade * UPGRADE_COSTS.health_per_point;

    return { killTokenCost, corpseTokenCost };
  };

  const { killTokenCost, corpseTokenCost } = calculateTotalCost();
  const canAfford = killTokenCost <= killTokens && corpseTokenCost <= corpseTokens;
  const hasAnyUpgrade = luckUpgrade > 0 || spiritUpgrade > 0 ||
    diplomacySelected || specialsSelected || wisdomSelected ||
    bonusHealthUpgrade > 0;

  const handleUpgrade = async () => {
    if (!canAfford || !hasAnyUpgrade) return;

    setUpgradeInProgress(true);

    try {
      const newStats = {
        [currentBeast.token_id]: {
          spirit: (currentBeast.stats.spirit || 0) + spiritUpgrade,
          luck: (currentBeast.stats.luck || 0) + luckUpgrade,
          specials: currentBeast.stats.specials || specialsSelected,
          wisdom: currentBeast.stats.wisdom || wisdomSelected,
          diplomacy: currentBeast.stats.diplomacy || diplomacySelected,
        }
      };

      let result = await executeGameAction({
        type: 'apply_stat_points',
        upgrades: newStats,
        bonusHealth: bonusHealthUpgrade,
      });

      if (result) {
        close();
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setUpgradeInProgress(false);
    }
  };

  const adjustStat = (stat: 'luck' | 'spirit', delta: number) => {
    const currentValue = stat === 'luck' ? currentBeast.stats?.luck || 0 : currentBeast.stats?.spirit || 0;
    const currentUpgrade = stat === 'luck' ? luckUpgrade : spiritUpgrade;
    const setter = stat === 'luck' ? setLuckUpgrade : setSpiritUpgrade;

    const newValue = Math.max(0, Math.min(255 - currentValue, currentUpgrade + delta));
    setter(newValue);
  };

  if (!currentBeast) {
    return null;
  }

  const currentLuck = currentBeast.stats?.luck || 0;
  const currentSpirit = currentBeast.stats?.spirit || 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            background: `radial-gradient(ellipse at top, ${gameColors.darkGreen}f8 0%, #000000f5 100%)`,
            backdropFilter: 'blur(10px)',
            border: `3px solid`,
            borderImage: `linear-gradient(135deg, ${gameColors.accentGreen}, ${gameColors.brightGreen}, ${gameColors.accentGreen}) 1`,
            borderRadius: 0,
            boxShadow: `
              0 0 60px ${gameColors.brightGreen}40,
              inset 0 0 40px ${gameColors.darkGreen}60,
              0 20px 60px rgba(0, 0, 0, 0.9)
            `,
            width: '900px',
            maxWidth: '95vw',
            position: 'relative',
          }
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }
        }
      }}
    >
      <Box sx={styles.container}>
        {/* Close Button */}
        <IconButton onClick={close} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        {/* Header */}
        <Box sx={styles.header}>
          <Typography sx={styles.title}>BEAST UPGRADES</Typography>
          <Box sx={styles.divider} />
        </Box>

        {/* Main Content */}
        <Box sx={styles.content}>
          {/* Left Panel - Beast Display */}
          <Box sx={styles.leftPanel}>
            <Box sx={styles.beastPortrait}>
              <img
                src={fetchBeastImage(currentBeast)}
                alt={currentBeast.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <Box sx={styles.portraitBorder} />
            </Box>

            <Typography sx={styles.beastName}>
              "{currentBeast.prefix} {currentBeast.suffix}"
            </Typography>
            <Typography sx={styles.beastType}>{currentBeast.name}</Typography>

            <Box sx={styles.beastStats}>
              <Box sx={styles.statRow}>
                <Typography sx={styles.statLabel}>Level</Typography>
                <Typography sx={styles.statValue}>{currentBeast.current_level}</Typography>
              </Box>
              <Box sx={styles.statRow}>
                <Typography sx={styles.statLabel}>Power</Typography>
                <Typography sx={[styles.statValue, { color: gameColors.yellow }]}>{currentBeast.power}</Typography>
              </Box>
              <Box sx={styles.statRow}>
                <Typography sx={styles.statLabel}>Health</Typography>
                <Typography sx={[styles.statValue, { color: gameColors.red }]}>
                  {currentBeast.health}
                  {(currentBeast.bonus_health || 0) > 0 && (
                    <span style={{ color: '#4ade80', marginLeft: '4px' }}>
                      +{currentBeast.bonus_health}
                    </span>
                  )}
                </Typography>
              </Box>
              <Box sx={styles.statRow}>
                <Typography sx={styles.statLabel}>Kills</Typography>
                <Typography sx={styles.statValue}>{currentBeast.adventurers_killed || 0}</Typography>
              </Box>
            </Box>

            {/* Resources */}
            <Box sx={styles.resources}>
              <Box sx={styles.resourceItem}>
                <img src={killTokenImg} alt="Kill" style={{ width: '20px', height: '20px' }} />
                <Typography sx={styles.resourceValue}>{killTokens}</Typography>
              </Box>
              <Box sx={styles.resourceItem}>
                <img src={corpseTokenImg} alt="Corpse" style={{ width: '20px', height: '20px' }} />
                <Typography sx={styles.resourceValue}>{corpseTokens}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Right Panel - Upgrades */}
          <Box sx={styles.rightPanel}>
            {/* Incremental Stats */}
            <Box sx={styles.section}>
              <Typography sx={styles.sectionTitle}>ATTRIBUTES</Typography>

              <Box sx={styles.attributeRow}>
                <Box sx={styles.attributeIcon}>
                  <CasinoIcon sx={{ fontSize: '20px', color: '#ff69b4' }} />
                </Box>
                <Box sx={styles.attributeInfo}>
                  <Typography sx={styles.attributeName}>Luck</Typography>
                  <Typography sx={styles.attributeLevel}>
                    {currentLuck}
                    {luckUpgrade > 0 && <span style={{ color: '#4ade80' }}> → {currentLuck + luckUpgrade}</span>}
                    <span style={{ color: '#666' }}> / 255</span>
                  </Typography>
                </Box>
                <Box sx={styles.attributeControls}>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('luck', -1)}
                    disabled={luckUpgrade === 0}
                    sx={styles.statButton}
                  >
                    <RemoveIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <Box sx={styles.statInput}>
                    <Typography sx={styles.statInputValue}>{luckUpgrade}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('luck', 1)}
                    disabled={currentLuck + luckUpgrade >= 255}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
                {luckUpgrade > 0 && (
                  <Box sx={styles.attributeCost}>
                    <img src={killTokenImg} alt="" style={{ width: '14px', height: '14px' }} />
                    <Typography sx={styles.costValue}>{luckUpgrade * UPGRADE_COSTS.luck_per_level}</Typography>
                  </Box>
                )}
              </Box>

              <Box sx={styles.attributeRow}>
                <Box sx={styles.attributeIcon}>
                  <EnergyIcon sx={{ fontSize: '20px', color: '#00ffff' }} />
                </Box>
                <Box sx={styles.attributeInfo}>
                  <Typography sx={styles.attributeName}>Spirit</Typography>
                  <Typography sx={styles.attributeLevel}>
                    {currentSpirit}
                    {spiritUpgrade > 0 && <span style={{ color: '#4ade80' }}> → {currentSpirit + spiritUpgrade}</span>}
                    <span style={{ color: '#666' }}> / 255</span>
                  </Typography>
                </Box>
                <Box sx={styles.attributeControls}>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('spirit', -1)}
                    disabled={spiritUpgrade === 0}
                    sx={styles.statButton}
                  >
                    <RemoveIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <Box sx={styles.statInput}>
                    <Typography sx={styles.statInputValue}>{spiritUpgrade}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('spirit', 1)}
                    disabled={currentSpirit + spiritUpgrade >= 255}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
                {spiritUpgrade > 0 && (
                  <Box sx={styles.attributeCost}>
                    <img src={killTokenImg} alt="" style={{ width: '14px', height: '14px' }} />
                    <Typography sx={styles.costValue}>{spiritUpgrade * UPGRADE_COSTS.spirit_per_level}</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Abilities */}
            <Box sx={styles.section}>
              <Typography sx={styles.sectionTitle}>ABILITIES</Typography>

              <Box sx={styles.abilitiesGrid}>
                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.stats?.diplomacy && styles.abilityUnlocked,
                    !currentBeast.stats?.diplomacy && diplomacySelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.stats?.diplomacy && setDiplomacySelected(!diplomacySelected)}
                >
                  <HandshakeIcon sx={{ fontSize: '28px', color: '#a78bfa' }} />
                  <Typography sx={styles.abilityName}>Diplomacy</Typography>
                  <Typography sx={styles.abilityDescription}>
                    Get a share of rewards from other "{currentBeast.prefix} {currentBeast.suffix}" beasts.
                  </Typography>
                  {currentBeast.stats?.diplomacy ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '12px', height: '12px' }} />
                      <Typography sx={styles.abilityCostText}>{UPGRADE_COSTS.diplomacy}</Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.stats?.specials && styles.abilityUnlocked,
                    !currentBeast.stats?.specials && specialsSelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.stats?.specials && setSpecialsSelected(!specialsSelected)}
                >
                  <StarIcon sx={{ fontSize: '28px', color: '#ffd700' }} />
                  <Typography sx={styles.abilityName}>Specials</Typography>
                  <Typography sx={styles.abilityDescription}>
                    Unlocks name match bonus damage
                  </Typography>
                  {currentBeast.stats?.specials ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '12px', height: '12px' }} />
                      <Typography sx={styles.abilityCostText}>{UPGRADE_COSTS.specials}</Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.stats?.wisdom && styles.abilityUnlocked,
                    !currentBeast.stats?.wisdom && wisdomSelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.stats?.wisdom && setWisdomSelected(!wisdomSelected)}
                >
                  <PsychologyIcon sx={{ fontSize: '28px', color: '#60a5fa' }} />
                  <Typography sx={styles.abilityName}>Wisdom</Typography>
                  <Typography sx={styles.abilityDescription}>
                    Gain XP when successfully defending attacks on the Summit.
                  </Typography>
                  {currentBeast.stats?.wisdom ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '12px', height: '12px' }} />
                      <Typography sx={styles.abilityCostText}>{UPGRADE_COSTS.wisdom}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Bonus Health */}
            <Box sx={styles.section}>
              <Typography sx={styles.sectionTitle}>VITALITY</Typography>

              <Box sx={styles.vitalityRow}>
                <Box sx={styles.vitalityIcon}>
                  <FavoriteIcon sx={{ fontSize: '20px', color: gameColors.red }} />
                </Box>
                <Box sx={styles.vitalityInfo}>
                  <Typography sx={styles.attributeName}>Bonus Health</Typography>
                  <Typography sx={styles.attributeLevel}>
                    Current: +{currentBeast.bonus_health || 0} HP
                    {bonusHealthUpgrade > 0 && (
                      <span style={{ color: '#4ade80' }}> → +{(currentBeast.bonus_health || 0) + bonusHealthUpgrade} HP</span>
                    )}
                  </Typography>
                </Box>
                <Box sx={styles.attributeControls}>
                  <IconButton
                    size="small"
                    onClick={() => setBonusHealthUpgrade(Math.max(0, bonusHealthUpgrade - 10))}
                    disabled={bonusHealthUpgrade === 0}
                    sx={styles.statButton}
                  >
                    <RemoveIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                  <Box sx={styles.statInput}>
                    <Typography sx={styles.statInputValue}>{bonusHealthUpgrade}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setBonusHealthUpgrade(bonusHealthUpgrade + 10)}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
                {bonusHealthUpgrade > 0 && (
                  <Box sx={styles.attributeCost}>
                    <img src={corpseTokenImg} alt="" style={{ width: '14px', height: '14px' }} />
                    <Typography sx={styles.costValue}>{bonusHealthUpgrade * UPGRADE_COSTS.health_per_point}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          <Box sx={styles.totalCost}>
            {killTokenCost > 0 && (
              <Box sx={styles.totalCostItem}>
                <img src={killTokenImg} alt="" style={{ width: '20px', height: '20px' }} />
                <Typography sx={[styles.totalCostText, killTokenCost > killTokens && styles.totalCostError]}>
                  {killTokenCost} / {killTokens}
                </Typography>
              </Box>
            )}
            {corpseTokenCost > 0 && (
              <Box sx={styles.totalCostItem}>
                <img src={corpseTokenImg} alt="" style={{ width: '20px', height: '20px' }} />
                <Typography sx={[styles.totalCostText, corpseTokenCost > corpseTokens && styles.totalCostError]}>
                  {corpseTokenCost} / {corpseTokens}
                </Typography>
              </Box>
            )}
          </Box>

          <Button
            disabled={upgradeInProgress || !hasAnyUpgrade || !canAfford}
            onClick={handleUpgrade}
            sx={[
              styles.applyButton,
              hasAnyUpgrade && canAfford && styles.applyButtonActive
            ]}
          >
            {upgradeInProgress ? (
              <Box display={'flex'} alignItems={'baseline'} gap={1}>
                <span>APPLYING</span>
                <div className='dotLoader white' />
              </Box>
            ) : !canAfford ? (
              'INSUFFICIENT RESOURCES'
            ) : !hasAnyUpgrade ? (
              'SELECT UPGRADES'
            ) : (
              'APPLY UPGRADES'
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

export default BeastUpgradeModal;

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#999',
    zIndex: 10,
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  header: {
    p: 2,
    pb: 1.5,
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '3px',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadow: `
      0 0 20px ${gameColors.brightGreen},
      0 0 10px ${gameColors.brightGreen},
      0 2px 4px rgba(0, 0, 0, 0.8)
    `,
  },
  divider: {
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColors.brightGreen}, transparent)`,
    mt: 1.5,
    boxShadow: `0 0 8px ${gameColors.brightGreen}`,
  },
  content: {
    display: 'flex',
    gap: 2,
    p: 2,
    pt: 1,
  },
  leftPanel: {
    width: '240px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  },
  beastPortrait: {
    position: 'relative',
    width: '200px',
    height: '200px',
    background: `radial-gradient(circle, ${gameColors.darkGreen}40, #000)`,
    border: `3px solid ${gameColors.accentGreen}`,
    boxShadow: `
      0 0 20px ${gameColors.accentGreen}60,
      inset 0 0 30px rgba(0, 0, 0, 0.8)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: `1px solid ${gameColors.brightGreen}40`,
    pointerEvents: 'none',
  },
  beastName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    textTransform: 'capitalize',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
    letterSpacing: '0.5px',
  },
  beastType: {
    fontSize: '13px',
    color: gameColors.accentGreen,
    textAlign: 'center',
    mt: -0.5,
  },
  beastStats: {
    width: '100%',
    background: `linear-gradient(180deg, ${gameColors.darkGreen}40, transparent)`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '4px',
    p: 1,
    mt: 0.5,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 0.3,
    borderBottom: `1px solid ${gameColors.darkGreen}60`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  statLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
  },
  resources: {
    display: 'flex',
    gap: 1,
    width: '100%',
    mt: 1,
  },
  resourceItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    p: 0.75,
    justifyContent: 'center',
  },
  resourceValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  section: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen}30, transparent)`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '4px',
    p: 1.5,
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    mb: 1.5,
    pb: 0.5,
    borderBottom: `1px solid ${gameColors.accentGreen}30`,
    textShadow: `0 0 8px ${gameColors.brightGreen}60`,
  },
  attributeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 1,
    p: 0.75,
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}20`,
    borderRadius: '4px',
    transition: 'all 0.2s',
    '&:hover': {
      background: `${gameColors.darkGreen}60`,
      borderColor: `${gameColors.accentGreen}40`,
    },
    '&:last-child': {
      mb: 0,
    },
  },
  attributeIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '4px',
  },
  attributeInfo: {
    flex: 1,
  },
  attributeName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  attributeLevel: {
    fontSize: '11px',
    color: '#bbb',
    mt: 0.25,
  },
  attributeControls: {
    display: 'flex',
    gap: 0.5,
    alignItems: 'center',
  },
  statButton: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    background: `${gameColors.mediumGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    color: '#fff',
    '&:hover': {
      background: gameColors.mediumGreen,
      borderColor: gameColors.accentGreen,
    },
    '&:disabled': {
      opacity: 0.3,
      cursor: 'not-allowed',
    },
  },
  statInput: {
    width: '40px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '2px',
  },
  statInputValue: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
  },
  attributeCost: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.yellow}40`,
    borderRadius: '3px',
    px: 0.75,
    py: 0.25,
  },
  costValue: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  abilitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1,
  },
  abilitySlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}60`,
    border: `2px solid ${gameColors.accentGreen}30`,
    borderRadius: '6px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
    p: 1.5,
    minHeight: '120px',
    '&:hover': {
      borderColor: gameColors.accentGreen,
      background: `${gameColors.darkGreen}80`,
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 12px ${gameColors.accentGreen}30`,
    },
  },
  abilityUnlocked: {
    opacity: 0.6,
    cursor: 'not-allowed',
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
      borderColor: `${gameColors.accentGreen}30`,
    },
  },
  abilitySelected: {
    borderColor: gameColors.brightGreen,
    background: `${gameColors.mediumGreen}60`,
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}40,
      inset 0 0 20px ${gameColors.brightGreen}10
    `,
  },
  abilityName: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mt: 0.5,
  },
  abilityDescription: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
    lineHeight: '12px',
    letterSpacing: '0.3px',
    mb: 0.5,
  },
  abilityCost: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.25,
    background: `${gameColors.darkGreen}80`,
    borderRadius: '3px',
    px: 0.5,
    py: 0.25,
  },
  abilityCostText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  abilityCheck: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: gameColors.brightGreen,
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: `0 0 8px ${gameColors.brightGreen}`,
  },
  vitalityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    p: 0.75,
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}20`,
    borderRadius: '4px',
  },
  vitalityIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '4px',
  },
  vitalityInfo: {
    flex: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    p: 2,
    pt: 1.5,
    borderTop: `2px solid ${gameColors.accentGreen}30`,
    background: `linear-gradient(0deg, ${gameColors.darkGreen}40, transparent)`,
  },
  totalCost: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  totalCostItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    px: 1.5,
    py: 0.75,
  },
  totalCostText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  totalCostError: {
    color: gameColors.red,
  },
  applyButton: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}60, ${gameColors.darkGreen}80)`,
    border: `2px solid ${gameColors.accentGreen}60`,
    color: '#999',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    px: 4,
    py: 1,
    borderRadius: '4px',
    transition: 'all 0.3s',
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.mediumGreen}80, ${gameColors.darkGreen})`,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  applyButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen}, ${gameColors.accentGreen})`,
    border: `2px solid ${gameColors.brightGreen}`,
    color: '#000',
    boxShadow: `
      0 0 30px ${gameColors.brightGreen}60,
      0 4px 12px rgba(0, 0, 0, 0.6)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.lightGreen}, ${gameColors.brightGreen})`,
      boxShadow: `
        0 0 40px ${gameColors.brightGreen}80,
        0 6px 16px rgba(0, 0, 0, 0.8)
      `,
      transform: 'translateY(-2px)',
    },
  },
};

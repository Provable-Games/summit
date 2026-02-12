import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/kill-token.png';
import { useGameDirector } from '@/contexts/GameDirector';
import { useController } from '@/contexts/controller';
import { fetchBeastImage, getLuckCritChancePercent, getSpiritRevivalReductionSeconds } from '@/utils/beasts';
import { gameColors } from '@/utils/themes';
import AddIcon from '@mui/icons-material/Add';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import { Box, Button, Dialog, IconButton, InputBase, Slider, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

const UPGRADE_COSTS = {
  luck_per_level: 1,
  spirit_per_level: 1,
  diplomacy: 15,
  specials: 10,
  wisdom: 20,
  health_per_point: 1,
};

const MAX_ATTRIBUTES = 100;

interface BeastUpgradeModalProps {
  open: boolean;
  beast: any;
  close: () => void;
}

function BeastUpgradeModal(props: BeastUpgradeModalProps) {
  const { open, close, beast } = props;
  const { executeGameAction, actionFailed } = useGameDirector();
  const { tokenBalances } = useController();

  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [luckUpgrade, setLuckUpgrade] = useState(0);
  const [spiritUpgrade, setSpiritUpgrade] = useState(0);
  const [diplomacySelected, setDiplomacySelected] = useState(false);
  const [specialsSelected, setSpecialsSelected] = useState(false);
  const [wisdomSelected, setWisdomSelected] = useState(false);
  const [bonusHealthUpgrade, setBonusHealthUpgrade] = useState(0);

  const killTokens = tokenBalances["SKULL"] || 0;
  const corpseTokens = tokenBalances["CORPSE"] || 0;
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

    if (diplomacySelected && !currentBeast?.diplomacy) {
      killTokenCost += UPGRADE_COSTS.diplomacy;
    }
    if (specialsSelected && !currentBeast?.specials) {
      killTokenCost += UPGRADE_COSTS.specials;
    }
    if (wisdomSelected && !currentBeast?.wisdom) {
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
  const remainingKillTokens = killTokens - killTokenCost;
  const remainingCorpseTokens = corpseTokens - corpseTokenCost;
  const insufficientKill = remainingKillTokens < 0;
  const insufficientCorpse = remainingCorpseTokens < 0;

  const handleUpgrade = async () => {
    if (!canAfford || !hasAnyUpgrade) return;

    setUpgradeInProgress(true);

    try {
      const newStats = {
        spirit: spiritUpgrade,
        luck: luckUpgrade,
        specials: specialsSelected,
        wisdom: wisdomSelected,
        diplomacy: diplomacySelected,
      };

      const result = await executeGameAction({
        type: 'upgrade_beast',
        beastId: currentBeast.token_id,
        stats: newStats,
        bonusHealth: bonusHealthUpgrade,
        killTokens: killTokenCost,
        corpseTokens: corpseTokenCost,
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
    const currentValue = stat === 'luck' ? currentBeast.luck || 0 : currentBeast.spirit || 0;
    const currentUpgrade = stat === 'luck' ? luckUpgrade : spiritUpgrade;
    const setter = stat === 'luck' ? setLuckUpgrade : setSpiritUpgrade;

    const newValue = Math.max(0, Math.min(MAX_ATTRIBUTES - currentValue, currentUpgrade + delta));
    setter(newValue);
  };

  if (!currentBeast) {
    return null;
  }

  const currentLuck = currentBeast.luck || 0;
  const currentSpirit = currentBeast.spirit || 0;

  const formatShortDuration = (seconds: number): string => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remS = s % 60;
    if (h > 0) {
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    if (m > 0) {
      return `${m}m${remS > 0 ? ` ${remS}s` : ''}`;
    }
    return `${remS}s`;
  };

  const currentLuckCrit = getLuckCritChancePercent(currentLuck);
  const nextLuckCrit = getLuckCritChancePercent(currentLuck + luckUpgrade);
  const currentSpiritReductionSec = getSpiritRevivalReductionSeconds(currentSpirit);
  const nextSpiritReductionSec = getSpiritRevivalReductionSeconds(currentSpirit + spiritUpgrade);

  const MAX_BONUS_HEALTH = 2000;
  const currentBonusHealth = currentBeast.bonus_health || 0;
  const maxBonusAdd = Math.max(0, MAX_BONUS_HEALTH - currentBonusHealth);

  const onLuckInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const max = Math.max(0, MAX_ATTRIBUTES - currentLuck);
    setLuckUpgrade(Math.max(0, Math.min(max, isNaN(num) ? 0 : num)));
  };

  const onSpiritInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const max = Math.max(0, MAX_ATTRIBUTES - currentSpirit);
    setSpiritUpgrade(Math.max(0, Math.min(max, isNaN(num) ? 0 : num)));
  };

  const onBonusHealthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const maxAdd = maxBonusAdd;
    setBonusHealthUpgrade(Math.max(0, Math.min(maxAdd, isNaN(num) ? 0 : num)));
  };

  const formatNumber = (n: number) => {
    try {
      return n.toLocaleString();
    } catch {
      return `${n}`;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth={false}
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
            `,
            width: { xs: '95vw', sm: '90vw', md: '85vw', lg: 900 },
            maxWidth: 900,
            height: { xs: '95vh', sm: '90vh', md: '85vh' },
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
          <Typography sx={styles.title}>UPGRADE BEAST</Typography>
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
                style={{ width: '90%', height: '90%', objectFit: 'contain' }}
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
                <Box display={'flex'} alignItems={'center'}>
                  <FlashOnIcon sx={{ fontSize: '14px', color: gameColors.yellow }} />
                  <Typography sx={styles.statValue}>
                    {currentBeast.power}
                  </Typography>
                </Box>
              </Box>
              <Box sx={styles.statRow}>
                <Typography sx={styles.statLabel}>Health</Typography>
                <Box display={'flex'} alignItems={'center'} gap={'2px'}>
                  <FavoriteIcon sx={{ fontSize: '14px', color: gameColors.red }} />
                  <Typography sx={styles.statValue}>
                    {currentBeast.health}
                  </Typography>
                  {(currentBeast.bonus_health || 0) > 0 && (
                    <span style={{ color: '#4ade80', marginLeft: '4px' }}>
                      +{currentBeast.bonus_health}
                    </span>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Resources */}
            <Typography sx={styles.resourceHeadline}>Tokens Remaining</Typography>
            <Box sx={styles.resources}>
              <Box sx={styles.resourceItem}>
                <img src={killTokenImg} alt="SKULL" style={{ width: '32px', height: '32px' }} />
                <Box sx={styles.resourceTexts}>
                  <Typography sx={styles.resourceLabel}>Kill</Typography>
                  <Box sx={styles.resourceRow}>
                    <Typography sx={[styles.resourceValue, insufficientKill && styles.resourceInsufficient]}>
                      {formatNumber(remainingKillTokens)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={styles.resourceItem}>
                <img src={corpseTokenImg} alt="Corpse" style={{ width: '32px', height: '32px' }} />
                <Box sx={styles.resourceTexts}>
                  <Typography sx={styles.resourceLabel}>Corpse</Typography>
                  <Box sx={styles.resourceRow}>
                    <Typography sx={[styles.resourceValue, insufficientCorpse && styles.resourceInsufficient]}>
                      {formatNumber(remainingCorpseTokens)}
                    </Typography>
                  </Box>
                </Box>
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
                  <CasinoIcon sx={{ fontSize: '24px', color: '#ff69b4' }} />
                </Box>
                <Box sx={styles.attributeInfo}>
                  <Typography sx={styles.attributeName}>Luck</Typography>
                  <Typography sx={styles.attributeLevel}>
                    {currentLuck}
                    {luckUpgrade > 0 && <span style={{ color: '#4ade80' }}> → {currentLuck + luckUpgrade}</span>}
                    <span style={{ color: '#bbb' }}> / {MAX_ATTRIBUTES}</span>
                  </Typography>
                  <Typography sx={styles.attributeEffect}>
                    Critical hit chance: {currentLuckCrit}%
                    {luckUpgrade > 0 && (
                      <span style={{ color: '#4ade80' }}>
                        {' '}→ {nextLuckCrit}% (+{Math.max(0, nextLuckCrit - currentLuckCrit)}%)
                      </span>
                    )}
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
                    <InputBase
                      value={luckUpgrade}
                      onChange={onLuckInputChange}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: { textAlign: 'center' }
                      }}
                      sx={styles.statInputField}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('luck', 1)}
                    disabled={currentLuck + luckUpgrade >= MAX_ATTRIBUTES}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={styles.attributeRow}>
                <Box sx={styles.attributeIcon}>
                  <EnergyIcon sx={{ fontSize: '24px', color: '#00ffff' }} />
                </Box>
                <Box sx={styles.attributeInfo}>
                  <Typography sx={styles.attributeName}>Spirit</Typography>
                  <Typography sx={styles.attributeLevel}>
                    {currentSpirit}
                    {spiritUpgrade > 0 && <span style={{ color: '#4ade80' }}> → {currentSpirit + spiritUpgrade}</span>}
                    <span style={{ color: '#bbb' }}> / {MAX_ATTRIBUTES}</span>
                  </Typography>
                  <Typography sx={styles.attributeEffect}>
                    Revival time reduction: {formatShortDuration(currentSpiritReductionSec)}
                    {spiritUpgrade > 0 && (
                      <span style={{ color: '#4ade80' }}>
                        {' '}→ {formatShortDuration(nextSpiritReductionSec)} (+{formatShortDuration(Math.max(0, nextSpiritReductionSec - currentSpiritReductionSec))})
                      </span>
                    )}
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
                    <InputBase
                      value={spiritUpgrade}
                      onChange={onSpiritInputChange}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: { textAlign: 'center' }
                      }}
                      sx={styles.statInputField}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => adjustStat('spirit', 1)}
                    disabled={currentSpirit + spiritUpgrade >= MAX_ATTRIBUTES}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Abilities */}
            <Box sx={styles.section}>
              <Typography sx={styles.sectionTitle}>ABILITIES</Typography>

              <Box sx={styles.abilitiesGrid}>
                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.specials && styles.abilityUnlocked,
                    !currentBeast.specials && specialsSelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.specials && setSpecialsSelected(!specialsSelected)}
                >
                  <Box sx={styles.abilityIconHolder}>
                    <StarIcon sx={{ fontSize: '28px', color: '#ffd700' }} />
                  </Box>
                  <Typography sx={styles.abilityName}>Specials</Typography>
                  <Typography sx={[styles.abilityDescription, styles.abilityDescriptionArea]}>
                    Unlocks name match bonus damage
                  </Typography>
                  {currentBeast.specials ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '20px', height: '20px' }} />
                      <Typography sx={styles.abilityCostText}>{UPGRADE_COSTS.specials}</Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.diplomacy && styles.abilityUnlocked,
                    !currentBeast.diplomacy && diplomacySelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.diplomacy && setDiplomacySelected(!diplomacySelected)}
                >
                  <Box sx={styles.abilityIconHolder}>
                    <HandshakeIcon sx={{ fontSize: '28px', color: '#a78bfa' }} />
                  </Box>
                  <Typography sx={styles.abilityName}>Diplomacy</Typography>
                  <Typography sx={[styles.abilityDescription, styles.abilityDescriptionArea]}>
                    Empower and share rewards of other "{currentBeast.prefix} {currentBeast.suffix}" beasts.
                  </Typography>
                  {currentBeast.diplomacy ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '20px', height: '20px' }} />
                      <Typography sx={styles.abilityCostText}>{UPGRADE_COSTS.diplomacy}</Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={[
                    styles.abilitySlot,
                    currentBeast.wisdom && styles.abilityUnlocked,
                    !currentBeast.wisdom && wisdomSelected && styles.abilitySelected,
                  ]}
                  onClick={() => !currentBeast.wisdom && setWisdomSelected(!wisdomSelected)}
                >
                  <Box sx={styles.abilityIconHolder}>
                    <PsychologyIcon sx={{ fontSize: '28px', color: '#60a5fa' }} />
                  </Box>
                  <Typography sx={styles.abilityName}>Wisdom</Typography>
                  <Typography sx={[styles.abilityDescription, styles.abilityDescriptionArea]}>
                    Gain XP when successfully defending attacks on the Summit.
                  </Typography>
                  {currentBeast.wisdom ? (
                    <Box sx={styles.abilityCheck}>✓</Box>
                  ) : (
                    <Box sx={styles.abilityCost}>
                      <img src={killTokenImg} alt="" style={{ width: '20px', height: '20px' }} />
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
                  <FavoriteIcon sx={{ fontSize: '24px', color: gameColors.red }} />
                </Box>
                <Box sx={styles.vitalityInfo}>
                  <Typography sx={styles.attributeName}>Bonus Health</Typography>
                  <Typography sx={styles.attributeLevel}>
                    {currentBeast.bonus_health || 0}
                    {bonusHealthUpgrade > 0 && (
                      <span style={{ color: '#4ade80' }}> → +{(currentBeast.bonus_health || 0) + bonusHealthUpgrade}</span>
                    )}
                    <span style={{ color: '#bbb' }}> / {MAX_BONUS_HEALTH}</span>
                  </Typography>
                  <Slider
                    value={bonusHealthUpgrade}
                    min={0}
                    max={maxBonusAdd}
                    step={10}
                    onChange={(_, value) => {
                      if (typeof value === 'number') {
                        setBonusHealthUpgrade(value);
                      }
                    }}
                    sx={{
                      ml: 1,
                      color: '#58b000',
                      width: 'calc(100% - 20px)',
                      '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                      },
                    }}
                  />
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
                    <InputBase
                      value={bonusHealthUpgrade}
                      onChange={onBonusHealthInputChange}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: { textAlign: 'center' }
                      }}
                      sx={styles.statInputField}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const maxAdd = maxBonusAdd;
                      setBonusHealthUpgrade(Math.min(maxAdd, bonusHealthUpgrade + 10))
                    }}
                    sx={styles.statButton}
                  >
                    <AddIcon sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          {hasAnyUpgrade && (killTokenCost > 0 || corpseTokenCost > 0) && (
            <Box sx={styles.tokenSummary}>
              <Typography sx={styles.tokenSummaryLabel}>You are about to spend</Typography>
              {killTokenCost > 0 && (
                <Box sx={styles.tokenCard}>
                  <Box sx={styles.tokenIcon}>
                    <img src={killTokenImg} alt="SKULL" style={{ width: '24px', height: '24px' }} />
                  </Box>
                  <Typography sx={styles.tokenUseValue}>{killTokenCost}</Typography>
                </Box>
              )}
              {corpseTokenCost > 0 && (
                <Box sx={styles.tokenCard}>
                  <Box sx={styles.tokenIcon}>
                    <img src={corpseTokenImg} alt="Corpse" style={{ width: '24px', height: '24px' }} />
                  </Box>
                  <Typography sx={styles.tokenUseValue}>{corpseTokenCost}</Typography>
                </Box>
              )}
            </Box>
          )}

          <Button
            disabled={upgradeInProgress || !hasAnyUpgrade || !canAfford}
            onClick={handleUpgrade}
            sx={[
              styles.applyButton,
              hasAnyUpgrade && canAfford && styles.applyButtonActive,
              { ml: 'auto' }
            ]}
          >
            {upgradeInProgress ? (
              <Box display={'flex'} alignItems={'baseline'} gap={1}>
                <Typography sx={styles.applyButtonText}>APPLYING</Typography>
                <div className='dotLoader white' />
              </Box>
            ) : !canAfford ? (
              <Typography sx={styles.applyButtonText}>INSUFFICIENT Tokens</Typography>
            ) : !hasAnyUpgrade ? (
              <Typography sx={styles.applyButtonText}>SELECT UPGRADES</Typography>
            ) : (
              <Typography sx={styles.applyButtonText}>APPLY UPGRADES</Typography>
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
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
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
    fontSize: '24px',
    lineHeight: '24px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1.5px',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  divider: {
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColors.yellow}, transparent)`,
    mt: 1,
  },
  content: {
    display: 'flex',
    gap: 2,
    p: { xs: 1.5, sm: 2 },
    pt: 1,
    flexDirection: { xs: 'column', md: 'row' },
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch',
    alignItems: { xs: 'stretch', md: 'flex-start' },
    minHeight: 0,
    '&::-webkit-scrollbar': {
      width: { xs: 0, sm: '6px' },
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 3,
    },
  },
  leftPanel: {
    width: { xs: '100%', md: '240px' },
    minWidth: { md: '240px' },
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  },
  beastPortrait: {
    position: 'relative',
    width: '200px',
    height: '200px',
    background: `#000`,
    border: `2px solid ${gameColors.accentGreen}60`,
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
    boxSizing: 'border-box',
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
  },
  resourceHeadline: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    mt: 1,
  },
  resourceItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    p: 0.75,
    justifyContent: 'flex-start',
  },
  resourceValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  resourceTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  resourceLabel: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    lineHeight: '10px',
  },
  resourceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 0.5,
  },
  resourceSub: {
    fontSize: '11px',
    color: '#9aa',
  },
  resourceRemaining: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  resourceInsufficient: {
    color: gameColors.red,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  section: {
    px: 1.5,
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    mb: 1,
    pb: 0.5,
    borderBottom: `1px solid ${gameColors.accentGreen}30`,
  },
  attributeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
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
    fontSize: '12px',
    color: '#bbb',
  },
  attributeEffect: {
    fontSize: '12px',
    color: '#9aa',
  },
  attributeControls: {
    display: 'flex',
    gap: 0.5,
    alignItems: 'center',
  },
  statButton: {
    width: { xs: '44px', sm: '32px' },
    height: { xs: '44px', sm: '32px' },
    minWidth: { xs: '44px', sm: '32px' },
    background: `${gameColors.mediumGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    color: '#fff',
    '& svg': {
      fontSize: { xs: '20px', sm: '16px' },
    },
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
  statInputField: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    px: 0.5,
    '& input': {
      textAlign: 'center',
      padding: 0,
    }
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
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
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
  abilityIconHolder: {
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    '&:hover': {
      borderColor: gameColors.brightGreen,
      background: `${gameColors.mediumGreen}60`,
      boxShadow: `
        0 0 20px ${gameColors.brightGreen}40,
        inset 0 0 20px ${gameColors.brightGreen}10
      `,
    },
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
  abilityDescriptionArea: {
    minHeight: '28px',
  },
  abilityCost: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 0.5,
    py: 0.25,
  },
  abilityCostLabel: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  abilityCostText: {
    fontSize: '13px',
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
  },
  vitalityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
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
  healthBar: {
    height: '10px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    mt: 0.5,
  },
  healthBarSegment: {
    height: '100%',
  },
  healthBarBase: {
    background: `${gameColors.red}AA`,
  },
  healthBarBonus: {
    background: '#58b000',
  },
  healthBarPlanned: {
    background: '#58b00099',
  },
  healthLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mt: 0.5,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  legendSwatch: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  legendText: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 2,
    p: 1,
    px: 2,
    borderTop: `2px solid ${gameColors.accentGreen}30`,
    background: `linear-gradient(0deg, ${gameColors.darkGreen}40, transparent)`,
  },
  totalCost: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  tokenSummary: {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
  },
  tokenCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}20`,
    borderRadius: '12px',
    padding: '2px 6px',
    minWidth: 'auto',
  },
  tokenSummaryLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
  },
  tokenCardError: {
    border: `1px solid ${gameColors.red}`,
    boxShadow: `0 0 8px ${gameColors.red}50`,
  },
  tokenIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  },
  tokenTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  tokenLabel: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    lineHeight: '10px',
  },
  tokenEquation: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    lineHeight: '14px',
  },
  tokenEquationValue: {
    color: '#fff',
  },
  tokenEquationOp: {
    color: '#bbb',
  },
  tokenUseValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
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
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    height: '48px',
    my: '6px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  applyButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}60,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      transform: 'translateY(-1px)',
    },
  },
  applyButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textWrap: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
};

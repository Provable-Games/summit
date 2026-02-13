import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/skull-token.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import { useController } from '@/contexts/controller';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import type { Beast, Stats } from '@/types/game';
import { gameColors } from '@/utils/themes';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StarIcon from '@mui/icons-material/Star';
import { Box, Button, Dialog, IconButton, InputBase, Typography } from '@mui/material';
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
const MAX_BONUS_HEALTH = 2000;

interface SummitGiftModalProps {
  open: boolean;
  beast: Beast;
  ownerName: string | null;
  isSavage: boolean;
  close: () => void;
}

function SummitGiftModal(props: SummitGiftModalProps) {
  const { open, close, beast, ownerName, isSavage } = props;
  const { tokenBalances, setTokenBalances } = useController();
  const { executeAction, feed, applyStatPoints, addExtraLife } = useSystemCalls();

  const [giftInProgress, setGiftInProgress] = useState(false);
  const [luckGift, setLuckGift] = useState(0);
  const [spiritGift, setSpiritGift] = useState(0);
  const [diplomacyGift, setDiplomacyGift] = useState(false);
  const [specialsGift, setSpecialsGift] = useState(false);
  const [wisdomGift, setWisdomGift] = useState(false);
  const [bonusHealthGift, setBonusHealthGift] = useState(0);
  const [extraLivesGift, setExtraLivesGift] = useState(0);

  const killTokens = tokenBalances["SKULL"] || 0;
  const corpseTokens = tokenBalances["CORPSE"] || 0;
  const extraLifeTokens = tokenBalances["EXTRA LIFE"] || 0;

  useEffect(() => {
    if (open) {
      setGiftInProgress(false);
      setLuckGift(0);
      setSpiritGift(0);
      setDiplomacyGift(false);
      setSpecialsGift(false);
      setWisdomGift(false);
      setBonusHealthGift(0);
      setExtraLivesGift(0);
    }
  }, [open, beast?.token_id]);

  if (!beast) {
    return null;
  }

  const calculateUpgradeCosts = () => {
    let killTokenCost = 0;
    let corpseTokenCost = 0;

    killTokenCost += luckGift * UPGRADE_COSTS.luck_per_level;
    killTokenCost += spiritGift * UPGRADE_COSTS.spirit_per_level;

    if (diplomacyGift && !beast.diplomacy) {
      killTokenCost += UPGRADE_COSTS.diplomacy;
    }
    if (specialsGift && !beast.specials) {
      killTokenCost += UPGRADE_COSTS.specials;
    }
    if (wisdomGift && !beast.wisdom) {
      killTokenCost += UPGRADE_COSTS.wisdom;
    }

    corpseTokenCost += bonusHealthGift * UPGRADE_COSTS.health_per_point;

    return { killTokenCost, corpseTokenCost };
  };

  const { killTokenCost, corpseTokenCost } = calculateUpgradeCosts();

  const hasAnyUpgrade =
    luckGift > 0 ||
    spiritGift > 0 ||
    diplomacyGift ||
    specialsGift ||
    wisdomGift ||
    bonusHealthGift > 0;

  const hasAnyExtraLife = extraLivesGift > 0;

  const canAffordUpgrades =
    killTokenCost <= killTokens && corpseTokenCost <= corpseTokens;

  const canAffordExtraLife = extraLivesGift <= extraLifeTokens;

  const canSendGift =
    (hasAnyUpgrade && canAffordUpgrades) || (hasAnyExtraLife && canAffordExtraLife);

  const onLuckInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const max = Math.max(0, MAX_ATTRIBUTES - (beast.luck || 0));
    setLuckGift(Math.max(0, Math.min(max, isNaN(num) ? 0 : num)));
  };

  const onSpiritInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const max = Math.max(0, MAX_ATTRIBUTES - (beast.spirit || 0));
    setSpiritGift(Math.max(0, Math.min(max, isNaN(num) ? 0 : num)));
  };

  const onBonusHealthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const currentBonus = beast.bonus_health || 0;
    const maxAdd = Math.max(0, MAX_BONUS_HEALTH - currentBonus);
    setBonusHealthGift(Math.max(0, Math.min(maxAdd, isNaN(num) ? 0 : num)));
  };

  const onExtraLivesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const remainingCap = Math.max(0, 4000 - (beast.extra_lives || 0));
    const max = Math.max(0, Math.min(extraLifeTokens, remainingCap));
    setExtraLivesGift(Math.max(0, Math.min(max, isNaN(num) ? 0 : num)));
  };

  const handleSendGift = async () => {
    if (!canSendGift || giftInProgress) return;

    setGiftInProgress(true);
    try {
      const calls: Parameters<typeof executeAction>[0] = [];

      // Bonus health (CORPSE)
      if (bonusHealthGift > 0 && corpseTokenCost > 0) {
        calls.push(...feed(beast.token_id, bonusHealthGift, corpseTokenCost));
      }

      // Stat upgrades (SKULL)
      if (killTokenCost > 0) {
        const statsDelta: Stats = {
          spirit: spiritGift,
          luck: luckGift,
          specials: !beast.specials && specialsGift,
          wisdom: !beast.wisdom && wisdomGift,
          diplomacy: !beast.diplomacy && diplomacyGift,
        };

        calls.push(...applyStatPoints(beast.token_id, statsDelta, killTokenCost));
      }

      // Extra lives (EXTRA LIFE)
      if (extraLivesGift > 0) {
        calls.push(...addExtraLife(beast.token_id, extraLivesGift));
      }

      if (calls.length === 0) {
        setGiftInProgress(false);
        return;
      }

      const result = await executeAction(calls, () => {
        setGiftInProgress(false);
      });

      if (result) {
        // Optimistically update local token balances using functional update to avoid stale closure
        setTokenBalances((prev: Record<string, number>) => ({
          ...prev,
          SKULL: (prev["SKULL"] || 0) - killTokenCost,
          CORPSE: (prev["CORPSE"] || 0) - corpseTokenCost,
          'EXTRA LIFE': (prev["EXTRA LIFE"] || 0) - extraLivesGift,
        }));

        close();
      }
    } catch (error) {
      console.error('Failed to send gift', error);
    } finally {
      setGiftInProgress(false);
    }
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
            width: '560px',
            maxWidth: '95vw',
            position: 'relative',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          },
        },
      }}
    >
      <Box sx={styles.container}>
        {/* Close Button */}
        <IconButton onClick={close} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        {/* Header */}
        <Box sx={styles.header}>
          <Box sx={styles.headerIconRow}>
            <CardGiftcardIcon sx={styles.headerIcon} />
            <Typography sx={styles.title}>GIFT SUMMIT BEAST</Typography>
          </Box>
          <Box sx={styles.divider} />

          <Box sx={styles.warningBox}>
            <Typography sx={styles.warningTitle}>
              {isSavage
                ? 'This is your own beast'
                : "You are gifting to another player's beast"}
            </Typography>
            {!isSavage && (
              <Typography sx={styles.warningText}>
                Your tokens will upgrade a beast owned by{' '}
                <span style={{ color: gameColors.yellow, fontWeight: 'bold' }}>
                  {ownerName || 'Unknown'}
                </span>
                . These upgrades do not apply to your own beasts.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={styles.content}>
          {/* Token summary */}
          <Box sx={styles.tokenRow}>
            <Box sx={styles.tokenCard}>
              <img
                src={killTokenImg}
                alt="SKULL"
                style={{ width: '28px', height: '28px' }}
              />
              <Box sx={styles.tokenTexts}>
                <Typography sx={styles.tokenLabel}>Skull</Typography>
                <Typography sx={styles.tokenBalance}>
                  {formatNumber(killTokens)}
                </Typography>
              </Box>
            </Box>
            <Box sx={styles.tokenCard}>
              <img
                src={corpseTokenImg}
                alt="CORPSE"
                style={{ width: '28px', height: '28px' }}
              />
              <Box sx={styles.tokenTexts}>
                <Typography sx={styles.tokenLabel}>Corpse</Typography>
                <Typography sx={styles.tokenBalance}>
                  {formatNumber(corpseTokens)}
                </Typography>
              </Box>
            </Box>
            <Box sx={styles.tokenCard}>
              <img
                src={lifePotionImg}
                alt="EXTRA LIFE"
                style={{ width: '28px', height: '28px' }}
              />
              <Box sx={styles.tokenTexts}>
                <Typography sx={styles.tokenLabel}>Extra Life</Typography>
                <Typography sx={styles.tokenBalance}>
                  {formatNumber(extraLifeTokens)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Simple stat gifts */}
          <Box sx={styles.section}>
            <Typography sx={styles.sectionTitle}>Gift Attribute</Typography>

            <Box sx={styles.row}>
              <Box sx={styles.iconColumn}>
                <CasinoIcon sx={{ fontSize: 20, color: '#ff69b4' }} />
              </Box>
              <Box sx={styles.mainColumn}>
                <Typography sx={styles.fieldLabel}>Luck</Typography>
                <Typography sx={styles.fieldHint}>
                  Current: {beast.luck ?? 0} / {MAX_ATTRIBUTES}
                </Typography>
              </Box>
              <Box sx={styles.inputColumn}>
                <Box sx={styles.inputShell}>
                  <InputBase
                    value={luckGift}
                    onChange={onLuckInputChange}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      style: { textAlign: 'center' },
                    }}
                    sx={styles.inputField}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={styles.row}>
              <Box sx={styles.iconColumn}>
                <EnergyIcon sx={{ fontSize: 20, color: '#00ffff' }} />
              </Box>
              <Box sx={styles.mainColumn}>
                <Typography sx={styles.fieldLabel}>Spirit</Typography>
                <Typography sx={styles.fieldHint}>
                  Current: {beast.spirit ?? 0} / {MAX_ATTRIBUTES}
                </Typography>
              </Box>
              <Box sx={styles.inputColumn}>
                <Box sx={styles.inputShell}>
                  <InputBase
                    value={spiritGift}
                    onChange={onSpiritInputChange}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      style: { textAlign: 'center' },
                    }}
                    sx={styles.inputField}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={styles.row}>
              <Box sx={styles.iconColumn}>
                <FavoriteIcon sx={{ fontSize: 20, color: gameColors.red }} />
              </Box>
              <Box sx={styles.mainColumn}>
                <Typography sx={styles.fieldLabel}>Bonus Health</Typography>
                <Typography sx={styles.fieldHint}>
                  Current bonus: {beast.bonus_health || 0} / {MAX_BONUS_HEALTH}
                </Typography>
              </Box>
              <Box sx={styles.inputColumn}>
                <Box sx={styles.inputShell}>
                  <InputBase
                    value={bonusHealthGift}
                    onChange={onBonusHealthInputChange}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      style: { textAlign: 'center' },
                    }}
                    sx={styles.inputField}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Ability gifts */}
          <Box sx={styles.section}>
            <Typography sx={styles.sectionTitle}>Gift Ability</Typography>
            <Box sx={styles.abilityRow}>
              <Box
                sx={{
                  ...styles.abilityCard,
                  ...(beast.specials ? styles.abilityUnlocked : {}),
                  ...(!beast.specials && specialsGift ? styles.abilitySelected : {}),
                }}
                onClick={() => {
                  if (beast.specials) return;
                  setSpecialsGift(!specialsGift);
                }}
              >
                <StarIcon sx={{ fontSize: 24, color: '#ffd700' }} />
                <Typography sx={styles.abilityLabel}>Specials</Typography>
              </Box>

              <Box
                sx={{
                  ...styles.abilityCard,
                  ...(beast.diplomacy ? styles.abilityUnlocked : {}),
                  ...(!beast.diplomacy && diplomacyGift ? styles.abilitySelected : {}),
                }}
                onClick={() => {
                  if (beast.diplomacy) return;
                  setDiplomacyGift(!diplomacyGift);
                }}
              >
                <HandshakeIcon sx={{ fontSize: 24, color: '#a78bfa' }} />
                <Typography sx={styles.abilityLabel}>Diplomacy</Typography>
              </Box>

              <Box
                sx={{
                  ...styles.abilityCard,
                  ...(beast.wisdom ? styles.abilityUnlocked : {}),
                  ...(!beast.wisdom && wisdomGift ? styles.abilitySelected : {}),
                }}
                onClick={() => {
                  if (beast.wisdom) return;
                  setWisdomGift(!wisdomGift);
                }}
              >
                <PsychologyIcon sx={{ fontSize: 24, color: '#60a5fa' }} />
                <Typography sx={styles.abilityLabel}>Wisdom</Typography>
              </Box>
            </Box>
          </Box>

          {/* Extra life gifts */}
          <Box sx={styles.section}>
            <Typography sx={styles.sectionTitle}>Gift Extra Life</Typography>
            <Box sx={styles.row}>
              <Box sx={styles.iconColumn}>
                <img
                  src={lifePotionImg}
                  alt="Extra Life Potion"
                  style={{ width: 22, height: 22 }}
                />
              </Box>
              <Box sx={styles.mainColumn}>
                <Typography sx={styles.fieldLabel}>Extra Lives</Typography>
                <Typography sx={styles.fieldHint}>
                  Current: {beast.extra_lives || 0}
                </Typography>
              </Box>
              <Box sx={styles.inputColumn}>
                <Box sx={styles.inputShell}>
                  <InputBase
                    value={extraLivesGift}
                    onChange={onExtraLivesInputChange}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      style: { textAlign: 'center' },
                    }}
                    sx={styles.inputField}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          {(hasAnyUpgrade || hasAnyExtraLife) && (
            <Box sx={styles.summaryRow}>
              {(hasAnyUpgrade || hasAnyExtraLife) && (
                <Box sx={styles.tokenSummary}>
                  {hasAnyUpgrade && killTokenCost > 0 && (
                    <Box sx={styles.tokenCardSmall}>
                      <Box sx={styles.tokenIcon}>
                        <img src={killTokenImg} alt="SKULL" style={{ width: '22px', height: '22px' }} />
                      </Box>
                      <Typography sx={styles.tokenUseValue}>{killTokenCost}</Typography>
                    </Box>
                  )}
                  {hasAnyUpgrade && corpseTokenCost > 0 && (
                    <Box sx={styles.tokenCardSmall}>
                      <Box sx={styles.tokenIcon}>
                        <img src={corpseTokenImg} alt="CORPSE" style={{ width: '22px', height: '22px' }} />
                      </Box>
                      <Typography sx={styles.tokenUseValue}>{corpseTokenCost}</Typography>
                    </Box>
                  )}
                  {hasAnyExtraLife && extraLivesGift > 0 && (
                    <Box sx={styles.tokenCardSmall}>
                      <Box sx={styles.tokenIcon}>
                        <img src={lifePotionImg} alt="EXTRA LIFE" style={{ width: '22px', height: '22px' }} />
                      </Box>
                      <Typography sx={styles.tokenUseValue}>{extraLivesGift}</Typography>
                    </Box>
                  )}
                </Box>
              )}
              {((hasAnyUpgrade && !canAffordUpgrades) || (hasAnyExtraLife && !canAffordExtraLife)) && (
                <Typography sx={styles.summaryWarning}>
                  Not enough tokens to cover this gift.
                </Typography>
              )}
            </Box>
          )}

          <Button
            disabled={!canSendGift || giftInProgress}
            onClick={handleSendGift}
            sx={[
              styles.sendButton,
              canSendGift && styles.sendButtonActive,
              { ml: 'auto' },
            ]}
          >
            {giftInProgress ? (
              <Box display={'flex'} alignItems={'baseline'} gap={1}>
                <Typography sx={styles.sendButtonText}>SENDING GIFT</Typography>
                <div className='dotLoader white' />
              </Box>
            ) : !canSendGift ? (
              <Typography sx={styles.sendButtonText}>SELECT A GIFT</Typography>
            ) : (
              <Typography sx={styles.sendButtonText}>SEND GIFT</Typography>
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

export default SummitGiftModal;

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
  headerIconRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    mb: 0.5,
  },
  headerIcon: {
    fontSize: '24px',
    color: gameColors.yellow,
  },
  title: {
    fontSize: '20px',
    lineHeight: '20px',
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
  warningBox: {
    mt: 1.5,
    p: 1,
    borderRadius: '8px',
    border: `1px solid ${gameColors.red}`,
    background: `${gameColors.darkGreen}80`,
  },
  warningTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.red,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 0.5,
  },
  warningText: {
    fontSize: '12px',
    color: '#ffedbb',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1.5,
    p: 2,
    pt: 1,
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  tokenRow: {
    display: 'flex',
    gap: 1,
    justifyContent: 'space-between',
  },
  tokenCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    p: 0.75,
  },
  tokenTexts: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0.25,
  },
  tokenLabel: {
    fontSize: '11px',
    color: '#bbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tokenBalance: {
    fontSize: '13px',
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    mb: 0.75,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 0.75,
    background: `${gameColors.darkGreen}40`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}20`,
    p: 0.75,
  },
  iconColumn: {
    width: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  inputColumn: {
    width: '70px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  fieldHint: {
    fontSize: '11px',
    color: '#bbb',
  },
  inputShell: {
    width: '64px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  inputField: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    px: 0.5,
    '& input': {
      textAlign: 'center' as const,
      padding: 0,
    },
  },
  abilityRow: {
    display: 'flex',
    gap: 1,
    flexWrap: 'wrap' as const,
  },
  abilityCard: {
    flex: 1,
    minWidth: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    padding: '8px',
    borderRadius: '6px',
    background: `${gameColors.darkGreen}50`,
    border: `1px solid ${gameColors.accentGreen}30`,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      background: `${gameColors.darkGreen}70`,
      borderColor: `${gameColors.accentGreen}60`,
    },
  },
  abilityLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  abilityUnlocked: {
    opacity: 0.6,
    cursor: 'not-allowed',
    borderColor: `${gameColors.accentGreen}40`,
  },
  abilitySelected: {
    borderColor: gameColors.brightGreen,
    boxShadow: `0 0 10px ${gameColors.brightGreen}40`,
    background: `${gameColors.mediumGreen}60`,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    p: 1.5,
    px: 2,
    borderTop: `2px solid ${gameColors.accentGreen}30`,
    background: `linear-gradient(0deg, ${gameColors.darkGreen}40, transparent)`,
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0.25,
  },
  summaryText: {
  },
  summaryWarning: {
    fontSize: '11px',
    color: gameColors.red,
    fontWeight: 'bold',
  },
  sendButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    height: '42px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  sendButtonActive: {
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
  sendButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    textWrap: 'nowrap' as const,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  tokenSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap' as const,
  },
  tokenSummaryLabel: {
    fontSize: '11px',
    color: '#999',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  tokenCardSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '12px',
    padding: '2px 8px',
  },
  tokenIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenUseValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffedbb',
  },
};

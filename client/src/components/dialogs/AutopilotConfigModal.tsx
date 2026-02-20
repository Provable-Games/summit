import type {
  AttackStrategy,
  ExtraLifeStrategy,
  PoisonStrategy} from '@/stores/autopilotStore';
import {
  useAutopilotStore,
} from '@/stores/autopilotStore';
import { gameColors } from '@/utils/themes';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Dialog, Switch, TextField, Typography } from '@mui/material';
import { useController } from '@/contexts/controller';
import React from 'react';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import attackPotionIcon from '@/assets/images/attack-potion.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import poisonPotionIcon from '@/assets/images/poison-potion.png';

interface AutopilotConfigModalProps {
  open: boolean;
  close: () => void;
}

const ATTACK_OPTIONS: { value: AttackStrategy; label: string; description: string }[] = [
  {
    value: 'never',
    label: 'Never',
    description: `Never attack the Summit.`,
  },
  {
    value: 'guaranteed',
    label: 'Careful',
    description: `Attack only when you have a good chance of taking the Summit.`,
  },
  {
    value: 'all_out',
    label: 'All out',
    description: 'Always attack the Summit with everything available.',
  },
];

const EXTRA_LIFE_OPTIONS: {
  value: ExtraLifeStrategy;
  label: string;
  description: string;
}[] = [
    {
      value: 'disabled',
      label: 'Never',
      description: `Never use Extra Life potions.`,
    },
    {
      value: 'after_capture',
      label: 'After capture',
      description: `Use Extra Life potions after you capture the Summit.`,
    },
    {
      value: 'aggressive',
      label: 'All out',
      description: `Keep replenishing Extra Lives when you hold the Summit.`,
    },
  ];

const POISON_OPTIONS: {
  value: PoisonStrategy;
  label: string;
  description: string;
}[] = [
    {
      value: 'disabled',
      label: 'Never',
      description: `Never use Poison.`,
    },
    {
      value: 'conservative',
      label: 'Conservative',
      description: `Only use Poison when Summit has more than X extra lives.`,
    },
    {
      value: 'aggressive',
      label: 'Aggressive',
      description: `Use poison every time Summit Changes.`,
    },
  ];

function AutopilotConfigModal(props: AutopilotConfigModalProps) {
  const { open, close } = props;

  const { tokenBalances } = useController();

  const {
    attackStrategy,
    setAttackStrategy,
    useRevivePotions,
    setUseRevivePotions,
    revivePotionMax,
    setRevivePotionMax,
    revivePotionMaxPerBeast,
    setRevivePotionMaxPerBeast,

    useAttackPotions,
    setUseAttackPotions,
    attackPotionMax,
    setAttackPotionMax,

    extraLifeStrategy,
    setExtraLifeStrategy,
    extraLifeMax,
    setExtraLifeMax,
    extraLifeTotalMax,
    setExtraLifeTotalMax,
    extraLifeReplenishTo,
    setExtraLifeReplenishTo,

    poisonStrategy,
    setPoisonStrategy,
    poisonTotalMax,
    setPoisonTotalMax,
    poisonConservativeExtraLivesTrigger,
    setPoisonConservativeExtraLivesTrigger,
    poisonConservativeAmount,
    setPoisonConservativeAmount,
    poisonAggressiveAmount,
    setPoisonAggressiveAmount,
    initializeMaxCapsFromBalances,
    resetToDefaults,
  } = useAutopilotStore();

  const handleResetToDefaults = () => {
    resetToDefaults();
    initializeMaxCapsFromBalances(tokenBalances);
  };

  const reviveAvailable = tokenBalances?.['REVIVE'] ?? 0;
  const attackAvailable = tokenBalances?.['ATTACK'] ?? 0;
  const extraLifeAvailable = tokenBalances?.['EXTRA LIFE'] ?? 0;
  const poisonAvailable = tokenBalances?.['POISON'] ?? 0;

  React.useEffect(() => {
    if (!open) return;
    initializeMaxCapsFromBalances(tokenBalances);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reviveAvailable, attackAvailable, extraLifeAvailable, poisonAvailable]);

  // If the user enables a poison strategy and has poison available, default "poison to apply" to 100
  // (unless they already set a non-zero value).
  React.useEffect(() => {
    if (!open) return;
    if (poisonStrategy === 'disabled') return;

    const balance = Number(poisonAvailable) || 0;
    if (balance <= 0) return;

    const nextDefault = Math.min(100, balance);
    if (poisonStrategy === 'aggressive') {
      if (poisonAggressiveAmount <= 0) setPoisonAggressiveAmount(nextDefault);
    } else {
      if (poisonConservativeAmount <= 0) setPoisonConservativeAmount(nextDefault);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poisonStrategy, poisonAvailable, poisonAggressiveAmount, poisonConservativeAmount]);

  // Default other strategy values when the user enables them (but don't overwrite if they've already changed them).
  React.useEffect(() => {
    if (!open) return;

    const extraLifeBalance = Number(extraLifeAvailable) || 0;
    const poisonBalance = Number(poisonAvailable) || 0;

    if (extraLifeStrategy === 'aggressive') {
      const maxAllowed = Math.min(4000, extraLifeBalance);
      const nextDefault = Math.min(500, maxAllowed);
      if (extraLifeReplenishTo <= 0 && maxAllowed > 0) setExtraLifeReplenishTo(Math.max(1, nextDefault));
    }

    if (extraLifeStrategy === 'after_capture') {
      const maxAllowed = Math.min(4000, extraLifeBalance);
      const nextDefault = Math.min(500, maxAllowed);
      if (extraLifeMax <= 0 && maxAllowed > 0) setExtraLifeMax(nextDefault);
    }

    if (poisonStrategy === 'conservative') {
      if (poisonConservativeExtraLivesTrigger <= 0) setPoisonConservativeExtraLivesTrigger(100);
      const nextDefault = Math.min(100, poisonBalance);
      if (poisonConservativeAmount <= 0 && poisonBalance > 0) setPoisonConservativeAmount(nextDefault);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    extraLifeStrategy,
    poisonStrategy,
    extraLifeAvailable,
    poisonAvailable,
    extraLifeReplenishTo,
    extraLifeMax,
    poisonConservativeExtraLivesTrigger,
    poisonConservativeAmount,
  ]);

  // Always clamp values that are limited by token balances so the UI never shows a number above what you own.
  React.useEffect(() => {
    if (!open) return;

    const extraLifeBalance = Math.min(4000, Number(extraLifeAvailable) || 0);
    if (extraLifeReplenishTo > extraLifeBalance) setExtraLifeReplenishTo(extraLifeBalance);
    if (extraLifeTotalMax > extraLifeBalance) setExtraLifeTotalMax(extraLifeBalance);
    if (extraLifeMax > extraLifeBalance) setExtraLifeMax(extraLifeBalance);

    const poisonBalance = Number(poisonAvailable) || 0;
    if (poisonAggressiveAmount > poisonBalance) setPoisonAggressiveAmount(poisonBalance);
    if (poisonConservativeAmount > poisonBalance) setPoisonConservativeAmount(poisonBalance);
    if (poisonTotalMax > poisonBalance) setPoisonTotalMax(poisonBalance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    extraLifeAvailable,
    poisonAvailable,
    extraLifeReplenishTo,
    extraLifeTotalMax,
    extraLifeMax,
    poisonAggressiveAmount,
    poisonConservativeAmount,
    poisonTotalMax,
  ]);

  const poisonAmount =
    poisonStrategy === 'aggressive'
      ? poisonAggressiveAmount
      : poisonConservativeAmount;

  const extraLifeDisabled = extraLifeStrategy === 'disabled';

  const setPoisonAmount = (next: number) => {
    if (poisonStrategy === 'aggressive') {
      setPoisonAggressiveAmount(next);
    } else {
      setPoisonConservativeAmount(next);
    }
  };

  const renderAttackRow = (
    title: string,
    subtitle: string,
    current: AttackStrategy,
    onChange: (value: AttackStrategy) => void,
  ) => (
    <Box sx={styles.row}>
      <Box sx={styles.rowHeader}>
        <Typography sx={styles.rowTitle}>{title}</Typography>
        <Typography sx={styles.rowSubtitle}>{subtitle}</Typography>
      </Box>
      <Box sx={styles.optionGrid}>
        {ATTACK_OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <Box
              key={opt.value}
              sx={[styles.optionCard, active && styles.optionCardActive]}
              onClick={() => onChange(opt.value)}
            >
              <Typography sx={styles.optionLabel}>{opt.label}</Typography>
              <Typography sx={styles.optionDescription}>{opt.description}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const renderStrategyRow = <T extends string>(
    title: string,
    subtitle: string,
    options: { value: T; label: string; description: string }[],
    current: T,
    onChange: (value: T) => void,
  ) => (
    <Box sx={styles.row}>
      <Box sx={styles.rowHeader}>
        <Typography sx={styles.rowTitle}>{title}</Typography>
        <Typography sx={styles.rowSubtitle}>{subtitle}</Typography>
      </Box>
      <Box sx={styles.optionGrid}>
        {options.map((opt) => {
          const active = current === opt.value;
          return (
            <Box
              key={opt.value}
              sx={[styles.optionCard, active && styles.optionCardActive]}
              onClick={() => onChange(opt.value)}
            >
              <Typography sx={styles.optionLabel}>{opt.label}</Typography>
              <Typography sx={styles.optionDescription}>{opt.description}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const numberField = (
    value: number,
    onChange: (next: number) => void,
    disabled?: boolean,
    min = 0,
    max?: number,
  ) => (
    (() => {
      const maxBelowMin = typeof max === 'number' && max < min;
      const computedDisabled = Boolean(disabled || maxBelowMin);
      const computedMax = typeof max === 'number' && !maxBelowMin ? max : undefined;
      return (
    <TextField
      type="number"
      size="small"
      value={value}
      disabled={computedDisabled}
      onChange={(e) => {
        const raw = e.target.value;
        let next = Number.parseInt(raw, 10);
        if (Number.isNaN(next)) next = min;
        next = Math.max(min, next);
        if (typeof max === 'number' && !maxBelowMin) next = Math.min(max, next);
        onChange(next);
      }}
      inputProps={{ min, max: computedMax, step: 1, inputMode: 'numeric' }}
      sx={styles.numberField}
    />
      );
    })()
  );

  const availablePill = (
    available: number,
    iconSrc: string,
    iconAlt: string,
    disabled: boolean,
    onClick: () => void,
  ) => (
    <Box
      sx={[styles.availablePill, disabled && styles.availablePillDisabled]}
      onClick={disabled ? undefined : onClick}
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <Box sx={styles.availablePillInner}>
        <Typography sx={styles.availableText}>Available: {available}</Typography>
        <img src={iconSrc} alt={iconAlt} style={styles.availableIcon as React.CSSProperties} />
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            maxWidth: '640px',
            width: '100%',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `,
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
        {/* Header + Close */}
        <Box sx={styles.header}>
          <Box sx={styles.headerMain}>
            <Box sx={styles.iconCircle}>
              <TuneIcon sx={{ fontSize: 22, color: gameColors.yellow }} />
            </Box>
            <Box>
              <Typography sx={styles.title}>Autopilot Configuration</Typography>
              <Typography sx={styles.subtitle}>
                Set your preferences for Autopilot.
              </Typography>
            </Box>
          </Box>
          <Button onClick={close} sx={styles.closeButton}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </Box>

        <Box sx={styles.divider} />

        {/* Content */}
        <Box sx={styles.content}>
          {renderAttackRow(
            'ATTACK SUMMIT',
            'Choose how Autopilot should decide to attack the Summit.',
            attackStrategy,
            setAttackStrategy,
          )}

          {attackStrategy !== 'never' && (
            <>
              <Box sx={styles.row}>
                <Box sx={styles.inlineControls}>
                  <Box sx={styles.toggleRow} onClick={() => setUseRevivePotions(!useRevivePotions)}>
                    <Switch
                      checked={useRevivePotions}
                      onChange={(e) => setUseRevivePotions(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      sx={styles.switch}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={styles.inlineTitle}>Use revival potions</Typography>
                      <Typography sx={styles.inlineSub}>
                        Allow Autopilot to spend revive potions when attacking.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={styles.maxCol}>
                    {availablePill(
                      Number(reviveAvailable) || 0,
                      revivePotionIcon,
                      'Revive',
                      !useRevivePotions,
                      () => setRevivePotionMax(Number(reviveAvailable) || 0),
                    )}
                    <Box sx={styles.maxRow}>
                      <Typography sx={styles.maxLabel}>Max Usage</Typography>
                      {numberField(
                        revivePotionMax,
                        setRevivePotionMax,
                        !useRevivePotions,
                        (Number(reviveAvailable) || 0) > 0 ? 1 : 0,
                        Number(reviveAvailable) || 0,
                      )}
                    </Box>
                    <Box sx={styles.maxRow}>
                      <Typography sx={styles.maxLabel}>Max per beast</Typography>
                      {numberField(
                        revivePotionMaxPerBeast,
                        setRevivePotionMaxPerBeast,
                        !useRevivePotions,
                        1,
                        64,
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box sx={styles.row}>
                <Box sx={styles.inlineControls}>
                  <Box sx={styles.toggleRow} onClick={() => setUseAttackPotions(!useAttackPotions)}>
                    <Switch
                      checked={useAttackPotions}
                      onChange={(e) => setUseAttackPotions(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      sx={styles.switch}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={styles.inlineTitle}>Use attack potions</Typography>
                      <Typography sx={styles.inlineSub}>
                        Allow Autopilot to spend attack potions when attacking (optimal use).
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={styles.maxCol}>
                    {availablePill(
                      Number(attackAvailable) || 0,
                      attackPotionIcon,
                      'Attack',
                      !useAttackPotions,
                      () => setAttackPotionMax(Number(attackAvailable) || 0),
                    )}
                    <Box sx={styles.maxRow}>
                      <Typography sx={styles.maxLabel}>Max</Typography>
                      {numberField(
                        attackPotionMax,
                        setAttackPotionMax,
                        !useAttackPotions,
                        (Number(attackAvailable) || 0) > 0 ? 1 : 0,
                        Number(attackAvailable) || 0,
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </>
          )}

          <Box sx={styles.sectionDivider} />

          {renderStrategyRow(
            'Extra Life',
            'Configure how Autopilot should use Extra Life potions.',
            EXTRA_LIFE_OPTIONS,
            extraLifeStrategy,
            setExtraLifeStrategy,
          )}
          <Box sx={styles.maxOnlyRow}>
            <Box />
            <Box sx={styles.maxCol}>
              {availablePill(
                Number(extraLifeAvailable) || 0,
                lifePotionIcon,
                'Extra Life',
                extraLifeDisabled,
                () => {
                  if (extraLifeStrategy === 'aggressive') {
                    setExtraLifeReplenishTo(Math.max(1, Math.min(extraLifeAvailable, 4000)));
                  } else {
                    setExtraLifeMax(Math.max(0, Math.min(extraLifeAvailable, 4000)));
                  }
                },
              )}
              {extraLifeStrategy === 'aggressive' && (
                <>
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>Replenish to</Typography>
                    {numberField(
                      extraLifeReplenishTo,
                      setExtraLifeReplenishTo,
                      extraLifeDisabled,
                      1,
                      Math.min(extraLifeAvailable, 4000),
                    )}
                  </Box>
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>Max usage</Typography>
                    {numberField(
                      extraLifeTotalMax,
                      setExtraLifeTotalMax,
                      extraLifeDisabled,
                      Math.min(extraLifeAvailable, 4000) > 0 ? 1 : 0,
                      Math.min(extraLifeAvailable, 4000),
                    )}
                  </Box>
                </>
              )}

              {extraLifeStrategy === 'after_capture' && (
                <>
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>After each capture</Typography>
                    {numberField(
                      extraLifeMax,
                      setExtraLifeMax,
                      extraLifeDisabled,
                      0,
                      Math.min(extraLifeAvailable, 4000),
                    )}
                  </Box>
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>Max usage</Typography>
                    {numberField(
                      extraLifeTotalMax,
                      setExtraLifeTotalMax,
                      extraLifeDisabled,
                      Math.min(extraLifeAvailable, 4000) > 0 ? 1 : 0,
                      Math.min(extraLifeAvailable, 4000),
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Box>

          <Box sx={styles.sectionDivider} />

          {renderStrategyRow(
            'Poison',
            'Configure how Autopilot should use Poison.',
            POISON_OPTIONS,
            poisonStrategy,
            setPoisonStrategy,
          )}
          {poisonStrategy !== 'disabled' && (
            <>
              {poisonStrategy === 'conservative' && (
                <Box sx={styles.maxOnlyRow}>
                  <Typography sx={styles.maxLabel}>More than this extra lives</Typography>
                  <Box sx={styles.maxCol}>
                    {numberField(
                      poisonConservativeExtraLivesTrigger,
                      setPoisonConservativeExtraLivesTrigger,
                      false,
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={styles.maxOnlyRow}>
                <Box />
                <Box sx={styles.maxCol}>
                  {availablePill(
                    Number(poisonAvailable) || 0,
                    poisonPotionIcon,
                    'Poison',
                    false,
                    () => {
                      const avail = Math.max(0, Number(poisonAvailable) || 0);
                      setPoisonAmount(avail);
                      if (poisonTotalMax <= 1) setPoisonTotalMax(avail);
                    },
                  )}
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>
                      {poisonStrategy === 'aggressive' ? 'Poison to apply' : 'Poison to apply'}
                    </Typography>
                    {numberField(poisonAmount, setPoisonAmount, false, 0, Number(poisonAvailable) || 0)}
                  </Box>
                  <Box sx={styles.maxRow}>
                    <Typography sx={styles.maxLabel}>Max usage</Typography>
                    {numberField(
                      poisonTotalMax,
                      setPoisonTotalMax,
                      false,
                      (Number(poisonAvailable) || 0) > 0 ? 1 : 0,
                      Number(poisonAvailable) || 0,
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          <Button
            onClick={handleResetToDefaults}
            sx={styles.resetButton}
          >
            <Typography sx={styles.resetButtonText}>Reset to defaults</Typography>
          </Button>

          <Button
            onClick={close}
            sx={styles.doneButton}
          >
            <Typography sx={styles.doneButtonText}>Save</Typography>
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

export default AutopilotConfigModal;

const styles = {
  container: {
    padding: 2,
    pt: 1.5,
    color: '#fff',
    boxSizing: 'border-box' as const,
  },
  closeButton: {
    minWidth: { xs: '44px', sm: '32px' },
    height: { xs: '44px', sm: '32px' },
    borderRadius: '999px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    color: '#aaa',
    padding: 0,
    '&:hover': {
      background: `${gameColors.darkGreen}`,
      borderColor: gameColors.red,
      color: gameColors.red,
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1.5,
    my: 1.5,
    px: 0.5,
  },
  headerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}60`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  subtitle: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    mt: 0.3,
  },
  divider: {
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColors.accentGreen}, transparent)`,
    mb: 1.5,
    opacity: 0.8,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1,
    maxHeight: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 180px)' },
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch',
    '&::-webkit-scrollbar': {
      width: { xs: 0, sm: '6px' },
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 3,
    },
  },
  row: {
    background: `${gameColors.darkGreen}80`,
    borderRadius: '8px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: 1.25,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}30,
      0 4px 8px rgba(0, 0, 0, 0.4)
    `,
  },
  rowHeader: {
    mb: 1,
  },
  rowTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    color: '#ffedbb',
  },
  rowSubtitle: {
    fontSize: '11px',
    color: '#9aa',
    mt: 0.25,
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } as const,
    gap: 1,
  },
  optionCard: {
    background: `${gameColors.darkGreen}80`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}30`,
    padding: 0.75,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: gameColors.brightGreen,
      boxShadow: `0 0 10px ${gameColors.brightGreen}40`,
    },
  },
  optionCardActive: {
    borderColor: gameColors.brightGreen,
    background: `linear-gradient(135deg, ${gameColors.mediumGreen}70 0%, ${gameColors.darkGreen} 100%)`,
  },
  optionLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffedbb',
    mb: 0.25,
  },
  optionDescription: {
    fontSize: '11px',
    color: '#bbb',
    lineHeight: 1.3,
  },
  sectionDivider: {
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${gameColors.accentGreen}60, transparent)`,
    opacity: 0.6,
    my: 0.5,
  },
  inlineControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    flexWrap: 'wrap' as const,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    cursor: 'pointer',
    flex: 1,
    minWidth: '280px',
    userSelect: 'none' as const,
  },
  inlineTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffedbb',
    lineHeight: 1.2,
  },
  inlineSub: {
    fontSize: '11px',
    color: '#bbb',
    lineHeight: 1.2,
    mt: 0.25,
  },
  maxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    justifyContent: 'flex-end',
  },
  maxCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 0.5,
  },
  availablePill: {
    borderRadius: '999px',
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}70`,
    padding: '2px 8px',
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'all 0.15s ease',
    '&:hover': {
      borderColor: `${gameColors.brightGreen}80`,
      boxShadow: `0 0 10px ${gameColors.brightGreen}30`,
    },
  },
  availablePillDisabled: {
    cursor: 'default',
    opacity: 0.7,
    borderColor: `${gameColors.accentGreen}25`,
    '&:hover': {
      borderColor: `${gameColors.accentGreen}25`,
      boxShadow: 'none',
    },
  },
  availableText: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    fontWeight: 700,
    letterSpacing: '0.2px',
  },
  availablePillInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  availableIcon: {
    width: 14,
    height: 14,
    objectFit: 'contain' as const,
    opacity: 0.95,
    filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.35))',
  },
  maxOnlyRow: {
    background: `${gameColors.darkGreen}80`,
    borderRadius: '8px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: 1.25,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}30,
      0 4px 8px rgba(0, 0, 0, 0.4)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    flexWrap: 'wrap' as const,
  },
  maxLabel: {
    fontSize: '11px',
    color: '#9aa',
    fontWeight: 'bold',
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
  },
  numberField: {
    width: 120,
    '& .MuiInputBase-input': {
      color: '#ffedbb',
      padding: '6px 8px',
      fontSize: '12px',
      fontWeight: 600,
    },
    '& .MuiOutlinedInput-root': {
      background: `${gameColors.darkGreen}55`,
      borderRadius: '8px',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}40`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.brightGreen}80`,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: gameColors.brightGreen,
    },
    // Disabled state: make it look intentionally "locked", not muddy/black
    '& .MuiOutlinedInput-root.Mui-disabled': {
      background: `${gameColors.darkGreen}35`,
    },
    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}25`,
      borderStyle: 'dashed',
    },
    '& .MuiInputBase-input.Mui-disabled': {
      WebkitTextFillColor: '#9aa',
      opacity: 1,
    },
  },
  switch: {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: gameColors.brightGreen,
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: `${gameColors.brightGreen}AA`,
    },
    '& .MuiSwitch-track': {
      backgroundColor: `${gameColors.accentGreen}55`,
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mt: 2,
    pt: 1,
    borderTop: `1px solid ${gameColors.accentGreen}40`,
  },
  resetButton: {
    background: 'transparent',
    borderRadius: '999px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '4px 12px',
    textTransform: 'none',
    '&:hover': {
      borderColor: gameColors.brightGreen,
      background: `${gameColors.darkGreen}80`,
    },
  },
  resetButtonText: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
  },
  doneButton: {
    background: `${gameColors.mediumGreen}80`,
    borderRadius: '999px',
    border: `2px solid ${gameColors.brightGreen}`,
    padding: '6px 16px',
    textTransform: 'none',
    '&:hover': {
      background: `${gameColors.mediumGreen}`,
      boxShadow: `0 0 2px ${gameColors.brightGreen}60`,
    },
  },
  doneButtonText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
};

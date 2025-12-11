import { useAutopilotStore, AttackStrategy } from '@/stores/autopilotStore';
import { gameColors } from '@/utils/themes';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Dialog, Typography } from '@mui/material';
import React from 'react';

interface AutopilotConfigModalProps {
  open: boolean;
  close: () => void;
}

const ATTACK_OPTIONS: { value: AttackStrategy; label: string; description: string }[] = [
  {
    value: 'guaranteed',
    label: 'Only when guaranteed',
    description: `Attack only when you're guaranteed to take the Summit.`,
  },
  {
    value: 'all_out',
    label: 'All out',
    description: 'Always attack the Summit with everything available.',
  },
];

function AutopilotConfigModal(props: AutopilotConfigModalProps) {
  const { open, close } = props;

  const {
    attackStrategy,
    setAttackStrategy,
    resetToDefaults,
  } = useAutopilotStore();

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
            'When to attack',
            'Choose how Autopilot should decide to attack the Summit.',
            attackStrategy,
            setAttackStrategy,
          )}
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          <Button
            onClick={resetToDefaults}
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
    minWidth: '32px',
    height: '32px',
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
    gap: 1.5,
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
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } as any,
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


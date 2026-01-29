import { getSummitRewardsStatus } from '@/utils/summitRewards';
import { gameColors } from '@/utils/themes';
import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';

type RewardsRemainingBarProps = {
  currentTimestamp?: number;
  variant?: 'panel' | 'compact';
};

const pulseKeyframes = `
  @keyframes rewardsBarBorderPulse {
    0% { border-color: ${gameColors.accentGreen}40; }
    35% { border-color: ${gameColors.yellow}AA; }
    100% { border-color: ${gameColors.accentGreen}40; }
  }

  @keyframes rewardsBarLinePulse {
    0% { transform: translateX(140%); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateX(-140%); opacity: 0; }
  }

  @keyframes rewardsBarBlockPulse {
    0% { filter: brightness(1) saturate(1); opacity: 1; }
    35% { filter: brightness(1.6) saturate(1.25); opacity: 1; }
    100% { filter: brightness(1) saturate(1); opacity: 1; }
  }
`;

export default function RewardsRemainingBar({
  currentTimestamp,
  variant = 'panel',
}: RewardsRemainingBarProps) {
  const [polledTimestamp, setPolledTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000));
  const prevSecondRef = useRef<number>(0);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [secondPulse, setSecondPulse] = useState(false);

  const effectiveTimestamp = currentTimestamp ?? polledTimestamp;

  // Update timestamp every second if not provided
  useEffect(() => {
    if (currentTimestamp !== undefined) return;

    const id = setInterval(() => {
      setPolledTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [currentTimestamp]);

  // Pulse animation every 10 seconds (subtle indication of rewards streaming)
  useEffect(() => {
    const prev = prevSecondRef.current;
    prevSecondRef.current = effectiveTimestamp;

    // Pulse every 10 seconds
    if (!effectiveTimestamp || Math.floor(effectiveTimestamp / 10) === Math.floor(prev / 10)) return;

    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    // Restart animation reliably by toggling off->on
    setSecondPulse(false);
    requestAnimationFrame(() => setSecondPulse(true));
    pulseTimeoutRef.current = setTimeout(() => setSecondPulse(false), 520);
  }, [effectiveTimestamp]);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const status = useMemo(() => getSummitRewardsStatus(effectiveTimestamp), [effectiveTimestamp]);

  const fillColor =
    status.percentRemaining <= 10
      ? gameColors.red
      : status.percentRemaining <= 25
        ? '#ff9800'
        : status.percentRemaining <= 50
          ? gameColors.yellow
          : gameColors.brightGreen;

  const percentText = `${status.percentRemaining.toFixed(1)}%`;

  const fillFx = {
    backgroundColor: fillColor,
    boxShadow: 'none',
  } as const;

  const pulseFx = secondPulse
    ? ({
      animation: 'rewardsBarBlockPulse 520ms ease-out',
      '&::after': {
        opacity: 0.8,
        animation: 'rewardsBarLinePulse 520ms ease-out',
      },
    } as const)
    : ({} as const);

  const borderPulseFx = secondPulse
    ? ({ animation: 'rewardsBarBorderPulse 520ms ease-out' } as const)
    : ({} as const);

  if (variant === 'compact') {
    return (
      <Box sx={compactStyles.container}>
        <Box sx={compactStyles.headerRow}>
          <Typography sx={compactStyles.title}>SUMMIT REMAINING</Typography>
          <Typography sx={compactStyles.percent}>{percentText}</Typography>
        </Box>
        <Box sx={[compactStyles.barContainer, borderPulseFx]}>
          <Box
            sx={[
              compactStyles.barFill,
              { width: `${status.percentRemaining}%`, ...fillFx, ...pulseFx },
            ]}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={panelStyles.container}>
      <Box sx={panelStyles.valueRow}>
        <Typography sx={panelStyles.value}>
          SUMMIT REMAINING
        </Typography>
        <Typography sx={panelStyles.subtle}>{percentText}</Typography>
      </Box>
      <Box sx={[panelStyles.barContainer, borderPulseFx]}>
        <Box
          sx={[
            panelStyles.barFill,
            { width: `${status.percentRemaining}%`, ...fillFx, ...pulseFx },
          ]}
        />
      </Box>
    </Box>
  );
}

const panelStyles = {
  container: {
    width: '100%',
    mt: '6px',
  },
  title: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textAlign: 'center',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    mb: '4px',
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
  },
  value: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: 600,
  },
  subtle: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: 600,
  },
  barContainer: {
    width: '100%',
    height: '10px',
    backgroundColor: `${gameColors.darkGreen}80`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}40`,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: `inset 0 0 0 1px ${gameColors.darkGreen}`,
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      width: '34px',
      transform: 'translateX(140%)',
      opacity: 0,
      pointerEvents: 'none',
      background:
        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)',
      mixBlendMode: 'overlay',
    },
  },
} as const;

const compactStyles = {
  container: {
    width: '100%',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '12px',
    boxSizing: 'border-box',
    boxShadow: `
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    px: 1,
    py: 1.25,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    mb: '6px',
  },
  title: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  percent: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: 600,
  },
  value: {
    fontSize: '11px',
    color: '#ffedbb',
    fontWeight: 800,
    fontFamily: 'monospace',
  },
  barContainer: {
    width: '100%',
    height: '10px',
    backgroundColor: `${gameColors.darkGreen}80`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}40`,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: `inset 0 0 0 1px ${gameColors.darkGreen}`,
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      width: '34px',
      transform: 'translateX(140%)',
      opacity: 0,
      pointerEvents: 'none',
      background:
        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)',
      mixBlendMode: 'overlay',
    },
  },
} as const;

// Inject keyframes once (lightweight, same pattern used elsewhere in the app)
if (typeof document !== 'undefined') {
  const styleId = 'rewards-remaining-bar-keyframes';
  const existing = document.getElementById(styleId) as HTMLStyleElement | null;
  if (existing) {
    if (existing.textContent !== pulseKeyframes) existing.textContent = pulseKeyframes;
  } else {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = pulseKeyframes;
    document.head.appendChild(style);
  }
}


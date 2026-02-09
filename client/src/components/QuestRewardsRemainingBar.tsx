import { REWARD_NAME } from '@/contexts/GameDirector';
import { gameColors } from '@/utils/themes';
import { Box, Skeleton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

type QuestRewardsRemainingBarProps = {
  remainingRewards: number;
  totalPool: number;
  isLoading?: boolean;
};

const pulseKeyframes = `
  @keyframes questRewardsBarBorderPulse {
    0% { border-color: ${gameColors.accentGreen}40; }
    35% { border-color: ${gameColors.yellow}AA; }
    100% { border-color: ${gameColors.accentGreen}40; }
  }

  @keyframes questRewardsBarLinePulse {
    0% { transform: translateX(140%); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateX(-140%); opacity: 0; }
  }

  @keyframes questRewardsBarBlockPulse {
    0% { filter: brightness(1) saturate(1); opacity: 1; }
    35% { filter: brightness(1.6) saturate(1.25); opacity: 1; }
    100% { filter: brightness(1) saturate(1); opacity: 1; }
  }
`;

export default function QuestRewardsRemainingBar({
  remainingRewards,
  totalPool,
  isLoading = false,
}: QuestRewardsRemainingBarProps) {
  const prevRemainingRef = useRef<number>(remainingRewards);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulse, setPulse] = useState(false);

  // Calculate percentage remaining
  const percentRemaining = totalPool > 0 
    ? Math.max(0, Math.min(100, (remainingRewards / totalPool) * 100))
    : 0;

  // Pulse animation when remaining rewards change significantly
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = remainingRewards;

    // Pulse if rewards decreased by at least 0.01
    if (prev - remainingRewards >= 0.01) {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      setPulse(false);
      requestAnimationFrame(() => setPulse(true));
      pulseTimeoutRef.current = setTimeout(() => setPulse(false), 520);
    }
  }, [remainingRewards]);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const fillColor =
    percentRemaining <= 10
      ? gameColors.red
      : percentRemaining <= 25
        ? '#ff9800'
        : percentRemaining <= 50
          ? gameColors.yellow
          : gameColors.brightGreen;

  const percentText = `${percentRemaining.toFixed(1)}%`;

  const fillFx = {
    backgroundColor: fillColor,
    boxShadow: 'none',
  } as const;

  const pulseFx = pulse
    ? ({
        animation: 'questRewardsBarBlockPulse 520ms ease-out',
        '&::after': {
          opacity: 0.8,
          animation: 'questRewardsBarLinePulse 520ms ease-out',
        },
      } as const)
    : ({} as const);

  const borderPulseFx = pulse
    ? ({ animation: 'questRewardsBarBorderPulse 520ms ease-out' } as const)
    : ({} as const);

  return (
    <Box sx={styles.container}>
      <Box sx={styles.headerRow}>
        <Typography sx={styles.title}>QUEST REWARDS REMAINING</Typography>
        {isLoading ? (
          <Skeleton
            variant="text"
            width={50}
            height={16}
            sx={{ bgcolor: `${gameColors.yellow}20` }}
          />
        ) : (
          <Typography sx={styles.percent}>{percentText}</Typography>
        )}
      </Box>
      <Box sx={[styles.barContainer, borderPulseFx]}>
        {isLoading ? (
          <Box sx={[styles.barFill, { width: '100%', opacity: 0.3, backgroundColor: gameColors.accentGreen }]} />
        ) : (
          <Box
            sx={[
              styles.barFill,
              { width: `${percentRemaining}%`, ...fillFx, ...pulseFx },
            ]}
          />
        )}
      </Box>
      <Box sx={styles.valueRow}>
        {isLoading ? (
          <Skeleton
            variant="text"
            width={80}
            height={14}
            sx={{ bgcolor: `${gameColors.yellow}20` }}
          />
        ) : (
          <Typography sx={styles.value}>
            {Math.round(remainingRewards).toLocaleString()} {REWARD_NAME} remaining
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    width: '100%',
    my: 1.5,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    mb: '6px',
  },
  title: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  percent: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: 600,
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'center',
    mt: '6px',
  },
  value: {
    fontSize: '10px',
    color: '#999',
    fontStyle: 'italic',
  },
  barContainer: {
    width: '100%',
    height: '12px',
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

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'quest-rewards-remaining-bar-keyframes';
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

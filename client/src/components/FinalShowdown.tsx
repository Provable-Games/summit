import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { lookupAddressNames } from '@/utils/addressNameCache';
import CrownIcon from '@mui/icons-material/EmojiEvents';
import TimerIcon from '@mui/icons-material/Timer';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

// 75 blocks to win, estimate ~5 minutes (assuming ~4 second block time)
const WINNING_BLOCKS = 75;
const ESTIMATED_BLOCK_TIME = 4; // seconds per block
const ESTIMATED_TOTAL_TIME = WINNING_BLOCKS * ESTIMATED_BLOCK_TIME; // ~300 seconds (5 minutes)

interface FinalShowdownProps {
  summit: any;
  currentBlock: number;
}

function FinalShowdown({ summit, currentBlock }: FinalShowdownProps) {
  const { setSummitEnded } = useGameStore();
  const [holderName, setHolderName] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [smoothTimeRemaining, setSmoothTimeRemaining] = useState<number>(0);
  const [blocksRemaining, setBlocksRemaining] = useState<number>(WINNING_BLOCKS);
  const [isComplete, setIsComplete] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [lastBlockUpdate, setLastBlockUpdate] = useState<number>(Date.now());

  // Calculate blocks held and time remaining estimate
  useEffect(() => {
    const now = Date.now();

    if (!summit?.taken_at || !currentBlock) {
      setTimeRemaining(ESTIMATED_TOTAL_TIME);
      setBlocksRemaining(WINNING_BLOCKS);
      setSmoothTimeRemaining(ESTIMATED_TOTAL_TIME);
      setLastBlockUpdate(now);
      return;
    }

    const blocksHeld = Math.max(0, currentBlock - summit.taken_at);
    const blocksLeft = Math.max(0, WINNING_BLOCKS - blocksHeld);
    const estimatedTimeLeft = Math.min(ESTIMATED_TOTAL_TIME, blocksLeft * ESTIMATED_BLOCK_TIME);


    // Ensure we never show more time than maximum or negative progress
    const cappedTimeLeft = Math.max(0, Math.min(ESTIMATED_TOTAL_TIME, estimatedTimeLeft));
    const cappedBlocksLeft = Math.max(0, Math.min(WINNING_BLOCKS, blocksLeft));

    setBlocksRemaining(cappedBlocksLeft);
    setTimeRemaining(cappedTimeLeft);
    setSmoothTimeRemaining(cappedTimeLeft);
    setIsComplete(cappedBlocksLeft === 0);
    setLastBlockUpdate(now);

    // Trigger pulse animation when close to winning (last 5 blocks or 20 seconds)
    setPulseAnimation((blocksLeft <= 5 || estimatedTimeLeft <= 20) && blocksLeft > 0);
  }, [summit?.taken_at, currentBlock, lastBlockUpdate]);

  // Smooth countdown timer
  useEffect(() => {
    if (isComplete || timeRemaining <= 0) {
      setSummitEnded(true);
      return;
    }

    const interval = setInterval(() => {
      setSmoothTimeRemaining(prevTime => {
        const newTime = Math.max(0, prevTime - 1);

        // Sync back to block-based time if we drift too far
        const drift = Math.abs(newTime - timeRemaining);
        if (drift > 5) {
          return timeRemaining;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isComplete]);

  // Update pulse animation based on smooth countdown
  useEffect(() => {
    setPulseAnimation((blocksRemaining <= 5 || smoothTimeRemaining <= 20) && !isComplete);
  }, [smoothTimeRemaining, blocksRemaining, isComplete]);

  // Fetch holder name
  useEffect(() => {
    const fetchHolderName = async () => {
      if (!summit?.owner) {
        setHolderName('');
        return;
      }

      try {
        const addressMap = await lookupAddressNames([summit.owner]);
        const normalized = summit.owner.replace(/^0x0+/, "0x").toLowerCase();
        const name = addressMap.get(normalized);
        setHolderName(name || 'Unknown Warlock');
      } catch (error) {
        console.error('Error fetching holder name:', error);
        setHolderName('Unknown Warlock');
      }
    };

    fetchHolderName();
  }, [summit?.owner]);

  const formatTime = (seconds: number): string => {
    const totalSecs = Math.max(0, Math.ceil(seconds)); // Round up and ensure non-negative
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (smoothTimeRemaining <= 10) return gameColors.red;
    if (smoothTimeRemaining <= 30) return '#ff9800';
    if (smoothTimeRemaining <= 60) return gameColors.yellow;
    return gameColors.brightGreen;
  };

  const progress = Math.max(0, Math.min(100, ((WINNING_BLOCKS - blocksRemaining) / WINNING_BLOCKS) * 100));

  return (
    <Box sx={styles.container}>
      <Box sx={styles.innerContainer}>

        {/* Header */}
        <Box sx={styles.header}>
          <CrownIcon sx={styles.crownIcon} />
          <Typography sx={styles.title}>
            FINAL SHOWDOWN
          </Typography>
        </Box>

        {/* Main Display */}
        <Box sx={[styles.mainDisplay, isComplete && styles.victoryDisplay]}>

          {/* Current Holder */}
          <Box sx={styles.holderSection}>
            <Typography sx={styles.holderLabel}>
              {isComplete ? 'WINNER' : 'CURRENT HOLDER'}
            </Typography>
            <Typography sx={[styles.holderName, isComplete && styles.victoryText]}>
              {holderName || 'Unknown'}
            </Typography>
          </Box>

          {/* Timer Display */}
          <Box sx={[styles.timerSection, pulseAnimation && styles.pulseAnimation]}>
            <Box sx={styles.timerContainer}>
              {!isComplete && <TimerIcon sx={[styles.timerIcon, { color: getTimeColor() }]} />}
              <Typography sx={[styles.timeDisplay, { color: getTimeColor() }]}>
                {isComplete ? 'VICTORY' : formatTime(smoothTimeRemaining)}
              </Typography>
            </Box>

            {!isComplete && (
              <Box sx={styles.blockInfo}>
                <Typography sx={styles.blockCount}>
                  {blocksRemaining} blocks remaining
                </Typography>
              </Box>
            )}
          </Box>

          {/* Progress Ring */}
          <Box sx={styles.progressContainer}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={styles.progressSvg}>
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={`${gameColors.darkGreen}80`}
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={isComplete ? gameColors.yellow : getTimeColor()}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
                transform="rotate(-90 60 60)"
                style={styles.progressStroke}
              />
            </svg>

            {/* Center Content */}
            <Box sx={styles.progressCenter}>
              {isComplete ? (
                <CrownIcon sx={styles.victoryIcon} />
              ) : (
                <>
                  <Typography sx={styles.progressPercent}>
                    {Math.floor(progress)}%
                  </Typography>
                  <Typography sx={styles.progressLabel}>
                    Complete
                  </Typography>
                </>
              )}
            </Box>
          </Box>

        </Box>

        {/* Status Bar */}
        <Box sx={styles.statusBar}>
          <Box sx={styles.statusItem}>
            <FlashOnIcon sx={styles.statusIcon} />
            <Typography sx={styles.statusText}>
              {isComplete ? 'Summit Has Ended' : 'Hold for 5 min to win!'}
            </Typography>
          </Box>
        </Box>

        {/* Prize Pool Display */}
        <Box sx={styles.prizeSection}>
          <Typography sx={styles.prizeLabel}>🏆 Prize</Typography>
          <Typography sx={styles.prizeAmount}>10.000 $SURVIVOR</Typography>
        </Box>

      </Box>
    </Box>
  );
}

export default FinalShowdown;

const pulseKeyframes = `
  @keyframes finalShowdownPulse {
    0% { 
      transform: scale(1);
    }
    50% { 
      transform: scale(1.02);
    }
    100% { 
      transform: scale(1);
    }
  }
`;

const styles = {
  container: {
    width: '250px',
    background: `linear-gradient(135deg, ${gameColors.darkGreen}95, ${gameColors.darkGreen}80)`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `3px solid ${gameColors.yellow}60`,
    borderRadius: '16px',
    boxShadow: `
      0 12px 32px rgba(0, 0, 0, 0.8),
      0 0 24px ${gameColors.yellow}30,
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
    p: 2,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(45deg, transparent 30%, ${gameColors.yellow}05 50%, transparent 70%)`,
      pointerEvents: 'none',
    },
  },
  innerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    mb: 1,
    borderBottom: `2px solid ${gameColors.yellow}40`,
    pb: 1,
  },
  crownIcon: {
    fontSize: '24px',
    color: gameColors.yellow,
    filter: `drop-shadow(0 0 8px ${gameColors.yellow}60)`,
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    textAlign: 'center',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  mainDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1.5,
    mb: 1,
    p: 1.5,
    background: `${gameColors.darkGreen}40`,
    border: `2px solid ${gameColors.accentGreen}40`,
    borderRadius: '12px',
    transition: 'all 0.3s ease',
  },
  victoryDisplay: {
    border: `2px solid ${gameColors.yellow}80`,
    background: `linear-gradient(135deg, ${gameColors.darkGreen}60, ${gameColors.yellow}10)`,
    boxShadow: `0 0 24px ${gameColors.yellow}30`,
  },
  holderSection: {
    textAlign: 'center',
    width: '100%',
  },
  holderLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    mb: 0.5,
  },
  holderName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffedbb',
    textAlign: 'center',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  victoryText: {
    color: gameColors.yellow,
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 16px ${gameColors.yellow}60
    `,
  },
  beastName: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    fontStyle: 'italic',
    mt: 0.5,
  },
  timerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
  },
  timerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  timerIcon: {
    fontSize: '20px',
  },
  timeDisplay: {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  timerLabel: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  blockInfo: {
    mt: 0.5,
    px: 1,
    py: 0.25,
    background: `${gameColors.darkGreen}60`,
    borderRadius: '12px',
    border: `1px solid ${gameColors.accentGreen}30`,
  },
  blockCount: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  pulseAnimation: {
    animation: 'finalShowdownPulse 1s ease-in-out infinite',
  },
  progressContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    transform: 'rotate(-90deg)',
  },
  progressStroke: {
    transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease',
  },
  progressCenter: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffedbb',
    lineHeight: 1,
  },
  progressLabel: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  victoryIcon: {
    fontSize: '32px',
    color: gameColors.yellow,
    filter: `drop-shadow(0 0 12px ${gameColors.yellow}80)`,
  },
  statusBar: {
    width: '100%',
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    boxSizing: 'border-box',
    p: 1,
    mb: 1,
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
  },
  statusIcon: {
    fontSize: '16px',
    color: gameColors.yellow,
  },
  statusText: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: '600',
  },
  prizeSection: {
    textAlign: 'center',
    width: '100%',
    background: `linear-gradient(135deg, ${gameColors.yellow}20, ${gameColors.yellow}10)`,
    border: `2px solid ${gameColors.yellow}40`,
    borderRadius: '8px',
    boxSizing: 'border-box',
    p: 1,
  },
  prizeLabel: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    mb: 0.5,
  },
  prizeAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
};

// Inject keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}
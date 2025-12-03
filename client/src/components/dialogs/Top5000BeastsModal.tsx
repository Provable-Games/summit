import { useStatistics } from '@/contexts/Statistics';
import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Dialog, IconButton, LinearProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { isMobile } from 'react-device-detect';

interface Top5000BeastsModalProps {
  open: boolean;
  onClose: () => void;
}

const survivorTokensPerBeast = 5;

export default function Top5000BeastsModal({ open, onClose }: Top5000BeastsModalProps) {
  const { collection } = useGameStore()
  const { top5000Cutoff } = useStatistics()

  const [playerBeastsInTop5000, setPlayerBeastsInTop5000] = useState(0);

  useEffect(() => {
    setPlayerBeastsInTop5000(collection.filter(beast => beast.blocks_held > top5000Cutoff?.blocks_held || 0).length);
  }, [collection, top5000Cutoff]);

  const progressPercent = (playerBeastsInTop5000 / collection.length) * 100;

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
            width: isMobile ? '90vw' : '520px',
            maxWidth: '96vw',
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
        <IconButton onClick={onClose} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        <Box sx={styles.header}>
          <EmojiEventsIcon sx={styles.trophyIcon} />
          <Typography sx={styles.title}>Beast Rewards</Typography>
          <Typography sx={styles.subtitle}>
            The top 5,000 beasts that have held the Summit the longest will each receive {survivorTokensPerBeast} $SURVIVOR
          </Typography>
        </Box>

        <Box sx={styles.statsGrid}>
          <Box sx={styles.statCard}>
            <WhatshotIcon sx={styles.statIcon} />
            <Typography sx={styles.statLabel}>Current Cutoff</Typography>
            <Typography sx={styles.statValue}>{Math.max(top5000Cutoff?.blocks_held || 0, 0.01)}</Typography>
          </Box>

          <Box sx={styles.statCard}>
            <TrendingUpIcon sx={[styles.statIcon, { color: gameColors.brightGreen }]} />
            <Typography sx={styles.statLabel}>Your Beasts in Top 5000</Typography>
            <Typography sx={[styles.statValue, { color: gameColors.brightGreen }]}>
              {playerBeastsInTop5000}
            </Typography>
          </Box>
        </Box>

        <Box sx={styles.progressSection}>
          <Box sx={styles.progressHeader}>
            <Typography sx={styles.progressLabel}>
              Possible Rewards
            </Typography>
            <Typography sx={styles.progressPercent}>
              {progressPercent.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={styles.progressBar}
          />
          <Typography sx={styles.progressHint}>
            {playerBeastsInTop5000} of your beasts qualify for rewards
          </Typography>
        </Box>

        <Box sx={styles.rewardSection}>
          <Box sx={styles.rewardCard}>
            <Typography sx={styles.rewardLabel}>Current Reward</Typography>
            <Box sx={styles.rewardValue}>
              <Typography sx={styles.rewardNumber}>
                {playerBeastsInTop5000 * survivorTokensPerBeast} $SURVIVOR
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={styles.footer}>
          <Typography sx={styles.hint}>
            Tiebreaker: In case of a tie, lower power beasts rank higher
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    p: 3,
    pb: 2,
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    color: '#999',
    zIndex: 10,
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  header: {
    textAlign: 'center',
    mb: 2,
  },
  trophyIcon: {
    fontSize: '48px',
    color: gameColors.yellow,
    mb: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1.5px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.brightGreen}40
    `,
    mb: 0.5,
  },
  subtitle: {
    fontSize: '14px',
    color: '#ccc',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 2,
    mb: 2,
  },
  statCard: {
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    p: 2,
    textAlign: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}60`,
      transform: 'translateY(-1px)',
    },
  },
  statIcon: {
    fontSize: '32px',
    color: gameColors.yellow,
  },
  statLabel: {
    fontSize: '12px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    mb: 0.5,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSection: {
    mb: 2,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 1,
  },
  progressLabel: {
    fontSize: '14px',
    color: '#ccc',
  },
  progressPercent: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
  },
  progressBar: {
    height: '12px',
    borderRadius: '6px',
    backgroundColor: `${gameColors.darkGreen}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: gameColors.brightGreen,
      borderRadius: '6px',
    },
    mb: 0.5,
  },
  progressHint: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
    pt: '2px',
  },
  rewardSection: {
    mb: 2,
  },
  rewardCard: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen}20 0%, ${gameColors.mediumGreen}20 100%)`,
    border: `2px solid ${gameColors.brightGreen}60`,
    borderRadius: '10px',
    p: 1.5,
    textAlign: 'center',
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}20,
      inset 0 0 20px ${gameColors.brightGreen}10
    `,
  },
  rewardLabel: {
    fontSize: '14px',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    mb: 1,
  },
  rewardValue: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  rewardNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  rewardUnit: {
    fontSize: '16px',
    color: gameColors.yellow,
  },
  detailsSection: {
    background: `${gameColors.darkGreen}40`,
    borderRadius: '8px',
    p: 2,
    mb: 2,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 0.75,
    borderBottom: `1px solid ${gameColors.accentGreen}20`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  detailLabel: {
    fontSize: '13px',
    color: '#bbb',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    textAlign: 'center',
    pt: 1.5,
    borderTop: `1px solid ${gameColors.accentGreen}30`,
  },
  hint: {
    fontSize: '13px',
    color: '#aaa',
    fontStyle: 'italic',
  },
};
import attackPotionIcon from '@/assets/images/attack-potion.png';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import swordIcon from '@/assets/images/sword.png';

const survivorTokenIcon = '/images/survivor_token.png';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import StarIcon from '@mui/icons-material/Star';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Button, Dialog, IconButton, LinearProgress, Typography } from '@mui/material';
import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';

interface QuestsModalProps {
  open: boolean;
  onClose: () => void;
}

interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  reward: number;
  icon: React.ReactNode;
  check: (beast: Beast) => boolean;
  tier?: number; // For tiered quests (e.g., Attack Streak 3, 5, 10)
  group?: string; // Group name for tiered quests
}

const questDefinitions: QuestDefinition[] = [
  {
    id: 'attack_summit',
    name: 'First Blood',
    description: 'Attack the Summit',
    reward: 0.05,
    icon: <img src={swordIcon} alt="sword" style={{ width: 22, height: 22 }} />,
    check: (beast) => beast.attack_streak > 0,
  },
  {
    id: 'revival_potion',
    name: 'Second Wind',
    description: 'Buy a revival potion and attack with a dead beast',
    reward: 0.05,
    icon: <img src={revivePotionIcon} alt="revive" style={{ width: 22, height: 22 }} />,
    check: (beast) => beast.used_revival_potion === true,
  },
  {
    id: 'attack_potion',
    name: 'A Vital Boost',
    description: 'Buy an attack potion and attack using it',
    reward: 0.05,
    icon: <img src={attackPotionIcon} alt="attack" style={{ width: 22, height: 22 }} />,
    check: (beast) => beast.used_attack_potion === true,
  },
  {
    id: 'level_up_1',
    name: 'Growing Stronger',
    description: 'Level up your beast once',
    reward: 0.02,
    icon: <TrendingUpIcon sx={{ color: '#2196f3' }} />,
    check: (beast) => beast.current_level - beast.level >= 1,
    tier: 1,
    group: 'level_up',
  },
  {
    id: 'level_up_3',
    name: 'Rising Power',
    description: 'Level up your beast 3 times',
    reward: 0.03,
    icon: <TrendingUpIcon sx={{ color: '#64b5f6' }} />,
    check: (beast) => beast.current_level - beast.level >= 3,
    tier: 2,
    group: 'level_up',
  },
  {
    id: 'level_up_5',
    name: 'Apex Predator',
    description: 'Level up your beast 5 times',
    reward: 0.04,
    icon: <StarIcon sx={{ color: '#ffd700' }} />,
    check: (beast) => beast.current_level - beast.level >= 5,
    tier: 3,
    group: 'level_up',
  },
  {
    id: 'level_up_10',
    name: 'Mastery',
    description: 'Level up your beast 10 times',
    reward: 0.06,
    icon: <StarIcon sx={{ color: '#ffd700' }} />,
    check: (beast) => beast.current_level - beast.level >= 10,
    tier: 4,
    group: 'level_up',
  },
  {
    id: 'max_attack_streak',
    name: 'Consistency is Key',
    description: 'Reach a max attack streak of 10',
    reward: 0.05,
    icon: <TrendingUpIcon sx={{ color: '#64b5f6' }} />,
    check: (beast) => beast.max_attack_streak === true,
  },
  {
    id: 'take_summit',
    name: 'Summit Conqueror',
    description: 'Capture the Summit',
    reward: 0.05,
    icon: <MilitaryTechIcon sx={{ color: gameColors.yellow }} />,
    check: (beast) => beast.captured_summit === true,
  },
  {
    id: 'hold_summit_10s',
    name: 'Iron Grip',
    description: 'Hold the Summit for at least 10 seconds',
    reward: 0.1,
    icon: <TimerIcon sx={{ color: gameColors.brightGreen }} />,
    check: (beast) => beast.summit_held_seconds >= 10,
  },
];

const TOTAL_REWARD_PER_BEAST = 0.5;

export default function QuestsModal({ open, onClose }: QuestsModalProps) {
  const { collection } = useGameStore();

  const questStats = useMemo(() => {
    const stats = questDefinitions.map((quest) => {
      const completedBeasts = collection.filter((beast) => quest.check(beast));
      return {
        ...quest,
        completedCount: completedBeasts.length,
        totalCount: collection.length,
        completedReward: completedBeasts.length * quest.reward,
      };
    });

    const totalPossibleReward = collection.length * TOTAL_REWARD_PER_BEAST;
    const totalEarnedReward = stats.reduce((sum, s) => sum + s.completedReward, 0);
    const totalQuests = questDefinitions.length;
    const avgCompletion =
      collection.length > 0
        ? stats.reduce((sum, s) => sum + s.completedCount / collection.length, 0) / totalQuests
        : 0;

    const alreadyClaimed = 0; // TODO: fetch from contract
    const claimable = totalEarnedReward - alreadyClaimed;

    return {
      quests: stats,
      totalPossibleReward,
      totalEarnedReward,
      avgCompletion,
      beastCount: collection.length,
      alreadyClaimed,
      claimable,
    };
  }, [collection]);

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
            width: isMobile ? '95vw' : '560px',
            maxWidth: '96vw',
            maxHeight: '85vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
        <IconButton onClick={onClose} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        {/* Header */}
        <Box sx={styles.header}>
          <EmojiEventsIcon sx={styles.trophyIcon} />
          <Typography sx={styles.title}>BEAST QUESTS</Typography>
          <Typography sx={styles.subtitle}>
            Complete quests with your beasts to earn $SURVIVOR
          </Typography>
        </Box>

        {/* Summary Stats Bar */}
        <Box sx={styles.summaryBar}>
          <Box sx={styles.summaryItem}>
            <Typography sx={styles.summaryLabel}>Beasts</Typography>
            <Typography sx={styles.summaryValue}>{questStats.beastCount}</Typography>
          </Box>
          <Box sx={styles.summaryDivider} />
          <Box sx={styles.summaryItem}>
            <Typography sx={styles.summaryLabel}>Max Reward</Typography>
            <Box sx={styles.summaryValueWithIcon}>
              <Typography sx={styles.summaryValue}>
                {questStats.totalPossibleReward.toFixed(1)}
              </Typography>
              <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 24, height: 24 }} />
            </Box>
          </Box>
          <Box sx={styles.summaryDivider} />
          <Box sx={styles.summaryItem}>
            <Typography sx={styles.summaryLabel}>Completion</Typography>
            <Typography sx={styles.summaryValue}>
              {(questStats.avgCompletion * 100).toFixed(0)}%
            </Typography>
          </Box>
        </Box>

        {/* Quest List */}
        <Box sx={styles.questList}>
          {questStats.quests.map((quest) => {
            const progressPercent =
              quest.totalCount > 0 ? (quest.completedCount / quest.totalCount) * 100 : 0;
            const isComplete = quest.completedCount === quest.totalCount && quest.totalCount > 0;

            return (
              <Box key={quest.id} sx={styles.questCard}>
                <Box sx={styles.questHeader}>
                  <Box sx={styles.questIconContainer}>{quest.icon}</Box>
                  <Box sx={styles.questInfo}>
                    <Box sx={styles.questTitleRow}>
                      <Typography sx={styles.questName}>{quest.name}</Typography>
                      {quest.tier && (
                        <Box sx={styles.tierBadge}>
                          <Typography sx={styles.tierText}>T{quest.tier}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Typography sx={styles.questDescription}>{quest.description}</Typography>
                  </Box>
                  <Box sx={styles.rewardBadge}>
                    <Typography sx={styles.rewardText}>+{quest.reward}</Typography>
                    <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 18, height: 18, marginLeft: 4 }} />
                  </Box>
                </Box>

                <Box sx={styles.progressSection}>
                  <Box sx={styles.progressHeader}>
                    <Typography sx={styles.progressText}>
                      {quest.completedCount} / {quest.totalCount} beasts
                    </Typography>
                    {isComplete && <CheckCircleIcon sx={styles.checkIcon} />}
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={[styles.progressBar, isComplete && styles.progressBarComplete]}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box sx={styles.footer}>
          <Box sx={styles.totalReward}>
            <Typography sx={styles.totalLabel}>Unclaimed Rewards</Typography>
            <Box sx={styles.totalValueWithIcon}>
              <Typography sx={styles.totalValue}>
                {questStats.totalEarnedReward.toFixed(2)}
              </Typography>
              <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 24, height: 24 }} />
            </Box>
          </Box>
          <Button
            sx={styles.claimButton}
            disabled={questStats.claimable <= 0}
          >
            <Box sx={styles.claimButtonContent}>
              <Typography sx={styles.claimButtonText}>Claim Now</Typography>
            </Box>
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    p: { xs: 2, sm: 2.5 },
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
    textAlign: 'center',
    mb: 2,
  },
  trophyIcon: {
    fontSize: '44px',
    color: gameColors.yellow,
    mb: 0.5,
  },
  title: {
    fontSize: '22px',
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
    fontSize: '13px',
    color: '#bbb',
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    p: 1.5,
    mb: 2,
    gap: 2,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  summaryValueWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  summaryDivider: {
    width: '1px',
    height: '30px',
    background: `${gameColors.accentGreen}40`,
  },
  questList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
    pr: 0.5,
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: `${gameColors.darkGreen}40`,
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: `${gameColors.accentGreen}60`,
      borderRadius: '3px',
      '&:hover': {
        background: `${gameColors.accentGreen}80`,
      },
    },
  },
  questCard: {
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '8px',
    p: 1.5,
    transition: 'all 0.2s ease',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}50`,
      background: `${gameColors.darkGreen}80`,
    },
  },
  questHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
    mb: 1,
  },
  questIconContainer: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${gameColors.darkGreen}`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}30`,
    '& svg': {
      fontSize: '22px',
    },
  },
  questInfo: {
    flex: 1,
    minWidth: 0,
  },
  questTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  questName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  questDescription: {
    fontSize: '12px',
    color: '#aaa',
    mt: 0.25,
  },
  tierBadge: {
    background: `${gameColors.accentGreen}30`,
    borderRadius: '4px',
    px: 0.75,
    py: 0.25,
  },
  tierText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
  },
  rewardBadge: {
    background: `${gameColors.yellow}20`,
    border: `1px solid ${gameColors.yellow}40`,
    borderRadius: '6px',
    px: 1,
    py: 0.5,
    display: 'flex',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  progressSection: {
    mt: 0.5,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 0.5,
  },
  progressText: {
    fontSize: '11px',
    color: '#999',
  },
  checkIcon: {
    fontSize: '16px',
    color: gameColors.brightGreen,
  },
  progressBar: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: `${gameColors.darkGreen}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: gameColors.accentGreen,
      borderRadius: '3px',
    },
  },
  progressBarComplete: {
    '& .MuiLinearProgress-bar': {
      backgroundColor: gameColors.brightGreen,
    },
  },
  footer: {
    mt: 2,
    pt: 1.5,
    borderTop: `1px solid ${gameColors.accentGreen}30`,
  },
  totalReward: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: '14px',
    color: '#bbb',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  totalValueWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
  },
  claimButton: {
    mt: 1.5,
    width: '100%',
    background: `${gameColors.accentGreen}40`,
    borderRadius: '8px',
    py: 1,
    border: `1px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.accentGreen}60`,
      border: `1px solid ${gameColors.brightGreen}`,
    },
    '&:disabled': {
      background: `${gameColors.darkGreen}40`,
      border: `1px solid ${gameColors.accentGreen}30`,
      opacity: 0.6,
    },
  },
  claimButtonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
  },
  claimAmountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    px: 1,
    py: 0.25,
  },
  claimAmountText: {
    color: gameColors.yellow,
    fontSize: '14px',
    fontWeight: 'bold',
  },
};

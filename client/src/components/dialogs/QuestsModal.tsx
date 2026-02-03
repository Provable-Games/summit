import attackPotionIcon from '@/assets/images/attack-potion.png';
import questsIcon from '@/assets/images/quest.png';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import swordIcon from '@/assets/images/sword.png';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DiamondIcon from '@mui/icons-material/Diamond';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Dialog, IconButton, LinearProgress, Typography } from '@mui/material';
import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';

const survivorTokenIcon = '/images/survivor_token.png';

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
    check: (beast) => beast.last_death_timestamp > 0,
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
    icon: <TrendingUpIcon sx={{ color: '#4fc3f7' }} />,
    check: (beast) => beast.current_level - beast.level >= 1,
    tier: 1,
    group: 'level_up',
  },
  {
    id: 'level_up_3',
    name: 'Rising Power',
    description: 'Level up your beast 3 times',
    reward: 0.03,
    icon: <KeyboardDoubleArrowUpIcon sx={{ color: '#7c4dff' }} />,
    check: (beast) => beast.current_level - beast.level >= 3,
    tier: 2,
    group: 'level_up',
  },
  {
    id: 'level_up_5',
    name: 'Apex Predator',
    description: 'Level up your beast 5 times',
    reward: 0.04,
    icon: <BoltIcon sx={{ color: '#ffab00' }} />,
    check: (beast) => beast.current_level - beast.level >= 5,
    tier: 3,
    group: 'level_up',
  },
  {
    id: 'level_up_10',
    name: 'Mastery',
    description: 'Level up your beast 10 times',
    reward: 0.06,
    icon: <DiamondIcon sx={{ color: '#e040fb' }} />,
    check: (beast) => beast.current_level - beast.level >= 10,
    tier: 4,
    group: 'level_up',
  },
  {
    id: 'max_attack_streak',
    name: 'Consistency is Key',
    description: 'Reach the max attack streak of 10',
    reward: 0.05,
    icon: <LocalFireDepartmentIcon sx={{ color: '#ff5722' }} />,
    check: (beast) => beast.max_attack_streak === true,
  },
  {
    id: 'take_summit',
    name: 'Summit Conqueror',
    description: 'Capture the Summit',
    reward: 0.05,
    icon: <MilitaryTechIcon sx={{ color: '#ffd54f' }} />,
    check: (beast) => beast.captured_summit === true,
  },
  {
    id: 'hold_summit_10s',
    name: 'Iron Grip',
    description: 'Hold the Summit for at least 10 seconds',
    reward: 0.1,
    icon: <AutoAwesomeIcon sx={{ color: '#26c6da' }} />,
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

    return {
      quests: stats,
      totalPossibleReward,
      totalEarnedReward,
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
          <Box sx={styles.headerTitleRow}>
            <img src={questsIcon} alt="quests" style={styles.trophyIcon} />
            <Typography sx={styles.title}>QUESTS</Typography>
          </Box>
          <Typography sx={styles.subtitle}>
            Complete quests with your beasts to earn $SURVIVOR
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={styles.summaryBar}>
          <Box sx={styles.progressLabelRow}>
            <Typography sx={styles.progressLabel}>Completion</Typography>
            <Typography sx={styles.progressPercent}>
              {questStats.totalPossibleReward > 0
                ? ((questStats.totalEarnedReward / questStats.totalPossibleReward) * 100).toFixed(0)
                : 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={questStats.totalPossibleReward > 0
              ? (questStats.totalEarnedReward / questStats.totalPossibleReward) * 100
              : 0}
            sx={styles.rewardProgressBar}
          />
          <Box sx={styles.rewardValuesRow}>
            <Box sx={styles.rewardValueWithIcon}>
              <Typography sx={styles.earnedValue}>
                {questStats.totalEarnedReward.toFixed(2)}
              </Typography>
              <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 20, height: 20 }} />
            </Box>
            <Typography sx={styles.rewardDivider}>/</Typography>
            <Box sx={styles.rewardValueWithIcon}>
              <Typography sx={styles.maxValue}>
                {questStats.totalPossibleReward.toFixed(2)}
              </Typography>
              <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 20, height: 20 }} />
            </Box>
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
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  trophyIcon: {
    width: '44px',
    height: '44px',
    objectFit: 'contain' as const,
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
  },
  subtitle: {
    fontSize: '13px',
    color: '#bbb',
  },
  summaryBar: {
    display: 'flex',
    flexDirection: 'column',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    p: 1.5,
    mb: 2,
    gap: 1,
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
  },
  progressPercent: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
  },
  rewardProgressBar: {
    height: '10px',
    borderRadius: '5px',
    backgroundColor: `${gameColors.darkGreen}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: gameColors.yellow,
      borderRadius: '5px',
      backgroundImage: `linear-gradient(90deg, ${gameColors.accentGreen}, ${gameColors.yellow})`,
    },
  },
  rewardValuesRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
    mt: 0.5,
  },
  rewardValueWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  earnedValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  maxValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#888',
  },
  rewardDivider: {
    fontSize: '14px',
    color: '#666',
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
};

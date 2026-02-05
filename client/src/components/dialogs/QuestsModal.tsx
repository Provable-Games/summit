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
import LockIcon from '@mui/icons-material/Lock';
import DiamondIcon from '@mui/icons-material/Diamond';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, Dialog, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';
import { REWARD_NAME } from '@/contexts/GameDirector';
import { useQuestGuide, questGuides } from '@/contexts/QuestGuide';

const survivorTokenIcon = '/images/survivor_token.png';

const QUEST_REWARD_POOL_TOTAL = 40000;

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
    check: (beast) => beast.bonus_xp > 0,
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
];

const TOTAL_REWARD_PER_BEAST = 0.5;

export default function QuestsModal({ open, onClose }: QuestsModalProps) {
  const { collection } = useGameStore();
  const { startGuide } = useQuestGuide();

  const hasGuide = (questId: string) => {
    return questGuides.some(g => g.questId === questId);
  };

  const handleStartGuide = (questId: string) => {
    onClose(); // Close the modal first
    // Small delay to let modal close animation complete
    setTimeout(() => {
      startGuide(questId);
    }, 200);
  };

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

    // Check if any beast has completed "First Blood" (attack_summit quest)
    const hasFirstBlood = collection.some((beast) => beast.bonus_xp > 0);

    return {
      quests: stats,
      totalPossibleReward,
      totalEarnedReward,
      hasFirstBlood,
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
            Complete quests with your beasts to earn {REWARD_NAME}
          </Typography>

          {questStats.hasFirstBlood && (
            <>
              {/* Reward Pool Banner */}
              < Box sx={styles.rewardPoolBanner}>
                <Box sx={styles.rewardPoolContent}>
                  <Typography sx={styles.rewardPoolLabel}>Remaining Quest Rewards</Typography>
                  <Box sx={styles.rewardPoolAmountRow}>
                    <img src={survivorTokenIcon} alt="token" style={{ width: 28, height: 28 }} />
                    <Typography sx={styles.rewardPoolAmount}>
                      {QUEST_REWARD_POOL_TOTAL.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={styles.rewardPoolWarningBadge}>
                  <Typography sx={styles.rewardPoolWarning}>
                    Quest rewards are first come, first serve. Once the pool is empty, quests will no longer reward {REWARD_NAME}.
                  </Typography>
                </Box>
              </Box>

              {/* Progress Bar - only shown after first blood */}
              <Box sx={styles.summaryBar}>
                <Typography sx={styles.progressLabel}>Your Progress</Typography>
                <Box sx={styles.progressBarContainer}>
                  <LinearProgress
                    variant="determinate"
                    value={questStats.totalPossibleReward > 0
                      ? (questStats.totalEarnedReward / questStats.totalPossibleReward) * 100
                      : 0}
                    sx={styles.rewardProgressBar}
                  />
                </Box>
                <Box sx={styles.rewardValuesRow}>
                  <Typography sx={styles.earnedValue}>
                    {questStats.totalEarnedReward.toFixed(2)}
                  </Typography>
                  <Typography sx={styles.rewardDivider}>/</Typography>
                  <Typography sx={styles.maxValue}>
                    {questStats.totalPossibleReward.toFixed(2)}
                  </Typography>
                  <img src={survivorTokenIcon} alt="SURVIVOR" style={{ width: 14, height: 14 }} />
                </Box>
              </Box>
            </>
          )}
        </Box>

        <Box sx={styles.questList}>
          {/* Section Divider */}
          <Box sx={styles.sectionDivider}>
            <Box sx={styles.dividerLine} />
            <Typography sx={styles.dividerText}>Available Quests</Typography>
            <Box sx={styles.dividerLine} />
          </Box>

          {/* Quest List */}
          {questStats.quests.map((quest) => {
            const progressPercent =
              quest.totalCount > 0 ? (quest.completedCount / quest.totalCount) * 100 : 0;
            const isComplete = quest.completedCount === quest.totalCount && quest.totalCount > 0;
            const isFirstBloodQuest = quest.id === 'attack_summit';
            const isLocked = !questStats.hasFirstBlood && !isFirstBloodQuest;

            return (
              <Box key={quest.id} sx={[styles.questCard, isLocked && styles.questCardLocked]}>
                <Box sx={styles.questHeader}>
                  <Box sx={[styles.questIconContainer, isLocked && styles.questIconLocked]}>
                    {isLocked ? <LockIcon sx={{ color: '#555', fontSize: 20 }} /> : quest.icon}
                  </Box>
                  <Box sx={styles.questInfo}>
                    <Box sx={styles.questTitleRow}>
                      <Typography sx={[styles.questName, isLocked && styles.textLocked]}>{quest.name}</Typography>
                      {quest.tier && (
                        <Box sx={[styles.tierBadge, isLocked && styles.tierBadgeLocked]}>
                          <Typography sx={[styles.tierText, isLocked && styles.textLocked]}>T{quest.tier}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Typography sx={[styles.questDescription, isLocked && styles.textLocked]}>
                      {quest.description}
                    </Typography>
                  </Box>
                  <Box sx={[styles.rewardBadge, isLocked && styles.rewardBadgeLocked]}>
                    <Typography sx={[styles.rewardText, isLocked && styles.rewardTextLocked]}>+{quest.reward}</Typography>
                    <img
                      src={survivorTokenIcon}
                      alt="SURVIVOR"
                      style={{
                        width: 18,
                        height: 18,
                        marginLeft: 4,
                        opacity: isLocked ? 0.3 : 1,
                        filter: isLocked ? 'grayscale(1)' : 'none',
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={[styles.progressSection, isLocked && styles.progressSectionLocked]}>
                  <Box sx={styles.progressHeader}>
                    <Typography sx={[styles.progressText, isLocked && styles.textLocked]}>
                      {quest.completedCount} / {quest.totalCount} beasts
                    </Typography>
                    <Box sx={styles.progressActions}>
                      {!isLocked && !isComplete && hasGuide(quest.id) && (
                        <Box
                          sx={styles.guideButton}
                          onClick={() => handleStartGuide(quest.id)}
                        >
                          <HelpOutlineIcon sx={{ fontSize: 14 }} />
                          <Typography sx={styles.guideButtonText}>Guide</Typography>
                        </Box>
                      )}
                      {isComplete && <CheckCircleIcon sx={styles.checkIcon} />}
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={isLocked ? 0 : progressPercent}
                    sx={[styles.progressBar, isComplete && styles.progressBarComplete, isLocked && styles.progressBarLocked]}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>

      </Box>
    </Dialog >
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
  rewardPoolBanner: {
    my: 2,
    background: `linear-gradient(135deg, ${gameColors.yellow}15 0%, ${gameColors.yellow}08 50%, ${gameColors.yellow}15 100%)`,
    border: `1px solid ${gameColors.yellow}40`,
    borderRadius: '10px',
    padding: '12px 16px',
  },
  rewardPoolContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
  },
  rewardPoolLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  rewardPoolAmountRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  rewardPoolAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    textShadow: `0 0 20px ${gameColors.yellow}60, 0 2px 4px rgba(0,0,0,0.5)`,
    letterSpacing: '1px',
  },
  rewardPoolWarningBadge: {
    display: 'flex',
    justifyContent: 'center',
    mt: 1,
  },
  rewardPoolWarning: {
    fontSize: '10px',
    color: '#999',
    fontStyle: 'italic',
    background: 'rgba(0,0,0,0.3)',
    padding: '3px 10px',
    borderRadius: '10px',
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    px: 1.5,
    py: 1,
  },
  progressBarContainer: {
    flex: 1,
    minWidth: 0,
  },
  sectionDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    my: 0.5,
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: `${gameColors.accentGreen}30`,
  },
  dividerText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    px: 0.5,
  },
  progressLabel: {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap',
  },
  rewardProgressBar: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: `${gameColors.darkGreen}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: gameColors.yellow,
      borderRadius: '3px',
      backgroundImage: `linear-gradient(90deg, ${gameColors.accentGreen}, ${gameColors.yellow})`,
    },
  },
  rewardValuesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    whiteSpace: 'nowrap',
  },
  earnedValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  maxValue: {
    fontSize: '12px',
    color: '#666',
  },
  rewardDivider: {
    fontSize: '11px',
    color: '#555',
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
  questCardLocked: {
    background: 'rgba(20, 20, 20, 0.5)',
    border: '1px solid rgba(60, 60, 60, 0.3)',
    opacity: 0.6,
    '&:hover': {
      border: '1px solid rgba(60, 60, 60, 0.4)',
      background: 'rgba(25, 25, 25, 0.5)',
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
  questIconLocked: {
    background: 'rgba(30, 30, 30, 0.8)',
    border: '1px solid rgba(60, 60, 60, 0.3)',
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
  tierBadgeLocked: {
    background: 'rgba(60, 60, 60, 0.3)',
  },
  tierText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
  },
  textLocked: {
    color: '#555',
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
  rewardBadgeLocked: {
    background: 'rgba(60, 60, 60, 0.2)',
    border: '1px solid rgba(60, 60, 60, 0.3)',
  },
  rewardText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  rewardTextLocked: {
    color: '#555',
  },
  progressSection: {
    mt: 0.5,
  },
  progressSectionLocked: {
    opacity: 0.5,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 0.5,
  },
  progressActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  guideButton: {
    display: 'flex',
    alignItems: 'center',
    mt: -2,
    gap: '4px',
    padding: '3px 6px',
    borderRadius: '4px',
    backgroundColor: `${gameColors.brightGreen}15`,
    border: `1px solid ${gameColors.brightGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: gameColors.brightGreen,
    '&:hover': {
      backgroundColor: `${gameColors.brightGreen}25`,
      borderColor: gameColors.brightGreen,
    },
  },
  guideButtonText: {
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
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
  progressBarLocked: {
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#444',
    },
  },
};

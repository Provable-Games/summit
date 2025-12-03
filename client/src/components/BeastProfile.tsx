import { useStatistics } from '@/contexts/Statistics';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, LinearProgress, Typography } from "@mui/material";
import revivePotionIcon from '../assets/images/revive-potion.png';
import { fetchBeastImage, isBeastInTop5000, normaliseHealth } from "../utils/beasts";
import { gameColors } from '../utils/themes';

const MAX_HEALTH = 1023;
const MAX_LEVELS = 40;

interface BeastProfileProps {
  beast: Beast;
}

export default function BeastProfile({ beast }: BeastProfileProps) {
  const { summit } = useGameStore()
  const { top5000Cutoff } = useStatistics()
  const originalExperience = Math.pow(beast.level, 2);
  const currentExperience = originalExperience + beast.bonus_xp;
  const nextLevelExperience = Math.pow(beast.current_level + 1, 2);
  const bonusLevels = Math.floor(Math.sqrt(currentExperience)) - beast.level;

  // Calculate if beast is in top 5000
  const isInTop5000 = isBeastInTop5000(beast, top5000Cutoff);

  const diff = ((beast.last_death_timestamp * 1000) + 46 * 60 * 60 * 1000) - Date.now();
  const timeLeft = diff > 3600000 ? `${Math.floor(diff / 3600000)}h` : `${Math.floor((diff % 3600000) / 60000)}m`;
  const streakEnded = diff <= 0;
  const attackStreak = streakEnded ? 0 : beast.attack_streak;

  // Calculate revival time for dead beasts
  const isDead = beast.current_health === 0;
  let revivalTime = null;

  if (isDead && beast.last_death_timestamp) {
    const revivalTimeRemaining = (1000 * beast.last_death_timestamp + beast.revival_time) - Date.now();

    if (revivalTimeRemaining > 0) {
      const hours = Math.floor(revivalTimeRemaining / (60 * 60 * 1000));
      const minutes = Math.floor((revivalTimeRemaining % (60 * 60 * 1000)) / (60 * 1000));
      revivalTime = `${hours}h ${minutes}m`;
    }
  }

  return (
    <Box sx={styles.beastContainer}>
      {/* Pixel Art Border Frame */}
      <Box sx={styles.pixelBorder}>
        <Box sx={styles.headerContent}>
          <Box />

          <Box sx={{ textAlign: 'center' }}>
            {/* Special Name at Top */}
            <Typography sx={styles.specialName}>
              "{beast.prefix} {beast.suffix}"
            </Typography>

            {/* Beast Name */}
            <Box sx={styles.beastNameContainer}>
              <Typography sx={styles.beastName}>
                {beast.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={styles.beastRankContainer}>
            <Box sx={styles.rankIconContainer}>
              {beast.rank === 1 ? (
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <g id="crown" fill="#e6c56e" stroke="#af8a3c" strokeWidth="1">
                    <path d="M2 14h16l-1.5 4h-13z" />
                    <path d="m2 14 2-9 3 5 4-5 3 5 2-5 2 9Z" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx="5" cy="5" r="1.2" fill="#fff3c4" />
                    <circle cx="12" cy="5" r="1.2" fill="#fff3c4" />
                    <circle cx="17" cy="5" r="1.2" fill="#fff3c4" />
                  </g>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <g id="trophy" fill="#c0c0c0" stroke="#8a8a8a" strokeWidth="1">
                    <rect x="4" y="6" width="10" height="8" rx="1" />
                    <rect x="2" y="7" width="2" height="3" />
                    <rect x="14" y="7" width="2" height="3" />
                    <rect x="6" y="13" width="6" height="4" />
                  </g>
                </svg>
              )}
            </Box>
            <Typography sx={styles.pixelRankValue}>{beast.rank}</Typography>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={styles.mainContent}>
          {/* Beast Image */}
          <Box sx={styles.beastImageSection}>
            <img src={fetchBeastImage(beast)} alt='' height={'100%'} />
          </Box>

          {/* Stats Section */}
          <Box sx={styles.statsContainer}>
            <Box sx={styles.statsRow}>
              <Box sx={styles.statBox}>
                <Typography sx={styles.statLabel}>TIER</Typography>
                <Typography sx={styles.statValue}>{beast.tier}</Typography>
              </Box>
              <Box sx={styles.statBox}>
                <Typography sx={styles.statLabel}>LEVEL</Typography>
                <Typography sx={styles.statValue}>{beast.current_level}</Typography>
              </Box>
              <Box sx={styles.statBox}>
                <Typography sx={styles.statLabel}>TYPE</Typography>
                <Typography sx={styles.statValue}>{beast.type}</Typography>
              </Box>
            </Box>
            <Box sx={styles.statsRow}>
              <Box sx={styles.statBox}>
                <Typography sx={styles.statLabel}>POWER</Typography>
                <Box sx={styles.statValueWithIcon}>
                  <Typography sx={[styles.statValue, { fontSize: '14px' }]}>{beast.power}</Typography>
                  <Box sx={styles.powerIcon}>⚡</Box>
                </Box>
              </Box>
              <Box sx={styles.statBox}>
                <Typography sx={styles.statLabel}>HEALTH</Typography>
                <Box sx={styles.statValueWithIcon}>
                  <Typography sx={[styles.statValue, { fontSize: '14px' }]}>{beast.health}</Typography>
                  <Box sx={styles.healthIcon}>❤️</Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={styles.divider} />

          {/* Attack Streak Section */}
          <Box sx={styles.pixelStreakContainer}>
            <Box sx={styles.pixelStreakHeader}>
              <Typography sx={styles.pixelStreakTitle}>ATTACK STREAK</Typography>
              {attackStreak > 0 && !streakEnded && (
                <Typography sx={styles.pixelStreakTimer}>
                  {beast.token_id === summit.beast.token_id ? "PAUSED" : `ENDS IN ${timeLeft}`}
                </Typography>
              )}
            </Box>

            <Box sx={styles.pixelStreakIcons}>
              {[...Array(10)].map((_, index) => {
                const isActive = index < attackStreak;
                return (
                  <Box
                    key={index}
                    sx={{
                      ...styles.pixelFireIcon,
                      backgroundColor: isActive ? '#FF4500' : '#1a1a1a',
                      border: isActive ? '2px solid #FFD70099' : '2px solid #333',
                    }}
                  >
                    <WhatshotIcon sx={{
                      fontSize: '16px',
                      color: isActive ? '#FFD700' : '#444',
                      filter: isActive ? 'drop-shadow(0 0 4px #FFD700)' : 'none',
                    }} />
                  </Box>
                );
              })}
            </Box>

            <Typography sx={styles.pixelStreakBonus}>
              +{attackStreak * 10}% BONUS XP NEXT ATTACK
            </Typography>
          </Box>

          {/* Bonus Levels Section */}
          <Box sx={styles.pixelProgressContainer}>
            <Box sx={styles.pixelProgressHeader}>
              <Typography sx={styles.pixelProgressLabel}>BONUS LEVELS</Typography>
              {bonusLevels === MAX_LEVELS ? (
                <Typography sx={styles.pixelMaxedText}>MAXED</Typography>
              ) : (
                <Typography sx={styles.pixelProgressValue}>{bonusLevels}/{MAX_LEVELS}</Typography>
              )}
            </Box>

            <Box sx={styles.pixelLevelBars}>
              {[...Array(MAX_LEVELS)].map((_, index) => {
                const isActive = index < bonusLevels;
                const intensity = isActive ? (index / MAX_LEVELS) : 0;
                return (
                  <Box
                    key={index}
                    sx={{
                      ...styles.pixelLevelBar,
                      backgroundColor: isActive ? `rgb(${Math.floor(255 * (1 - intensity))}, ${Math.floor(255 * intensity)}, 0)` : '#2a2a2e',
                      boxShadow: isActive ? `0 0 4px rgb(${Math.floor(255 * (1 - intensity))}, ${Math.floor(255 * intensity)}, 0)` : 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  />
                );
              })}
            </Box>

            {/* XP Progress Bar */}
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={normaliseHealth(currentExperience - originalExperience, nextLevelExperience - originalExperience)}
                sx={styles.xpBar}
              />
            </Box>
          </Box>

          {/* Bonus Health Section */}
          <Box sx={styles.pixelProgressContainer}>
            <Box sx={styles.pixelProgressHeader}>
              <Typography sx={styles.pixelProgressLabel}>BONUS HEALTH</Typography>
              {beast.bonus_health === MAX_HEALTH ? (
                <Typography sx={styles.pixelMaxedText}>MAXED</Typography>
              ) : (
                <Typography sx={styles.pixelProgressValue}>{beast.bonus_health}</Typography>
              )}
            </Box>

            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={normaliseHealth(beast.bonus_health, MAX_HEALTH)}
                sx={styles.healthBar}
              />
            </Box>
          </Box>


          {/* Revival Section */}
          <Box sx={styles.pixelRevivalContainer}>
            <Box sx={styles.pixelRevivalLeft}>
              <Box sx={styles.pixelRevivalInfo}>
                {isDead ? (
                  <Typography sx={styles.pixelRevivalTimeDead}>
                    Revives in: {revivalTime}
                  </Typography>
                ) : (
                  <Typography sx={styles.pixelRevivalTimeAlive}>
                    Revival time: {Math.floor(beast.revival_time / (60 * 60 * 1000))}h
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={styles.pixelRevivalRight}>
              <Typography sx={styles.pixelRevivalCostText}>
                {beast.revival_count + 1}
              </Typography>
              <Box sx={styles.pixelRevivalIcon}>
                <img src={revivePotionIcon} alt="Revive Potion" width="12" height="12" />
              </Box>
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={styles.divider} />

          {/* Rewards Section */}
          <Box sx={styles.rewardsContainer}>
            <Box sx={styles.rewardsRow}>
              <Box sx={styles.rewardsLeft}>
                <Box sx={styles.rewardsEarnedSection}>
                  <img src="/images/survivor_token.png" alt="" style={{ width: '20px', height: '20px' }} />
                  <Typography sx={styles.rewardsEarnedValue}>
                    {beast.blocks_held.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              {isInTop5000 && (
                <Box sx={styles.top5000Badge}>
                  <EmojiEventsIcon sx={{ fontSize: '16px', color: gameColors.yellow }} />
                  <Box sx={styles.top5000TextContainer}>
                    <Typography sx={styles.top5000Label}>TOP 5000</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  // Main pixel art container
  beastContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '220px',
    px: '12px',
    py: '8px',
    pb: '4px',
    background: '#1e1e22',
    border: '2px solid #d0c98d',
    borderRadius: '12px',
  },

  // Pixel art border with retro styling
  pixelBorder: {
    position: 'relative',
    width: '100%',
    padding: '4px',
    borderRadius: '0',
  },

  // Special name container (small at top)
  specialNameContainer: {
    textAlign: 'center',
    padding: '4px 8px',
  },

  // Special name (small text)
  specialName: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    lineHeight: '1.2',
  },

  // Beast name container
  beastNameContainer: {
    textAlign: 'center',
    marginBottom: '4px',
    padding: '6px 8px',
  },

  // Beast name
  beastName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    lineHeight: '1.2',
  },

  // Header content
  headerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // Main content area
  mainContent: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },

  // Beast image section
  beastImageSection: {
    background: '#000',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    height: '120px',
    borderRadius: '8px',
  },

  // Stats container
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  // Stats row
  statsRow: {
    display: 'flex',
    gap: '4px',
  },

  // Stat box
  statBox: {
    flex: 1,
    background: '#2a2a2e',
    borderRadius: '4px',
    pt: 1.5,
    pb: 1.5,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },

  // Stat label
  statLabel: {
    fontSize: '8px',
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
    lineHeight: '1',
  },

  // Stat value
  statValue: {
    fontSize: '12px',
    color: '#FFF',
    fontWeight: 'bold',
    lineHeight: '1',
  },

  // Stat value with icon
  statValueWithIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },

  // Power icon
  powerIcon: {
    fontSize: '10px',
    color: '#FFF',
  },

  // Health icon
  healthIcon: {
    fontSize: '10px',
    color: '#FF6B6B',
  },

  // Divider
  divider: {
    height: '1px',
    background: '#d3c091',
    opacity: 0.3,
  },

  // Beast rank container (top right corner)
  beastRankContainer: {
    position: 'absolute',
    textAlign: 'center',
    top: '-5px',
    right: '0',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },

  // Rank icon container
  rankIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pixel rank frame
  pixelRankFrame: {
    padding: '4px 6px',
    position: 'relative',
    minWidth: '40px',
    textAlign: 'center',
  },

  // Pixel rank label
  pixelRankLabel: {
    fontSize: '8px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    lineHeight: '1',
    marginBottom: '1px',
  },

  // Pixel rank value
  pixelRankValue: {
    fontSize: '12px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
    lineHeight: '1',
  },

  // Pixel image frame
  pixelImageFrame: {
    padding: '8px',
    position: 'relative',
  },

  // Pixel streak container
  pixelStreakContainer: {
    position: 'relative',
  },

  // Pixel streak header
  pixelStreakHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Pixel streak title
  pixelStreakTitle: {
    fontSize: '11px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },

  // Pixel streak timer
  pixelStreakTimer: {
    fontSize: '9px',
    color: '#FF6B35',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
  },

  // Pixel streak icons
  pixelStreakIcons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2px',
  },

  // Pixel fire icon
  pixelFireIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Pixel streak bonus
  pixelStreakBonus: {
    fontSize: '10px',
    color: '#d0c98d',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
  },

  // Pixel progress container
  pixelProgressContainer: {
    position: 'relative',
  },

  // Pixel progress header
  pixelProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Pixel progress label
  pixelProgressLabel: {
    fontSize: '10px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },

  // Pixel progress value
  pixelProgressValue: {
    fontSize: '10px',
    color: '#d0c98d',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
  },

  // Pixel maxed text
  pixelMaxedText: {
    fontSize: '10px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000, 0 0 4px #FFF',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },

  // Pixel level bars
  pixelLevelBars: {
    display: 'flex',
    gap: '1px',
    justifyContent: 'center',
  },

  // Pixel level bar
  pixelLevelBar: {
    width: '6px',
    height: '12px',
    borderRadius: '0',
    position: 'relative',
  },

  // XP Bar
  xpBar: {
    height: '6px',
    borderRadius: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: '4px',
    position: 'relative',
    overflow: 'hidden',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#9C27B0',
      boxShadow: '0 0 8px rgba(156, 39, 176, 0.5)',
    },
  },

  // XP Overlay Text
  xpOverlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    textShadow: '0 0 4px #000',
    pointerEvents: 'none',
    fontSize: '0.75rem',
  },

  // Health Bar
  healthBar: {
    height: '10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: '2px',
    position: 'relative',
    overflow: 'hidden',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#58b000',
    },
  },

  // Pixel health bar container
  pixelHealthBarContainer: {
    position: 'relative',
    width: '100%',
  },

  // Pixel health bar
  pixelHealthBar: {
    height: '14px',
    background: '#1A3A2A',
    borderRadius: '0',
    position: 'relative',
    overflow: 'hidden',
  },

  // Pixel health bar fill
  pixelHealthBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #d0c98d 0%, #4A8762 100%)',
    border: 'none',
    borderRadius: '0',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
    }
  },

  // Pixel health text
  pixelHealthText: {
    position: 'absolute',
    top: '50%',
    left: '4px',
    transform: 'translateY(-50%)',
    fontSize: '9px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    fontWeight: 'bold',
    zIndex: 10,
  },

  // Pixel revival container (compact)
  pixelRevivalContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#2a2a2e',
    borderRadius: '4px',
    padding: '2px 6px 1px',
    border: '1px solid #3a3a3e',
  },

  // Pixel revival left side
  pixelRevivalLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Pixel revival right side
  pixelRevivalRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Pixel revival icon (compact)
  pixelRevivalIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    background: '#1a1a1e',
    borderRadius: '2px',
    border: '1px solid #3a3a3e',
  },

  // Pixel revival info
  pixelRevivalInfo: {
    display: 'flex',
    alignItems: 'center',
  },

  // Pixel revival time dead
  pixelRevivalTimeDead: {
    fontSize: '11px',
    color: '#FF4444',
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
  },

  // Pixel revival time alive
  pixelRevivalTimeAlive: {
    fontSize: '11px',
    color: '#4CAF50',
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
  },

  // Pixel revival cost text
  pixelRevivalCostText: {
    fontSize: '11px',
    color: gameColors.orange,
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
  },

  // Pixel revival status dot (compact)
  pixelRevivalStatusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    position: 'relative',
  },

  // Rewards container
  rewardsContainer: {
  },

  // Rewards row
  rewardsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },

  // Rewards left section
  rewardsLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  // Rewards earned section
  rewardsEarnedSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Rewards earned label
  rewardsEarnedLabel: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    textShadow: '1px 1px 0px #000000',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },

  // Rewards earned value
  rewardsEarnedValue: {
    fontSize: '12px',
    color: '#FFF',
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },

  // Top 5000 badge
  top5000Badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 6px',
    background: `linear-gradient(135deg, ${gameColors.yellow}20 0%, ${gameColors.yellow}10 100%)`,
    border: `1px solid ${gameColors.yellow}60`,
    borderRadius: '4px',
  },

  // Top 5000 text container
  top5000TextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  // Top 5000 label
  top5000Label: {
    fontSize: '10px',
    color: gameColors.yellow,
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    lineHeight: '1',
  },

  // Top 5000 reward text
  top5000Reward: {
    fontSize: '9px',
    color: gameColors.brightGreen,
    textShadow: '1px 1px 0px #000000',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    lineHeight: '1.2',
  },
}
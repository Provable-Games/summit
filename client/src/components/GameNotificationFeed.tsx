import { GameNotification, useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import CasinoIcon from '@mui/icons-material/Casino';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StarIcon from '@mui/icons-material/Star';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

import attackPotionIcon from '@/assets/images/attack-potion.png';
import corpseTokenIcon from '@/assets/images/corpse-token.png';
import killTokenIcon from '@/assets/images/kill-token.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import poisonPotionIcon from '@/assets/images/poison-potion.png';

const survivorTokenIcon = '/images/survivor_token.png';

const NotificationItem = ({ notification }: { notification: GameNotification }) => {
  const config = getNotificationConfig(notification.type);

  return (
    <Box sx={styles.notificationItem}>
      {/* Beast image (if available) */}
      {notification.beastImageSrc && (
        <Box sx={styles.beastImageContainer}>
          <img src={notification.beastImageSrc} alt="" style={styles.beastImage as React.CSSProperties} />
        </Box>
      )}

      {/* Icon */}
      <Box sx={[styles.iconContainer, { background: config.color + '25' }]}>
        {config.icon}
      </Box>

      {/* Label */}
      <Typography sx={[styles.labelText, { color: config.color }]}>
        {config.label}
      </Typography>

      {/* Value (if exists) */}
      {notification.value !== undefined && (
        <Typography sx={[styles.valueText, { color: config.color }]}>
          {typeof notification.value === 'number' && notification.value > 0 ? '+' : ''}
          {notification.value}
        </Typography>
      )}

      {/* Player name */}
      {notification.playerName && (
        <Typography sx={styles.playerName}>
          {notification.playerName}
        </Typography>
      )}
    </Box>
  );
};

interface NotificationConfig {
  icon: React.ReactNode;
  color: string;
  label: string;
}

const getNotificationConfig = (type: GameNotification['type']): NotificationConfig => {
  const iconStyle = { width: 16, height: 16, objectFit: 'contain' as const };

  switch (type) {
    // Battle events
    case 'battle':
      return {
        icon: <img src={attackPotionIcon} alt="" style={iconStyle} />,
        color: '#e07a5f',
        label: 'ATK',
      };
    case 'poison':
      return {
        icon: <img src={poisonPotionIcon} alt="" style={iconStyle} />,
        color: gameColors.brightGreen,
        label: 'POISON',
      };
    case 'summit_change':
      return {
        icon: <MilitaryTechIcon sx={{ fontSize: 16, color: '#ffd700' }} />,
        color: '#ffd700',
        label: 'SUMMIT',
      };
    case 'extra_life':
      return {
        icon: <img src={lifePotionIcon} alt="" style={iconStyle} />,
        color: '#ff69b4',
        label: 'LIFE',
      };

    // Beast upgrades
    case 'specials':
      return {
        icon: <StarIcon sx={{ fontSize: 16, color: '#ffd700' }} />,
        color: '#ffd700',
        label: 'SPECIALS',
      };
    case 'wisdom':
      return {
        icon: <PsychologyIcon sx={{ fontSize: 16, color: '#60a5fa' }} />,
        color: '#60a5fa',
        label: 'WISDOM',
      };
    case 'diplomacy':
      return {
        icon: <HandshakeIcon sx={{ fontSize: 16, color: '#a78bfa' }} />,
        color: '#a78bfa',
        label: 'DIPLOMACY',
      };
    case 'spirit':
      return {
        icon: <ElectricBoltIcon sx={{ fontSize: 16, color: '#00ffff' }} />,
        color: '#00ffff',
        label: 'SPIRIT',
      };
    case 'luck':
      return {
        icon: <CasinoIcon sx={{ fontSize: 16, color: '#ff69b4' }} />,
        color: '#ff69b4',
        label: 'LUCK',
      };
    case 'bonus_health':
      return {
        icon: <FavoriteIcon sx={{ fontSize: 16, color: '#e05050' }} />,
        color: '#e05050',
        label: 'FED',
      };

    // Rewards
    case 'survivor_earned':
      return {
        icon: <img src={survivorTokenIcon} alt="" style={iconStyle} />,
        color: '#f2cc8f',
        label: 'EARNED',
      };
    case 'claimed_survivor':
      return {
        icon: <img src={survivorTokenIcon} alt="" style={iconStyle} />,
        color: '#f2cc8f',
        label: 'CLAIMED',
      };
    case 'claimed_corpses':
      return {
        icon: <img src={corpseTokenIcon} alt="" style={iconStyle} />,
        color: '#f2cc8f',
        label: 'CLAIMED',
      };
    case 'claimed_skulls':
      return {
        icon: <img src={killTokenIcon} alt="" style={iconStyle} />,
        color: '#f2cc8f',
        label: 'CLAIMED',
      };

    // LS Events
    case 'kill':
      return {
        icon: <EmojiEventsIcon sx={{ fontSize: 16, color: '#ffd700' }} />,
        color: '#ffd700',
        label: 'KILL',
      };
    case 'locked':
      return {
        icon: <HeartBrokenIcon sx={{ fontSize: 16, color: '#ff4444' }} />,
        color: '#ff4444',
        label: 'LOCKED',
      };

    default:
      return {
        icon: null,
        color: '#fff',
        label: '',
      };
  }
};

const GameNotificationFeed = () => {
  const { gameNotifications } = useGameStore();

  // Only show last 6 notifications
  const visibleNotifications = gameNotifications.slice(-6);

  if (visibleNotifications.length === 0) return null;

  return (
    <Box sx={styles.container}>
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
              layout: { duration: 0.2 }
            }}
          >
            <NotificationItem notification={notification} />
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default GameNotificationFeed;

const styles = {
  container: {
    position: 'fixed',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 100,
    pointerEvents: 'none',
    maxHeight: '60vh',
    overflow: 'hidden',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: `linear-gradient(135deg, ${gameColors.darkGreen}f0 0%, ${gameColors.mediumGreen}e0 100%)`,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${gameColors.accentGreen}50`,
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: `
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05)
    `,
    minWidth: '120px',
  },
  beastImageContainer: {
    position: 'relative',
    width: '28px',
    height: '28px',
    flexShrink: 0,
    borderRadius: '4px',
    overflow: 'hidden',
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  beastImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  labelText: {
    fontSize: '11px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
    letterSpacing: '0.5px',
    lineHeight: 1,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: '16px',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)',
    letterSpacing: '0.5px',
    lineHeight: 1,
  },
  playerName: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '80px',
  },
};

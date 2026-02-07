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

import swordIcon from '@/assets/images/sword.png';
import corpseTokenIcon from '@/assets/images/corpse-token.png';
import killTokenIcon from '@/assets/images/kill-token.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import poisonPotionIcon from '@/assets/images/poison-potion.png';

const survivorTokenIcon = '/images/survivor_token.png';

const getNotificationDisplay = (notification: GameNotification): { icon: React.ReactNode; text: string; color: string } => {
  const iconStyle = { width: 14, height: 14, objectFit: 'contain' as const };
  const { type, value } = notification;

  switch (type) {
    case 'battle':
      return {
        icon: <img src={swordIcon} alt="" style={iconStyle} />,
        text: `${value} damage`,
        color: '#e07a5f',
      };
    case 'poison':
      return {
        icon: <img src={poisonPotionIcon} alt="" style={iconStyle} />,
        text: `${value} applied`,
        color: gameColors.brightGreen,
      };
    case 'summit_change':
      return {
        icon: <MilitaryTechIcon sx={{ fontSize: 14, color: '#ffd700' }} />,
        text: 'Took Summit',
        color: '#ffd700',
      };
    case 'extra_life':
      return {
        icon: <img src={lifePotionIcon} alt="" style={iconStyle} />,
        text: `+${value} Life`,
        color: '#ff69b4',
      };
    case 'specials':
      return {
        icon: <StarIcon sx={{ fontSize: 14, color: '#ffd700' }} />,
        text: 'Specials',
        color: '#ffd700',
      };
    case 'wisdom':
      return {
        icon: <PsychologyIcon sx={{ fontSize: 14, color: '#60a5fa' }} />,
        text: 'Wisdom',
        color: '#60a5fa',
      };
    case 'diplomacy':
      return {
        icon: <HandshakeIcon sx={{ fontSize: 14, color: '#a78bfa' }} />,
        text: 'Diplomacy',
        color: '#a78bfa',
      };
    case 'spirit':
      return {
        icon: <ElectricBoltIcon sx={{ fontSize: 14, color: '#00ffff' }} />,
        text: `+${value} Spirit`,
        color: '#00ffff',
      };
    case 'luck':
      return {
        icon: <CasinoIcon sx={{ fontSize: 14, color: '#ff69b4' }} />,
        text: `+${value} Luck`,
        color: '#ff69b4',
      };
    case 'bonus_health':
      return {
        icon: <FavoriteIcon sx={{ fontSize: 14, color: '#e05050' }} />,
        text: `+${value} HP`,
        color: '#e05050',
      };
    case 'survivor_earned':
      return {
        icon: <img src={survivorTokenIcon} alt="" style={iconStyle} />,
        text: `+${value} EARNED`,
        color: '#f2cc8f',
      };
    case 'claimed_survivor':
      return {
        icon: <img src={survivorTokenIcon} alt="" style={iconStyle} />,
        text: `${value} CLAIMED`,
        color: '#f2cc8f',
      };
    case 'claimed_corpses':
      return {
        icon: <img src={corpseTokenIcon} alt="" style={iconStyle} />,
        text: `${value} CLAIMED`,
        color: '#f2cc8f',
      };
    case 'claimed_skulls':
      return {
        icon: <img src={killTokenIcon} alt="" style={iconStyle} />,
        text: `${value} CLAIMED`,
        color: '#f2cc8f',
      };
    case 'kill':
      return {
        icon: <EmojiEventsIcon sx={{ fontSize: 14, color: '#ffd700' }} />,
        text: 'Adventurer Slain',
        color: '#ffd700',
      };
    case 'locked':
      return {
        icon: <HeartBrokenIcon sx={{ fontSize: 14, color: '#ff4444' }} />,
        text: 'Locked',
        color: '#ff4444',
      };
    default:
      return {
        icon: null,
        text: type,
        color: '#fff',
      };
  }
};

const NotificationItem = ({ notification }: { notification: GameNotification }) => {
  const display = getNotificationDisplay(notification);
  const player = notification.playerName || '';

  return (
    <Box sx={styles.notificationItem}>
      {/* Beast image on left */}
      {notification.beastImageSrc && (
        <Box sx={styles.beastImageContainer}>
          <img src={notification.beastImageSrc} alt="" style={styles.beastImage as React.CSSProperties} />
        </Box>
      )}

      {/* Right side content */}
      <Box sx={styles.rightContent}>
        {/* Row 1: Player name */}
        {player && (
          <Typography sx={styles.playerText}>
            {player}
          </Typography>
        )}

        {/* Row 2: Icon + text */}
        <Box sx={styles.actionRow}>
          <Box sx={styles.iconContainer}>
            {display.icon}
          </Box>
          <Typography sx={[styles.labelText, { color: display.color }]}>
            {display.text}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const GameNotificationFeed = () => {
  const { gameNotifications } = useGameStore();

  const visibleNotifications = gameNotifications.slice(-4);

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
    right: '10px',
    bottom: '215px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    zIndex: 100,
    pointerEvents: 'none',
    maxHeight: '40vh',
    overflow: 'hidden',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '180px',
    background: `linear-gradient(135deg, ${gameColors.darkGreen}f0 0%, ${gameColors.mediumGreen}e0 100%)`,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${gameColors.accentGreen}50`,
    borderRadius: '6px',
    padding: '6px 10px',
    boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4)`,
  },
  beastImageContainer: {
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
  rightContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  playerText: {
    fontSize: '10px',
    fontWeight: 700,
    color: gameColors.brightGreen,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelText: {
    fontSize: '11px',
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

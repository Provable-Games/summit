import { gameColors } from '@/utils/themes';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { IconButton } from '@mui/material';
import { isMobile } from 'react-device-detect';

interface LeaderboardButtonProps {
  onClick?: () => void;
}

const LeaderboardButton = ({ onClick }: LeaderboardButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      sx={styles.iconButton}
    >
      <LeaderboardIcon sx={styles.icon} />
    </IconButton>
  );
};

export default LeaderboardButton;

const styles = {
  iconButton: {
    width: isMobile ? '48px' : '42px',
    height: isMobile ? '48px' : '42px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    boxShadow: `
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.mediumGreen}90`,
      borderColor: gameColors.brightGreen,
      transform: 'translateY(-1px)',
      boxShadow: `
        0 6px 16px rgba(0, 0, 0, 0.5),
        0 0 12px ${gameColors.brightGreen}40
      `,
    },
  },
  icon: {
    color: gameColors.yellow,
    fontSize: isMobile ? '26px' : '22px',
  },
};
import { gameColors } from '@/utils/themes';
import DescriptionIcon from '@mui/icons-material/Description';
import { Box, IconButton, Typography } from '@mui/material';
import { isMobile } from 'react-device-detect';

interface BeastBoardProps {
  onClick?: () => void;
}

const BeastBoard = ({ onClick }: BeastBoardProps) => {
  return (
    <IconButton
      onClick={onClick}
      sx={styles.iconButton}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <DescriptionIcon sx={styles.icon} />
        <Typography sx={styles.title}>
          Quests
        </Typography>
      </Box>
    </IconButton>
  );
};

export default BeastBoard;

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
  title: {
    fontSize: '10px',
    fontWeight: 'bold',
    lineHeight: '10px',
    color: gameColors.yellow,
  },
};
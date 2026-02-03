import questIcon from '@/assets/images/quest.png';
import { gameColors } from '@/utils/themes';
import { Box, IconButton, Typography } from '@mui/material';
import { isMobile } from 'react-device-detect';

interface QuestBoardProps {
  onClick?: () => void;
}

const QuestBoard = ({ onClick }: QuestBoardProps) => {
  return (
    <IconButton
      onClick={onClick}
      sx={styles.iconButton}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pb: '6px' }}>
        <img src={questIcon} alt="quests" style={styles.icon} />
        <Typography sx={styles.title}>
          Quests
        </Typography>
      </Box>
    </IconButton>
  );
};

export default QuestBoard;

const styles = {
  iconButton: {
    width: '46px',
    height: '46px',
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
    width: '32px',
    height: '32px',
    objectFit: 'contain' as const,
  },
  title: {
    fontSize: '10px',
    fontWeight: 'bold',
    lineHeight: '2px',
    color: gameColors.yellow,
  },
};
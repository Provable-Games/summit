import questIcon from '@/assets/images/quest.png';
import { gameColors } from '@/utils/themes';
import { Box, IconButton, Tooltip, Typography, keyframes } from '@mui/material';
import { useEffect, useState } from 'react';

const QUESTS_TOOLTIP_DISMISSED_KEY = 'summit_quests_tooltip_dismissed';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 8px ${gameColors.yellow}80, 0 0 16px ${gameColors.yellow}40;
  }
  50% {
    box-shadow: 0 0 16px ${gameColors.yellow}, 0 0 32px ${gameColors.yellow}80;
  }
`;

interface QuestBoardProps {
  onClick?: () => void;
}

const QuestBoard = ({ onClick }: QuestBoardProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(QUESTS_TOOLTIP_DISMISSED_KEY);
    if (!dismissed) {
      // Small delay so it feels more intentional
      const timer = setTimeout(() => setShowTooltip(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = () => {
    if (showTooltip) {
      localStorage.setItem(QUESTS_TOOLTIP_DISMISSED_KEY, 'true');
      setShowTooltip(false);
    }
    onClick?.();
  };

  return (
    <Tooltip
      open={showTooltip}
      title={
        <Box sx={styles.tooltipContent}>
          <Typography sx={styles.tooltipText}>
            ✨ Complete quests and earn rewards!
          </Typography>
        </Box>
      }
      arrow
      placement="left"
      slotProps={{
        tooltip: {
          sx: styles.tooltip,
        },
        arrow: {
          sx: styles.tooltipArrow,
        },
      }}
    >
      <IconButton
        onClick={handleClick}
        sx={{
          ...styles.iconButton,
          ...(showTooltip && styles.iconButtonHighlight),
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pb: '6px' }}>
          <img src={questIcon} alt="quests" style={styles.icon} />
          <Typography sx={styles.title}>
            Quests
          </Typography>
        </Box>
      </IconButton>
    </Tooltip>
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
  iconButtonHighlight: {
    border: `2px solid ${gameColors.yellow}`,
    animation: `${pulseGlow} 2s ease-in-out infinite`,
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
  tooltip: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    border: `2px solid ${gameColors.yellow}`,
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 20px ${gameColors.yellow}30`,
    maxWidth: '200px',
  },
  tooltipArrow: {
    color: gameColors.yellow,
    '&::before': {
      border: `1px solid ${gameColors.yellow}`,
      background: gameColors.mediumGreen,
    },
  },
  tooltipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: '13px',
    fontWeight: 600,
    color: gameColors.yellow,
    lineHeight: 1.4,
  },
  tooltipSubtext: {
    fontSize: '11px',
    color: gameColors.accentGreen,
    opacity: 0.9,
  },
};
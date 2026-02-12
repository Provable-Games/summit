import { useState } from 'react';
import { Box, IconButton, Drawer, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ProfileCard from './ProfileCard';
import ClaimRewardsButton from './ClaimRewardsButton';
import QuestBoard from './QuestBoard';
import LeaderboardButton from './LeaderboardButton';
import LeaderboardModal from './dialogs/LeaderboardModal';
import QuestsModal from './dialogs/QuestsModal';
import { gameColors } from '@/utils/themes';
import { useAccount } from '@starknet-react/core';
import RewardsRemainingBar from './RewardsRemainingBar';

const BurgerMenu = () => {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [questsModalOpen, setQuestsModalOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <>
      <IconButton
        onClick={toggleDrawer(true)}
        sx={styles.burgerButton}
        size="large"
      >
        <MenuIcon sx={styles.burgerIcon} />
      </IconButton>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={toggleDrawer(false)}
        sx={styles.drawer}
        slotProps={{
          paper: {
            sx: styles.drawerPaper
          }
        }}
      >
        <Box sx={styles.drawerContent}>
          <Box sx={styles.drawerHeader}>
            <Typography variant="h6" sx={styles.drawerTitle}>
              Profile
            </Typography>
            <IconButton
              onClick={toggleDrawer(false)}
              sx={styles.closeButton}
              size="small"
            >
              <CloseIcon sx={styles.closeIcon} />
            </IconButton>
          </Box>

          <Box sx={styles.profileContainer}>
            <ProfileCard />
          </Box>

          <Box sx={styles.rewardsContainer}>
            <RewardsRemainingBar variant="compact" />
          </Box>

          {address && (
            <Box sx={styles.buttonContainer}>
              <ClaimRewardsButton />
              <QuestBoard onClick={() => {
                setIsOpen(false);
                setQuestsModalOpen(true);
              }} />
              <LeaderboardButton onClick={() => {
                setIsOpen(false);
                setLeaderboardModalOpen(true);
              }} />
            </Box>
          )}
        </Box>
      </Drawer>

      {questsModalOpen && (
        <QuestsModal
          open={questsModalOpen}
          onClose={() => setQuestsModalOpen(false)}
        />
      )}

      {leaderboardModalOpen && (
        <LeaderboardModal
          open={leaderboardModalOpen}
          onClose={() => setLeaderboardModalOpen(false)}
        />
      )}
    </>
  );
};

export default BurgerMenu;

const styles = {
  burgerButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 1000,
    backgroundColor: `${gameColors.darkGreen}90`,
    borderRadius: '8px',
  },
  burgerIcon: {
    color: gameColors.gameYellow,
    fontSize: '18px',
  },
  drawer: {
    '& .MuiDrawer-paper': {
      backgroundColor: 'transparent',
    },
  },
  drawerPaper: {
    backgroundColor: `${gameColors.darkGreen}95`,
    backdropFilter: 'blur(20px) saturate(1.3)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRight: 'none',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    boxShadow: `
      -4px 0 20px rgba(0, 0, 0, 0.6),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    width: '280px',
  },
  drawerContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${gameColors.accentGreen}40`,
  },
  drawerTitle: {
    color: gameColors.gameYellow,
    fontWeight: 'bold',
    fontSize: '18px',
    letterSpacing: '1px',
  },
  closeButton: {
    color: gameColors.gameYellow,
    backgroundColor: 'transparent',
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    padding: '4px',
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}30`,
      border: `1px solid ${gameColors.brightGreen}`,
    },
  },
  closeIcon: {
    fontSize: '20px',
  },
  profileContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  rewardsContainer: {
    boxSizing: 'border-box',
    marginBottom: '20px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '10px',
    width: '100%',
    justifyContent: 'space-evenly',
  },
};

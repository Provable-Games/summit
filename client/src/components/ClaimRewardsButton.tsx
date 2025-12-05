import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { Badge, Box, Button, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import { isMobile } from 'react-device-detect';
import ClaimCorpseReward from './dialogs/ClaimCorpseReward';
import ClaimStarterPack from './dialogs/ClaimStarterPack';

const ClaimRewardsButton = () => {
  const { collection, adventurerCollection } = useGameStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [claimStarterPackDialog, setClaimStarterPackDialog] = useState(false);
  const [claimCorpseRewardDialog, setClaimCorpseRewardDialog] = useState(false);

  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_potions || beast.adventurers_killed > beast.kills_claimed);
  const unclaimedCorpseTokens = adventurerCollection.reduce((sum, adventurer) => sum + adventurer.level, 0);
  const totalRewards = unclaimedBeasts.length + (unclaimedCorpseTokens > 0 ? 1 : 0);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClaimBeastReward = () => {
    setClaimStarterPackDialog(true);
    handleClose();
  };

  const handleClaimCorpseReward = () => {
    setClaimCorpseRewardDialog(true);
    handleClose();
  };

  if (totalRewards === 0) {
    return null;
  }

  return (
    <>
      <Badge
        badgeContent={totalRewards}
        color="error"
        sx={styles.badge}
      >
        <IconButton
          onClick={handleClick}
          sx={styles.iconButton}
        >
          <CardGiftcardIcon sx={styles.icon} />
        </IconButton>
      </Badge>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: styles.menu,
          },
        }}
      >
        {unclaimedBeasts.length > 0 && (
          <MenuItem sx={styles.menuItem}>
            <Box sx={styles.menuItemContent}>
              <Box sx={styles.menuItemInfo}>
                <Typography sx={styles.menuItemTitle}>Beast Reward</Typography>
                <Typography sx={styles.menuItemSubtitle}>{unclaimedBeasts.length} available</Typography>
              </Box>
              <Button sx={styles.claimButton} onClick={handleClaimBeastReward}>
                <Typography sx={styles.claimButtonText}>CLAIM</Typography>
              </Button>
            </Box>
          </MenuItem>
        )}

        {unclaimedCorpseTokens > 0 && (
          <MenuItem sx={styles.menuItem}>
            <Box sx={styles.menuItemContent}>
              <Box sx={styles.menuItemInfo}>
                <Typography sx={styles.menuItemTitle}>Corpse Token</Typography>
                <Typography sx={styles.menuItemSubtitle}>{unclaimedCorpseTokens} available</Typography>
              </Box>
              <Button sx={styles.claimButton} onClick={handleClaimCorpseReward}>
                <Typography sx={styles.claimButtonText}>CLAIM</Typography>
              </Button>
            </Box>
          </MenuItem>
        )}
      </Menu>

      {claimStarterPackDialog && (
        <ClaimStarterPack
          open={claimStarterPackDialog}
          close={() => setClaimStarterPackDialog(false)}
        />
      )}

      {claimCorpseRewardDialog && (
        <ClaimCorpseReward
          open={claimCorpseRewardDialog}
          close={() => setClaimCorpseRewardDialog(false)}
        />
      )}
    </>
  );
};

export default ClaimRewardsButton;

const styles = {
  badge: {
    '& .MuiBadge-badge': {
      backgroundColor: gameColors.red,
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '10px',
      right: 4,
      top: 4,
    },
  },
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
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  icon: {
    color: gameColors.yellow,
    fontSize: isMobile ? '26px' : '22px',
  },
  menu: {
    mt: 0.5,
    background: `${gameColors.darkGreen}99`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
  },
  menuItem: {
    cursor: 'default',
  },
  menuItemContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 1,
  },
  menuItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  menuItemTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
  },
  menuItemSubtitle: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
  },
  claimButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '4px',
    width: '100%',
    height: '28px',
    border: `1px solid ${gameColors.brightGreen}`,
    transition: 'all 0.2s ease',
    boxShadow: `0 0 8px ${gameColors.brightGreen}40`,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `0 0 12px ${gameColors.brightGreen}60`,
      transform: 'translateY(-1px)',
    },
  },
  claimButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '11px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    textTransform: 'uppercase',
  },
};
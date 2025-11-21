import { useController } from '@/contexts/controller';
import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { ellipseAddress, formatRewardNumber } from '@/utils/utils';
import killTokenImg from '@/assets/images/kill-token.png';
import corpseTokenImg from '@/assets/images/corpse-token.png';
import LogoutIcon from '@mui/icons-material/Logout';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useState } from 'react';
import { isMobile } from 'react-device-detect';
import ClaimStarterPack from './dialogs/ClaimStarterPack';
import { addAddressPadding } from 'starknet';
import ClaimCorpseReward from './dialogs/ClaimCorpseReward';
import BeastDexModal from './dialogs/BeastDexModal';

const ProfileCard = () => {
  const { collection, adventurerCollection, leaderboard, onboarding, loadingCollection } = useGameStore()
  const { address, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { playerName, openProfile } = useController()
  const { connect, connectors } = useConnect();

  let cartridgeConnector = connectors.find(conn => conn.id === "controller")

  const [claimStarterPackDialog, setClaimStarterPackDialog] = useState(false)
  const [claimCorpseRewardDialog, setClaimCorpseRewardDialog] = useState(false)
  const [beastDexOpen, setBeastDexOpen] = useState(false)
  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_potions || beast.adventurers_killed > beast.kills_claimed)
  const unclaimedCorpseTokens = adventurerCollection.reduce((sum, adventurer) => sum + adventurer.level, 0)
  const isCartridge = connector?.id === 'controller'
  const killTokens = tokenBalances["KILL"] || 0
  const corpseTokens = tokenBalances["CORPSE"] || 0

  const handleProfileClick = async () => {
    if (address && isCartridge) {
      openProfile()
    } else {
      await navigator.clipboard.writeText(address)
    }
  }

  if (!address) {
    return <>
      <Button sx={styles.connectButton} onClick={() => connect({ connector: cartridgeConnector })} size='large' startIcon={<SportsEsportsIcon htmlColor='white' />}>
        <Typography sx={styles.connectButtonText}>
          CONNECT WALLET
        </Typography>
      </Button>
    </>
  }

  return (
    <Box sx={styles.container}>
      <Box sx={styles.profileContainer}>
        <Tooltip title={!isCartridge ? <Box sx={styles.tooltip}>Copy address</Box> : undefined}>
          <Button variant='text' sx={styles.addressButton} onClick={handleProfileClick}>
            <SportsEsportsIcon sx={styles.gameIcon} />
            <Typography sx={styles.addressText}>
              {playerName || ellipseAddress(address, 5, 4)}
            </Typography>
          </Button>
        </Tooltip>

        <Box sx={{ display: 'flex' }}>
          <Tooltip title={<Box sx={styles.tooltip}>Disconnect</Box>}>
            <IconButton size={isMobile ? 'medium' : 'small'} sx={styles.logoutButton} onClick={() => { disconnect(); }}>
              <LogoutIcon fontSize={isMobile ? 'medium' : 'small'} sx={styles.logoutIcon} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!onboarding && !loadingCollection && <>
        <Box display={'flex'} width={'100%'}>
          <Box sx={[styles.infoSection, styles.leftSection]}>
            <Typography sx={styles.infoLabel}>SCORE</Typography>

            <Box display={'flex'} alignItems={'start'}>
              <Typography sx={styles.infoValue}>
                {formatRewardNumber((leaderboard.find(player => addAddressPadding(player.owner) === addAddressPadding(address))?.amount || 0) / 100)}
              </Typography>
            </Box>
          </Box>

          <Box sx={[styles.infoSection, styles.rightSection]}>
            <Typography sx={styles.infoLabel}>BEASTS</Typography>

            <Box display={'flex'} alignItems={'start'}>
              <Typography sx={styles.infoValue}>{collection.length}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={styles.tokensSection}>
          <Box sx={styles.tokens}>
            <Box sx={styles.tokenItem} borderRight={`1px solid ${gameColors.accentGreen}40`}>
              <img src={killTokenImg} alt="Kill" style={{ width: '18px', height: '18px' }} />
              <Box sx={styles.tokenTexts}>
                <Typography sx={styles.tokenValue}>{killTokens.toLocaleString()}</Typography>
              </Box>
            </Box>
            <Box sx={styles.tokenItem} borderRight={`1px solid ${gameColors.accentGreen}00`}>
              <img src={corpseTokenImg} alt="Corpse" style={{ width: '18px', height: '18px' }} />
              <Box sx={styles.tokenTexts}>
                <Typography sx={styles.tokenValue}>{corpseTokens.toLocaleString()}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={styles.upgradeSection}>
          <Button sx={[styles.upgradeButton, { animation: 'none', width: isMobile ? '100%' : '145px' }]} onClick={() => setBeastDexOpen(true)}>
            <Typography sx={styles.upgradeButtonText}>
              UPGRADE BEASTS
            </Typography>
          </Button>
        </Box>

        {unclaimedBeasts.length > 0 && <Box sx={styles.starterPackSection}>
          <Typography sx={styles.starterPackTitle}>
            BEAST REWARD
          </Typography>

          <Typography sx={styles.starterPackSubtitle}>
            {unclaimedBeasts.length} available
          </Typography>

          <Button sx={styles.claimButton} onClick={() => setClaimStarterPackDialog(true)}>
            <Typography sx={styles.claimButtonText}>
              CLAIM
            </Typography>
          </Button>
        </Box>}

        {unclaimedCorpseTokens > 0 && <Box sx={styles.upgradeSection}>
          <Typography sx={styles.starterPackTitle} pt={0.5}>
            CORPSE TOKEN
          </Typography>

          <Typography sx={styles.starterPackSubtitle}>
            {unclaimedCorpseTokens} available
          </Typography>

          <Button sx={styles.upgradeButton} onClick={() => setClaimCorpseRewardDialog(true)}>
            <Typography sx={styles.upgradeButtonText}>
              CLAIM
            </Typography>
          </Button>
        </Box>}

        {claimStarterPackDialog && <ClaimStarterPack open={claimStarterPackDialog} close={() => setClaimStarterPackDialog(false)} />}
        {claimCorpseRewardDialog && <ClaimCorpseReward open={claimCorpseRewardDialog} close={() => setClaimCorpseRewardDialog(false)} />}
        {beastDexOpen && <BeastDexModal open={beastDexOpen} close={() => setBeastDexOpen(false)} />}
      </>}
    </Box>
  )
}

export default ProfileCard

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: isMobile ? '100%' : '180px',
    borderRadius: '8px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    boxShadow: `
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    boxSizing: 'border-box',
    px: 1,
    py: '6px'
  },
  connectButton: {
    background: `${gameColors.mediumGreen}90`,
    border: `1px solid ${gameColors.accentGreen}60`,
    borderRadius: '20px',
    padding: '8px 16px',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.mediumGreen}`,
      border: `1px solid ${gameColors.brightGreen}`,
      boxShadow: `0 0 12px ${gameColors.brightGreen}40`,
    },
  },
  connectButtonText: {
    color: '#ffedbb',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  profileContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottom: `1px solid ${gameColors.accentGreen}40`,
    pb: isMobile ? '8px' : '4px',
  },
  addressButton: {
    display: 'flex',
    textTransform: 'none',
    padding: isMobile ? '8px 16px' : '2px 8px',
    border: `1px solid #ffedbb`,
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}30`,
      border: `1px solid #ffedbb`,
    },
  },
  gameIcon: {
    fontSize: '18px',
    mr: '4px',
    color: '#ffedbb',
  },
  addressText: {
    fontSize: '13px',
    letterSpacing: '0.5px',
    color: '#ffedbb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutButton: {
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}30`,
    },
  },
  logoutIcon: {
    color: '#ffedbb',
  },
  tooltip: {
    background: `${gameColors.darkGreen}`,
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}60`,
    color: '#ffedbb',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '50%',
    justifyContent: 'space-between',
    py: 0.5,
    gap: '2px',
    boxSizing: 'border-box',
  },
  leftSection: {
    borderRight: `1px solid ${gameColors.accentGreen}40`,
    pr: 1,
  },
  rightSection: {
    pl: 1,
  },
  infoLabel: {
    fontSize: '11px',
    letterSpacing: '0.5px',
    color: gameColors.gameYellow,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
    mb: '2px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  actionButton: {
    backgroundColor: `${gameColors.mediumGreen}80`,
    color: '#ffedbb',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: `1px solid ${gameColors.accentGreen}40`,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}`,
      border: `1px solid ${gameColors.brightGreen}`,
    },
  },
  starterPackSection: {
    width: '100%',
    borderTop: `1px solid ${gameColors.accentGreen}40`,
    pt: 1,
    textAlign: 'center',
  },
  starterPackTitle: {
    fontSize: '12px',
    letterSpacing: '0.5px',
    color: gameColors.gameYellow,
    fontWeight: 'bold',
  },
  starterPackSubtitle: {
    color: gameColors.yellow,
    fontSize: '11px',
    mt: '-2px',
    letterSpacing: '0.5px',
  },
  claimButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '6px',
    width: isMobile ? '100%' : '100px',
    height: isMobile ? '40px' : '28px',
    my: '6px',
    border: `2px solid ${gameColors.brightGreen}`,
    transition: 'all 0.3s ease',
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}50,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    animation: 'claimGlow 1.5s ease-in-out infinite',
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 30px ${gameColors.brightGreen}80,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      animation: 'claimGlowHover 0.8s ease-in-out infinite',
    },
    '@keyframes claimGlow': {
      '0%': {
        boxShadow: `
          0 0 15px ${gameColors.brightGreen}40,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '25%': {
        boxShadow: `
          0 0 25px ${gameColors.brightGreen}60,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '50%': {
        boxShadow: `
          0 0 40px ${gameColors.brightGreen}90,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '75%': {
        boxShadow: `
          0 0 25px ${gameColors.brightGreen}60,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '100%': {
        boxShadow: `
          0 0 15px ${gameColors.brightGreen}40,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
    },
    '@keyframes claimGlowHover': {
      '0%': {
        boxShadow: `
          0 0 30px ${gameColors.brightGreen}80,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
      '50%': {
        boxShadow: `
          0 0 45px ${gameColors.brightGreen}100,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
      '100%': {
        boxShadow: `
          0 0 30px ${gameColors.brightGreen}80,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
    },
  },
  claimButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  tokensSection: {
    width: '100%',
    borderTop: `1px solid ${gameColors.accentGreen}40`,
    pt: 0.5,
  },
  tokens: {
    display: 'flex',
    width: '100%',
    py: 0.5,
  },
  tokenItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    justifyContent: 'center',
  },
  tokenTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  tokenLabel: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    lineHeight: '10px',
  },
  tokenValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    lineHeight: '14px',
  },
  upgradeSection: {
    width: '100%',
    borderTop: `1px solid ${gameColors.accentGreen}40`,
    mt: 0.5,
    textAlign: 'center',
  },
  upgradeTitle: {
    fontSize: '12px',
    letterSpacing: '0.5px',
    color: gameColors.brightGreen,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  upgradeSubtitle: {
    color: gameColors.lightGreen,
    fontSize: '11px',
    mt: '-2px',
    letterSpacing: '0.5px',
  },
  upgradeButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '6px',
    width: isMobile ? '100%' : '100px',
    height: isMobile ? '40px' : '28px',
    my: '6px',
    border: `2px solid ${gameColors.brightGreen}`,
    transition: 'all 0.3s ease',
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}50,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    animation: 'upgradeGlow 1.5s ease-in-out infinite',
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 30px ${gameColors.brightGreen}80,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      animation: 'upgradeGlowHover 0.8s ease-in-out infinite',
    },
    '@keyframes upgradeGlow': {
      '0%': {
        boxShadow: `
          0 0 15px ${gameColors.brightGreen}40,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '50%': {
        boxShadow: `
          0 0 30px ${gameColors.brightGreen}70,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
      '100%': {
        boxShadow: `
          0 0 15px ${gameColors.brightGreen}40,
          0 2px 4px rgba(0, 0, 0, 0.3)
        `,
      },
    },
    '@keyframes upgradeGlowHover': {
      '0%': {
        boxShadow: `
          0 0 30px ${gameColors.brightGreen}80,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
      '50%': {
        boxShadow: `
          0 0 45px ${gameColors.brightGreen}100,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
      '100%': {
        boxShadow: `
          0 0 30px ${gameColors.brightGreen}80,
          0 4px 8px rgba(0, 0, 0, 0.4)
        `,
      },
    },
  },
  upgradeButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
  },
}
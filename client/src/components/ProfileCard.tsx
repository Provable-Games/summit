import attackPotionImg from '@/assets/images/attack-potion.png';
import corpseTokenImg from '@/assets/images/corpse-token.png';
import killTokenImg from '@/assets/images/kill-token.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import starkImg from '@/assets/images/stark.svg';
import { useController } from '@/contexts/controller';
import { useSound } from '@/contexts/sound';
import { useStatistics } from '@/contexts/Statistics';
import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { ellipseAddress } from '@/utils/utils';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import VolumeOff from '@mui/icons-material/VolumeOff';
import VolumeUp from '@mui/icons-material/VolumeUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Button, Divider, IconButton, Popover, Skeleton, Slider, Switch, Tooltip, Typography } from '@mui/material';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useState } from 'react';
import { isMobile } from 'react-device-detect';
import BeastDexModal from './dialogs/BeastDexModal';
import MarketplaceModal from './dialogs/MarketplaceModal';
import TopUpStrkModal from './dialogs/TopUpStrkModal';

const ProfileCard = () => {
  const { collection, loadingCollection, summitEnded } = useGameStore()
  const { address, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { playerName, tokenBalances, openProfile, gasSpent } = useController()
  const { tokenPrices } = useStatistics();
  const { connect, connectors } = useConnect();

  const cartridgeConnector = connectors.find(conn => conn.id === "controller")

  const { muted, setMuted, volume, setVolume } = useSound()

  const [beastDexOpen, setBeastDexOpen] = useState(false)
  const [potionShopOpen, setPotionShopOpen] = useState(false)
  const [topUpStrkOpen, setTopUpStrkOpen] = useState(false)
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null)
  const isCartridge = connector?.id === 'controller'
  const killTokens = tokenBalances["SKULL"] || 0
  const corpseTokens = tokenBalances["CORPSE"] || 0
  const strkBalance = tokenBalances["STRK"]
  const isLowGas = false // strkBalance !== undefined && strkBalance < 10

  const renderPotionItem = (imgSrc: string, tokenName: string) => {
    const price = tokenPrices[tokenName]

    return <Box sx={styles.potionItem}>
      <img src={imgSrc} alt={tokenName} style={{ width: '24px', height: '24px' }} />
      {price
        ? <Typography sx={styles.potionPrice}>${price}</Typography>
        : <Skeleton variant="text" width={40} sx={{ bgcolor: 'grey.700' }} />
      }
    </Box>
  }

  const handleProfileClick = async () => {
    if (address && isCartridge) {
      openProfile()
    } else {
      await navigator.clipboard.writeText(address)
    }
  }

  const RenderMarketplace = () => {
    return <>
      <Box sx={styles.potionsSection}>
        <Box sx={styles.potionPrices}>
          <Box sx={styles.potionRow}>
            {renderPotionItem(attackPotionImg, "ATTACK")}
            {renderPotionItem(lifePotionImg, "EXTRA LIFE")}
          </Box>
          <Box sx={styles.potionRow}>
            {renderPotionItem(poisonPotionImg, "POISON")}
            {renderPotionItem(revivePotionImg, "REVIVE")}
          </Box>
          <Box sx={styles.potionRow}>
            {renderPotionItem(killTokenImg, "SKULL")}
            {renderPotionItem(corpseTokenImg, "CORPSE")}
          </Box>
        </Box>
        <Button id="marketplace-button" sx={[styles.buyPotionsButton, { width: isMobile ? '100%' : '145px' }]} onClick={() => setPotionShopOpen(true)}>
          <Typography sx={styles.buyPotionsButtonText}>
            MARKETPLACE
          </Typography>
        </Button>
      </Box>
      {potionShopOpen && <MarketplaceModal open={potionShopOpen} close={() => setPotionShopOpen(false)} />}
    </>
  }

  if (!address) {
    return <Box sx={styles.container}>
      <Button sx={styles.connectButton} onClick={() => connect({ connector: cartridgeConnector })} size='large' startIcon={<SportsEsportsIcon htmlColor='white' />}>
        <Typography sx={styles.connectButtonText}>
          CONNECT WALLET
        </Typography>
      </Button>

      {RenderMarketplace()}
    </Box>
  }

  return (
    <Box sx={styles.container}>
      <Box sx={styles.profileContainer}>
        <Button variant='text' sx={styles.addressButton} onClick={handleProfileClick}>
          <SportsEsportsIcon sx={styles.gameIcon} />
          <Typography sx={styles.addressText}>
            {playerName || ellipseAddress(address, 5, 4)}
          </Typography>
        </Button>

        <Box sx={{ display: 'flex' }}>
          <IconButton sx={styles.settingsButton} onClick={(e) => setSettingsAnchor(e.currentTarget)}>
            <SettingsIcon fontSize={isMobile ? 'medium' : 'small'} sx={{ color: '#ffedbb' }} />
          </IconButton>

          <Popover
            open={Boolean(settingsAnchor)}
            anchorEl={settingsAnchor}
            onClose={() => setSettingsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: styles.settingsPopover } }}
          >
            <Box sx={styles.settingsSection}>
              <Box sx={styles.settingsRow}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {muted ? <VolumeOff sx={{ fontSize: '16px', color: '#ffedbb' }} /> : <VolumeUp sx={{ fontSize: '16px', color: '#ffedbb' }} />}
                  <Typography sx={styles.settingsLabel}>Sound</Typography>
                </Box>
                <Switch
                  checked={!muted}
                  onChange={(e) => setMuted(!e.target.checked)}
                  size="small"
                  sx={styles.switch}
                />
              </Box>
              <Slider
                value={Math.round(volume * 100)}
                onChange={(_, v) => setVolume((v as number) / 100)}
                min={0}
                max={100}
                step={1}
                disabled={muted}
                size="small"
                sx={styles.volumeSlider}
              />
            </Box>

            <Divider sx={{ borderColor: `${gameColors.accentGreen}30` }} />

            <Box sx={{ px: '6px', pb: '6px', pt: '4px' }}>
              <Button
                variant="text"
                fullWidth
                startIcon={<LogoutIcon sx={{ fontSize: '14px' }} />}
                onClick={() => { setSettingsAnchor(null); disconnect(); }}
                sx={styles.disconnectButton}
              >
                Disconnect
              </Button>
            </Box>
          </Popover>
        </Box>
      </Box>

      {!loadingCollection && <>
        <Box display={'flex'} width={'100%'}>
          <Tooltip
            title={
              <Box sx={styles.strkTooltip}>
                {isLowGas && (
                  <Box sx={styles.lowGasTooltipHeader}>
                    <WarningAmberIcon sx={{ fontSize: '16px', color: '#ff9800' }} />
                    <Typography sx={styles.lowGasTooltipTitle}>Low on Gas!</Typography>
                  </Box>
                )}
                <Typography
                  sx={styles.topUpLink}
                  onClick={() => setTopUpStrkOpen(true)}
                >
                  Top up STRK
                </Typography>
              </Box>
            }
            placement="left"
          >
            <Box sx={[styles.infoSection, styles.leftSection, gasSpent && styles.gasSpentContainer]}>
              <Typography sx={styles.infoLabel}>STRK (gas)</Typography>

              <Box display={'flex'} alignItems={'center'} gap={0.5} position={'relative'}>
                <Box
                  component="img"
                  src={starkImg}
                  alt="STRK"
                  sx={[
                    { width: '14px', height: '14px', pb: '4px' },
                    gasSpent && styles.gasIconPulse
                  ]}
                />
                {strkBalance !== undefined
                  ? <>
                    <Typography sx={[styles.infoValue, isLowGas && { color: '#ff9800' }, gasSpent && styles.gasSpentValue]}>
                      {strkBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    {/* <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setTopUpStrkOpen(true); }}
                      sx={styles.topUpIcon}
                    >
                      <AddCircleOutlineIcon sx={{ fontSize: '14px' }} />
                    </IconButton> */}
                  </>
                  : <Skeleton variant="text" width={40} sx={{ bgcolor: 'grey.700' }} />
                }
                {/* Gas spent floating animation */}
                {gasSpent && (
                  <Box sx={styles.gasSpentBadge}>
                    <Typography sx={styles.gasSpentText}>
                      -{gasSpent.toFixed(3)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Tooltip>

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
              <img src={killTokenImg} alt="SKULL" style={{ width: '18px', height: '18px' }} />
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

        {!summitEnded && <>
          <Box sx={styles.upgradeSection}>
            <Button sx={[styles.upgradeButton, { animation: 'none', width: isMobile ? '100%' : '145px' }]} onClick={() => setBeastDexOpen(true)}>
              <Typography sx={styles.upgradeButtonText}>
                UPGRADE BEASTS
              </Typography>
            </Button>
          </Box>

          {RenderMarketplace()}
        </>}

        {beastDexOpen && <BeastDexModal open={beastDexOpen} close={() => setBeastDexOpen(false)} />}
        {topUpStrkOpen && <TopUpStrkModal open={topUpStrkOpen} close={() => setTopUpStrkOpen(false)} />}
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
    mb: 1,
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
    gap: '4px',
    width: '100%',
    borderBottom: `1px solid ${gameColors.accentGreen}40`,
    pb: isMobile ? '8px' : '4px',
  },
  addressButton: {
    display: 'flex',
    flex: 1,
    textTransform: 'none',
    minHeight: '20px !important',
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
  settingsButton: {
    '&:hover': {
      backgroundColor: `${gameColors.mediumGreen}`,
    },
  },
  settingsPopover: {
    background: `${gameColors.darkGreen}f5`,
    backdropFilter: 'blur(12px)',
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: '8px',
    minWidth: '200px',
  },
  settingsSection: {
    padding: '12px 14px',
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 0.5,
  },
  settingsLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
  switch: {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: gameColors.brightGreen,
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: `${gameColors.brightGreen}AA`,
    },
    '& .MuiSwitch-track': {
      backgroundColor: `${gameColors.accentGreen}55`,
    },
  },
  volumeSlider: {
    color: gameColors.gameYellow,
    '& .MuiSlider-thumb': {
      backgroundColor: gameColors.gameYellow,
      width: 14,
      height: 14,
      '&:hover, &.Mui-focusVisible': {
        boxShadow: 'none',
      },
    },
    '& .MuiSlider-track': {
      backgroundColor: gameColors.gameYellow,
      height: 4,
      border: 'none',
    },
    '& .MuiSlider-rail': {
      backgroundColor: `${gameColors.gameYellow}20`,
      height: 4,
    },
    '&.Mui-disabled': {
      color: `${gameColors.gameYellow}40`,
      '& .MuiSlider-thumb': {
        backgroundColor: `${gameColors.gameYellow}40`,
      },
      '& .MuiSlider-track': {
        backgroundColor: `${gameColors.gameYellow}40`,
      },
    },
  },
  disconnectButton: {
    color: '#ffedbb',
    textTransform: 'none',
    fontSize: '12px',
    fontWeight: 600,
    justifyContent: 'flex-start',
    padding: '4px 8px',
    minHeight: 0,
    border: 'none',
    lineHeight: 1,
    borderRadius: '4px',
    opacity: 0.8,
    '&:hover': {
      color: '#ffedbb',
      backgroundColor: `${gameColors.mediumGreen}30`,
      opacity: 1,
    },
  },
  tooltip: {
    background: `${gameColors.darkGreen}`,
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}60`,
    color: '#ffedbb',
  },
  lowGasTooltip: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    border: `2px solid #ff9800`,
    borderRadius: '8px',
    padding: '10px 14px',
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 152, 0, 0.25)`,
  },
  lowGasTooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    mb: 0.5,
  },
  lowGasTooltipTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ff9800',
    letterSpacing: '0.5px',
    flex: 1,
  },
  lowGasTooltipClose: {
    padding: '2px',
    marginLeft: 'auto',
    color: '#ffedbb',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  lowGasTooltipText: {
    fontSize: '12px',
    color: '#ffedbb',
    lineHeight: 1.3,
  },
  lowGasTooltipArrow: {
    padding: 0,
    color: '#ff9800',
    '&::before': {
      border: `1px solid #ff9800`,
      background: gameColors.mediumGreen,
    },
  },
  strkTooltip: {
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: '6px',
    padding: '8px 12px',
    boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4)`,
  },
  topUpLink: {
    fontSize: '12px',
    color: gameColors.brightGreen,
    cursor: 'pointer',
    fontWeight: 'bold',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  topUpIcon: {
    padding: '2px',
    color: gameColors.brightGreen,
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
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
    fontSize: '16px',
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
    pt: 0.5,
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
    mb: '6px',
    mt: '2px',
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
    mb: 0.5,
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
  potionsSection: {
    width: '100%',
    borderTop: `1px solid ${gameColors.accentGreen}40`,
    pt: 1,
    textAlign: 'center',
  },
  potionsTitle: {
    fontSize: '12px',
    letterSpacing: '0.5px',
    color: gameColors.gameYellow,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    py: 0.5,
  },
  potionPrices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    mb: 0.5,
  },
  potionRow: {
    display: 'flex',
    justifyContent: 'space-evenly',
    gap: 0.5,
  },
  potionItem: {
    display: 'flex',
    alignItems: 'center',
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '4px',
    px: 1,
    py: 0.5,
    minWidth: '60px',
    justifyContent: 'center',
  },
  potionPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buyPotionsButton: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    borderRadius: '6px',
    width: isMobile ? '100%' : '100px',
    height: isMobile ? '40px' : '28px',
    mb: '6px',
    border: `2px solid ${gameColors.brightGreen}`,
    transition: 'all 0.3s ease',
    boxShadow: `
      0 0 20px ${gameColors.brightGreen}50,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 30px ${gameColors.brightGreen}80,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
    },
  },
  buyPotionsButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
  },
  gasSpentContainer: {
    animation: 'gasGlow 0.6s ease-out',
    '@keyframes gasGlow': {
      '0%': {
        boxShadow: '0 0 0 0 rgba(255, 107, 107, 0)',
      },
      '30%': {
        boxShadow: '0 0 12px 4px rgba(255, 107, 107, 0.6)',
      },
      '100%': {
        boxShadow: '0 0 0 0 rgba(255, 107, 107, 0)',
      },
    },
  },
  gasSpentValue: {
    animation: 'gasPulse 0.5s ease-out',
    '@keyframes gasPulse': {
      '0%': {
        transform: 'scale(1)',
        color: '#FFD700',
      },
      '25%': {
        transform: 'scale(1.15)',
        color: '#ff6b6b',
      },
      '50%': {
        transform: 'scale(0.95)',
        color: '#ff6b6b',
      },
      '100%': {
        transform: 'scale(1)',
        color: '#FFD700',
      },
    },
  },
  gasSpentBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-35px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    borderRadius: '12px',
    padding: '2px 6px',
    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.5)',
    animation: 'gasFlyUp 2s ease-out forwards',
    zIndex: 10,
    '@keyframes gasFlyUp': {
      '0%': {
        opacity: 1,
        transform: 'translateY(0) scale(1)',
      },
      '20%': {
        opacity: 1,
        transform: 'translateY(-5px) scale(1.1)',
      },
      '80%': {
        opacity: 0.8,
        transform: 'translateY(-20px) scale(0.9)',
      },
      '100%': {
        opacity: 0,
        transform: 'translateY(-30px) scale(0.7)',
      },
    },
  },
  gasSpentText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },
  gasIconPulse: {
    animation: 'iconBurn 0.8s ease-out',
    filter: 'drop-shadow(0 0 4px #ff6b6b)',
    '@keyframes iconBurn': {
      '0%': {
        filter: 'drop-shadow(0 0 0px #ff6b6b)',
        transform: 'scale(1)',
      },
      '30%': {
        filter: 'drop-shadow(0 0 8px #ff6b6b)',
        transform: 'scale(1.2) rotate(-10deg)',
      },
      '60%': {
        filter: 'drop-shadow(0 0 4px #ff6b6b)',
        transform: 'scale(1.1) rotate(5deg)',
      },
      '100%': {
        filter: 'drop-shadow(0 0 0px #ff6b6b)',
        transform: 'scale(1) rotate(0deg)',
      },
    },
  },
}
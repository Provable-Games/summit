import InfoIcon from '@mui/icons-material/Info';
import { Box, Dialog, Tooltip, Typography, Button } from '@mui/material';
import React, { useEffect } from 'react';
import attackPotionIcon from '@/assets/images/attack-potion.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import { useGameStore } from '@/stores/gameStore';
import { useState } from 'react';
import { useGameDirector } from '@/contexts/GameDirector';
import { gameColors } from '@/utils/themes';
import { useController } from '@/contexts/controller';
import { delay } from '@/utils/utils';

const POTIONS = [
  {
    id: 1,
    name: 'revive potion',
    icon: revivePotionIcon,
    description: 'Revives a dead beast. Amount required increases with each revival.',
    packAmount: 5
  },
  {
    id: 2,
    name: 'attack potion',
    icon: attackPotionIcon,
    description: 'Adds 10% damage to a beast\'s next attack. Can be stacked.',
    packAmount: 10
  },
  {
    id: 3,
    name: 'Extra life potion',
    icon: lifePotionIcon,
    description: 'Beast revives to full health instead of dying. Max 127 extra lives.',
    packAmount: 1
  },
]

function ClaimStarterPack(props) {
  const { open, close } = props
  const { executeGameAction, actionFailed } = useGameDirector()
  const { collection } = useGameStore()
  const { fetchTokenBalances, fetchBeastCollection } = useController()
  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_starter_kit).map(beast => beast.token_id)

  const [claimInProgress, setClaimInProgress] = useState(false)

  useEffect(() => {
    setClaimInProgress(false);
  }, [actionFailed]);

  const claimAll = async () => {
    setClaimInProgress(true)

    try {
      await executeGameAction(
        {
          type: "claim_starter_kit",
          beastIds: unclaimedBeasts.slice(0, 150)
        }
      )

      await delay(2000)
      fetchBeastCollection()
      fetchTokenBalances()
    } catch (ex) {
      console.log(ex)
    } finally {
      setClaimInProgress(false)
      close(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => { close(false) }}
      maxWidth={'lg'}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `
          }
        }
      }}
    >

      <Box sx={styles.dialogContainer}>
        <Box sx={styles.container}>

          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={styles.title}>
              Beast Starter Pack
            </Typography>

            <Typography sx={styles.subtitle}>
              You have {unclaimedBeasts.length} unclaimed starter packs.
            </Typography>
          </Box>

          <Box sx={styles.itemsContainer}>
            {React.Children.toArray(
              POTIONS.map(potion => {
                return <Box sx={styles.itemContainer}>
                  <Box sx={styles.itemTitle}>
                    <Typography sx={styles.itemTitleText}>
                      {potion.name}
                    </Typography>
                  </Box>

                  <Box sx={styles.itemContent}>
                    <Box sx={styles.imageContainer}>
                      <img src={potion.icon} alt='' width={'90%'} />
                    </Box>

                    <Box display={'flex'} flexDirection={'column'} gap={0.5}>
                      <Box sx={styles.description}>
                        <Typography sx={styles.descriptionText}>
                          {potion.description}

                          {potion.name === 'revive potion' && <Tooltip title={<Box sx={styles.tooltip}>
                            <Typography sx={styles.tooltipText}>
                              Potions required to revive a beast depends on how many times you have revived it. Up to 16 potions.
                            </Typography>
                          </Box>}>
                            <InfoIcon sx={styles.infoIcon} />
                          </Tooltip>}
                        </Typography>

                      </Box>
                    </Box>
                  </Box>

                  <Box sx={styles.amountContainer}>
                    <Typography sx={styles.amountPrefix}>
                      x
                    </Typography>
                    <Typography sx={styles.amountValue}>
                      {unclaimedBeasts.length * potion.packAmount}
                    </Typography>
                  </Box>
                </Box>
              })
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Button
              disabled={claimInProgress || unclaimedBeasts.length === 0}
              onClick={claimAll}
              sx={[
                styles.claimButton,
                (!claimInProgress && unclaimedBeasts.length > 0) && styles.claimButtonActive
              ]}
            >
              <Typography sx={styles.claimButtonText}>
                {claimInProgress
                  ? <Box display={'flex'} alignItems={'baseline'}>
                    <span>Claiming</span>
                    <div className='dotLoader white' />
                  </Box>
                  : unclaimedBeasts.length > 150 ? 'CLAIM 150' : 'CLAIM ALL'
                }
              </Typography>
            </Button>
          </Box>
        </Box>

      </Box>

    </Dialog >
  )
}

export default ClaimStarterPack

const styles = {
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '800px',
    maxWidth: '98vw',
    p: 4
  },
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  subtitle: {
    fontSize: '16px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  itemsContainer: {
    height: '100%',
    maxWidth: '99%',
    display: 'flex',
    overflowX: 'auto',
    p: 1,
    gap: 2
  },
  itemContainer: {
    width: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.mediumGreen}60`,
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  itemTitle: {
    background: `${gameColors.darkGreen}`,
    width: '100%',
    textAlign: 'center',
    py: 0.5,
    borderBottom: `1px solid ${gameColors.accentGreen}60`,
  },
  itemTitleText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  itemContent: {
    display: 'flex',
    gap: 0.5,
    justifyContent: 'space-between',
    width: '100%',
    px: 0.5,
    boxSizing: 'border-box',
  },
  imageContainer: {
    p: 1,
    width: '90px',
    height: '100%',
    display: 'flex',
    boxSizing: 'border-box',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '5px',
    background: `${gameColors.darkGreen}40`,
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  description: {
    p: '5px',
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    width: '100px',
    minHeight: '100px',
    background: `${gameColors.darkGreen}40`,
  },
  descriptionText: {
    fontSize: '11px',
    lineHeight: '14px',
    letterSpacing: '0.5px',
    color: '#ffedbb',
  },
  amountContainer: {
    my: 2,
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    px: 1,
    boxSizing: 'border-box',
    alignItems: 'baseline',
    gap: '2px',
  },
  amountPrefix: {
    fontSize: '16px',
    color: '#FFD700',
  },
  amountValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '1px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  tooltip: {
    background: `${gameColors.darkGreen}`,
    padding: '8px 12px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}60`,
  },
  tooltipText: {
    color: '#ffedbb',
    fontSize: '12px',
  },
  infoIcon: {
    fontSize: '13px',
    ml: '2px',
    mb: '-2px',
    color: gameColors.brightGreen,
  },
  claimButton: {
    background: `${gameColors.mediumGreen}60`,
    borderRadius: '8px',
    width: '160px',
    height: '48px',
    my: '6px',
    border: `2px solid ${gameColors.accentGreen}60`,
    transition: 'all 0.3s ease',
    opacity: 0.7,
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  claimButtonActive: {
    background: `linear-gradient(135deg, ${gameColors.brightGreen} 0%, ${gameColors.accentGreen} 100%)`,
    border: `2px solid ${gameColors.brightGreen}`,
    opacity: 1,
    boxShadow: `
      0 0 12px ${gameColors.brightGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
    '&:hover': {
      background: `linear-gradient(135deg, ${gameColors.brightGreen} 20%, ${gameColors.lightGreen} 100%)`,
      boxShadow: `
        0 0 16px ${gameColors.brightGreen}60,
        0 4px 8px rgba(0, 0, 0, 0.4)
      `,
      transform: 'translateY(-1px)',
    },
  },
  claimButtonText: {
    color: '#ffedbb',
    letterSpacing: '0.5px',
    fontSize: '14px',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
  },
}
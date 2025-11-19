import attackPotionIcon from '@/assets/images/attack-potion.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import poisonPotionIcon from '@/assets/images/poison-potion.png';
import killTokenIcon from '@/assets/images/kill-token.png';
import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { gameColors } from '@/utils/themes';
import { delay } from '@/utils/utils';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Button, Dialog, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

const POTIONS = [
  {
    id: 1,
    name: 'revive potion',
    icon: revivePotionIcon,
    description: 'Revives a dead beast. Amount required increases with each revival.',
    packMultiplier: 2
  },
  {
    id: 2,
    name: 'attack potion',
    icon: attackPotionIcon,
    description: 'Adds 10% damage to a beast\'s next attack. Can be stacked.',
    packMultiplier: 3
  },
  {
    id: 3,
    name: 'Extra life potion',
    icon: lifePotionIcon,
    description: 'Beast revives to full health instead of dying. Max 255 extra lives.',
    packMultiplier: 1
  },
  {
    id: 4,
    name: 'Poison potion',
    icon: poisonPotionIcon,
    description: 'Poison the summit, dealing 1 damage per second.',
    packMultiplier: 3
  },
]

const LIMIT = 100;

function ClaimStarterPack(props) {
  const { open, close, isOnboarding = false } = props
  const { executeGameAction, actionFailed } = useGameDirector()
  const { collection } = useGameStore()
  const { tokenBalances, setTokenBalances } = useController()
  const [claimInProgress, setClaimInProgress] = useState(false)
  const [potionsClaimed, setPotionsClaimed] = useState(0)
  const [killTokensClaimed, setKillTokensClaimed] = useState(0)

  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_potions)
  const unclaimedKillTokens = collection.filter((beast: Beast) => beast.adventurers_killed > beast.kills_claimed)

  useEffect(() => {
    setClaimInProgress(false);
  }, [actionFailed]);

  // When all unclaimed beasts are claimed, refresh balances and close modal
  useEffect(() => {
    if (collection.length > 0 && unclaimedBeasts.length === 0 && unclaimedKillTokens.length === 0) {
      setTokenBalances(({
        "REVIVE": tokenBalances["REVIVE"] + potionsClaimed * 2,
        "ATTACK": tokenBalances["ATTACK"] + potionsClaimed * 3,
        "EXTRA LIFE": tokenBalances["EXTRA LIFE"] + potionsClaimed * 1,
        "POISON": tokenBalances["POISON"] + potionsClaimed * 3,
        "KILL": tokenBalances["KILL"] + killTokensClaimed,
      }))

      close()
    }
  }, [unclaimedBeasts.length, unclaimedKillTokens.length]);

  const getPotionsToClaim = (potion: typeof POTIONS[number]) => {
    return unclaimedBeasts.reduce((sum: number, beast: Beast) => sum + (6 - beast.tier) * potion.packMultiplier, 0)
  }
  const getTokensToClaim = () => {
    return unclaimedKillTokens.reduce((sum: number, beast: Beast) => sum + (beast.adventurers_killed - beast.kills_claimed), 0)
  }

  const claimAll = async () => {
    setClaimInProgress(true)

    setPotionsClaimed(unclaimedBeasts.reduce((sum: number, beast: Beast) => sum + (6 - beast.tier), 0))
    setKillTokensClaimed(unclaimedKillTokens.reduce((sum: number, beast: Beast) => sum + (beast.adventurers_killed - beast.kills_claimed), 0))

    try {
      const beastIds = Array.from(new Set([
        ...unclaimedBeasts.map(beast => beast.token_id),
        ...unclaimedKillTokens.map(beast => beast.token_id)
      ]))

      for (let i = 0; i < beastIds.length; i += LIMIT) {
        const batch = beastIds.slice(i, i + LIMIT)
        const res = await executeGameAction({
          type: "claim_beast_reward",
          beastIds: batch
        })

        if (!res) {
          break
        }
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setClaimInProgress(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isOnboarding ? undefined : () => { close(false) }}
      maxWidth={'lg'}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: isOnboarding
              ? `3px solid ${gameColors.accentGreen}80`
              : `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: isOnboarding
              ? `
                0 12px 32px rgba(0, 0, 0, 0.8),
                0 0 24px ${gameColors.accentGreen}40,
                inset 0 0 60px ${gameColors.accentGreen}10
              `
              : `
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
              {isOnboarding ? 'Welcome to Summit!' : 'Beast Rewards'}
            </Typography>

            {isOnboarding && <Typography sx={styles.subtitle}>
              Claim your Beast Rewards
            </Typography>}

            {unclaimedBeasts.length > 0 && <Typography sx={styles.subtitle}>
              You have {unclaimedBeasts.length} unclaimed starter pack{unclaimedBeasts.length !== 1 ? 's' : ''}.
            </Typography>}
          </Box>

          {unclaimedBeasts.length > 0 && <Box sx={styles.itemsContainer}>
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
                      {getPotionsToClaim(potion)}
                    </Typography>
                  </Box>
                </Box>
              })
            )}
          </Box>}

          {getTokensToClaim() > 0 && (
            <Box sx={styles.killTokensSection}>
              <img src={killTokenIcon} alt='' width={'70px'} />

              <Box sx={styles.killTokensContent}>
                <Typography sx={styles.killTokensTitle}>
                  {getTokensToClaim()} $KILL
                </Typography>
              </Box>
              <Typography sx={styles.killTokensDescription}>
                Earned from your beasts that have killed adventurers.
              </Typography>
              <Typography sx={styles.killTokensDescription}>
                Used to upgrade your beasts.
              </Typography>
            </Box>
          )}

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
                  : `CLAIM ALL`
                }
              </Typography>
            </Button>

            {unclaimedBeasts.length > LIMIT && <Typography sx={styles.helperText}>
              Claiming in batches of {LIMIT}.
            </Typography>}
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
    width: '900px',
    maxWidth: '98vw',
    p: 3,
  },
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1.5
  },
  title: {
    fontSize: '28px',
    lineHeight: '30px',
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
  welcomeText: {
    fontSize: '18px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  subtitle: {
    fontSize: '16px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  inputLabel: {
    fontSize: '14px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  input: {
    '& .MuiOutlinedInput-root': {
      color: '#ffedbb',
      background: `${gameColors.mediumGreen}60`,
      borderRadius: '8px',
      '& fieldset': {
        borderColor: `${gameColors.accentGreen}60`,
        borderWidth: '2px',
      },
      '&:hover fieldset': {
        borderColor: `${gameColors.accentGreen}80`,
      },
      '&.Mui-focused fieldset': {
        borderColor: gameColors.brightGreen,
      },
    },
    '& .MuiOutlinedInput-input': {
      fontSize: '18px',
      fontWeight: 'bold',
      padding: '12px',
      '&::placeholder': {
        color: '#ffedbb80',
        opacity: 1,
      },
    },
  },
  inputHelper: {
    fontSize: '12px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    marginTop: '6px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    opacity: 0.8,
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
    minWidth: '180px',
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
    minHeight: '75px',
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
  helperText: {
    fontSize: '13px',
    color: gameColors.yellow,
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    fontStyle: 'italic',
    marginTop: '4px',
  },
  killTokensSection: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.mediumGreen}60`,
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '8px',
    padding: '12px',
  },
  killTokensTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    mb: '4px',
  },
  killTokensContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mt: 1,
  },
  killTokensAmount: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: '1px',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  killTokensLabel: {
    fontSize: '16px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
  killTokensDescription: {
    fontSize: '12px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
    textAlign: 'center',
    opacity: 0.8,
    fontStyle: 'italic',
    lineHeight: '12px',
  },
}
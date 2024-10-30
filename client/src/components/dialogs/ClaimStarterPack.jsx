import InfoIcon from '@mui/icons-material/Info';
import { Box, Dialog, Tooltip, Typography } from '@mui/material';
import React, { useContext } from 'react';
import attackPotionIcon from '../../assets/images/attack-potion.png';
import lifePotionIcon from '../../assets/images/life-potion.png';
import revivePotionIcon from '../../assets/images/revive-potion.png';
import { GameContext } from '../../contexts/gameContext';
import { BuyConsumablesButton } from '../../helpers/styles';
import { useState } from 'react';
import { DojoContext } from '../../contexts/dojoContext';

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
  const dojo = useContext(DojoContext)
  const game = useContext(GameContext)
  const { collection } = game.getState

  const unclaimedBeasts = collection.filter(beast => !beast.has_claimed_starter_kit).map(beast => beast.id)

  const [claimInProgress, setClaimInProgress] = useState(false)

  const claimAll = async () => {
    setClaimInProgress(true)

    try {
      const success = await dojo.executeTx([
        {
          contractName: "summit_systems",
          entrypoint: "claim_starter_kit",
          calldata: [unclaimedBeasts.slice(0, 150)]
        }
      ])

      if (success) {
        game.setState.walletBalances(prev => ({
          ...prev,
          attackPotions: prev.attackPotions + Math.min(unclaimedBeasts.length, 150) * 10,
          revivePotions: prev.revivePotions + Math.min(unclaimedBeasts.length, 150) * 5,
          extraLifePotions: prev.extraLifePotions + Math.min(unclaimedBeasts.length, 150),
        }))

        game.setState.beasts(prev => prev.map(beast => ({
          ...beast,
          has_claimed_starter_kit: unclaimedBeasts.slice(0, 150).includes(beast.id) ? true : beast.has_claimed_starter_kit
        })))
      }
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
      PaperProps={{
        sx: { background: '#feffda', border: '3px solid rgba(0, 0, 0, 0.35)', borderRadius: '10px' }
      }}
    >

      <Box sx={styles.dialogContainer}>
        <Box sx={styles.container}>

          <Box sx={{ textAlign: 'center' }}>
            <Typography fontSize={'35px'} letterSpacing={'1px'} mb={2}>
              Beast Starter Pack
            </Typography>

            <Typography fontSize={'16px'} color={'rgba(0,0,0,0.7)'} letterSpacing={'0.5px'}>
              You have {unclaimedBeasts.length} unclaimed starter packs.
            </Typography>
          </Box>

          <Box sx={styles.itemsContainer}>
            {React.Children.toArray(
              POTIONS.map(potion => {
                return <Box sx={styles.itemContainer}>
                  <Box sx={styles.itemTitle}>
                    <Typography variant='h3' color='white' letterSpacing={'1px'}>
                      {potion.name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'space-between', width: '100%', px: 0.5, boxSizing: 'border-box' }}>
                    <Box sx={styles.imageContainer}>
                      <img src={potion.icon} alt='' width={'90%'} />
                    </Box>

                    <Box display={'flex'} flexDirection={'column'} gap={0.5}>
                      <Box sx={styles.description}>
                        <Typography letterSpacing={'0.5px'} lineHeight={'14px'} sx={{ fontSize: '13px', opacity: 0.8 }}>
                          {potion.description}

                          {potion.name === 'revive potion' && <Tooltip title={<Box sx={{ background: '#616161', padding: '8px 12px', borderRadius: '4px' }}>
                            <Typography color='white'>
                              Potions required to revive a beast depends on how many times you have revived it. Up to 16 potions.
                            </Typography>
                          </Box>}>
                            <InfoIcon htmlColor='black' sx={{ fontSize: '13px', ml: '2px', mb: '-2px' }} />
                          </Tooltip>}
                        </Typography>

                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ my: 2, display: 'flex', width: '100%', justifyContent: 'center', px: 1, boxSizing: 'border-box', alignItems: 'baseline', gap: '2px' }}>
                    <Typography fontSize={'16px'}>
                      x
                    </Typography>
                    <Typography variant='h2' letterSpacing={'1px'}>
                      {unclaimedBeasts.length * potion.packAmount}
                    </Typography>
                  </Box>
                </Box>
              })
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <BuyConsumablesButton disabled={claimInProgress || unclaimedBeasts.length === 0} onClick={claimAll}>
              {claimInProgress
                ? <Box display={'flex'} alignItems={'baseline'}>
                  <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>
                    Claiming
                  </Typography>
                  <div className='dotLoader white' />
                </Box>
                : unclaimedBeasts.length > 150 ? 'Claim 150' : 'Claim All'
              }
            </BuyConsumablesButton>
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
    border: '3px solid #d2ad68',
    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px, rgb(51, 51, 51) 0px 0px 0px 2px',
    borderRadius: '5px',
  },
  itemTitle: {
    background: 'black',
    width: '100%',
    textAlign: 'center',
    py: 0.5,
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
    border: '1px solid rgba(0, 0, 0, 0.5)',
    background: '#f6e6bc',
  },
  description: {
    p: '5px',
    border: '1px solid #c87d3b',
    borderRadius: '4px',
    width: '90px',
    minHeight: '70px'
  },
  cost: {
    p: 1,
    border: '1px solid #c87d3b',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between'
  }
}
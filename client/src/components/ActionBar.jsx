import { Box, Tooltip, Typography } from '@mui/material';
import React from 'react';
import potion from '../assets/images/potion.png';
import { AttackButton, BuyConsumablesButton, ConsumableButton } from '../helpers/styles';
import { useContext } from 'react';
import { GameContext } from '../contexts/gameContext';
import sword from '../assets/images/sword.png';
import BuyConsumables from './dialogs/BuyConsumables';
import { useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { isBrowser, isMobile } from 'react-device-detect';

function ActionBar(props) {
  const game = useContext(GameContext)
  const { selectedBeasts, summit, showFeedingGround, totalDamage,
    selectedAdventurers, potions, attackInProgress, ownedBeasts, feedingInProgress } = game.getState

  const { address } = useAccount()
  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  const isSavage = Boolean(ownedBeasts.find(beast => beast.id === summit.id))

  if (showFeedingGround) {
    return <Box sx={styles.container}>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <AttackButton disabled={feedingInProgress || selectedAdventurers.length < 1} onClick={() => game.actions.feed()}>
          {feedingInProgress ?
            <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Feeding</Typography>
              <div className='dotLoader white' />
            </Box>
            : <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>
              Feed
            </Typography>
          }
        </AttackButton>
      </Box>
    </Box>
  }

  return <Box sx={styles.container}>

    <Box sx={{ display: 'flex', gap: 1 }}>
      {isSavage
        ? <AttackButton sx={{ fontSize: '20px' }}>
          YOU'RE THE SAVAGE
        </AttackButton>
        : <AttackButton disabled={attackInProgress || selectedBeasts.length < 1} onClick={() => game.actions.attack()}>
          {attackInProgress
            ? <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Attacking</Typography>
              <div className='dotLoader white' />
            </Box>

            : totalDamage < summit.currentHealth
              ? <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Typography color={selectedBeasts.length < 1 ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant='h4'>
                  Attack
                </Typography>

                {totalDamage > 0 && <Box display={'flex'} gap={'3px'} alignItems={'center'}>
                  <img src={sword} alt='' height={'15px'} />

                  <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'white'} variant='h4'>
                    {totalDamage}
                  </Typography>
                </Box>}
              </Box>
              : <Typography color={'white'} variant='h4'>
                Take Summit
              </Typography>
          }
        </AttackButton>}

      {/* <Tooltip title={<Typography variant='h4'>Coming soon</Typography>} placement={'top-end'}>
        <Box>
          <AttackButton disabled={!address} sx={{ mr: 2, opacity: 0.6 }} onClick={() => { }}>
            Throw Weapon
          </AttackButton>
        </Box>
      </Tooltip> */}

      {/* <ConsumableButton onClick={() => game.setState.potions(prev => prev + 1)} sx={{ position: 'relative' }}>
        <img src={potion} alt='' height={'35px'} />

        <Box sx={styles.count}>
          <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '13px', lineHeight: '12px' }}>
            {potions}
          </Typography>
        </Box>
      </ConsumableButton> */}
    </Box>

    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box>
        <BuyConsumablesButton disabled={selectedBeasts.length < 1} onClick={() => {
          game.setState.showFeedingGround(prev => !prev)
        }}>
          Feeding Ground
        </BuyConsumablesButton>
      </Box>

      {/* <BuyConsumablesButton onClick={() => openBuyPotionsDialog(true)} disabled={!address}>
        Buy Consumables
      </BuyConsumablesButton>

      <BuyConsumables open={buyPotionsDialog} close={openBuyPotionsDialog} /> */}
    </Box>
  </Box>
}

export default ActionBar;

const styles = {
  container: {
    height: '60px',
    width: '100%',
    background: '#07323d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    px: 2,
    boxSizing: 'border-box'
  },
  count: {
    position: 'absolute',
    bottom: '-2px',
    borderRadius: '100%',
    right: '-2px',
    background: '#f6e6bc',
    color: 'white',
    border: '1px solid rgba(0, 0, 0, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
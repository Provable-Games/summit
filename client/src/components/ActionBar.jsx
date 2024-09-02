import { Box, Typography } from '@mui/material';
import React from 'react';
import potion from '../assets/images/potion.png';
import { AttackButton, BuyConsumablesButton, ConsumableButton } from '../helpers/styles';
import { useContext } from 'react';
import { GameContext } from '../contexts/gameContext';
import sword from '../assets/images/sword.png';
import BuyConsumables from './dialogs/BuyConsumables';
import { useState } from 'react';
import { useAccount } from '@starknet-react/core';

function ActionBar(props) {
  const game = useContext(GameContext)
  const { selectedBeasts, summit, showFeedingGround, isThrowing, totalDamage, selectedAdventurers } = game.getState

  const { address } = useAccount()

  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  const setWeaponThrow = () => {
    if (showFeedingGround) {
      game.setState.showFeedingGround(false)
      game.setState.isThrowing(false)
    } else {
      game.setState.showFeedingGround(true)
      game.setState.isThrowing(true)
    }
  }

  if (showFeedingGround) {
    return <Box sx={styles.container}>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <AttackButton disabled={selectedAdventurers.length < 1}>
          Feed
        </AttackButton>

        <ConsumableButton onClick={() => game.setState.potions(prev => prev + 1)}>
          <img src={potion} alt='' height={'35px'} />
        </ConsumableButton>
      </Box>
    </Box>
  }

  return <Box sx={styles.container}>

    <Box sx={{ display: 'flex', gap: 1 }}>
      {showFeedingGround
        ? <AttackButton disabled={selectedAdventurers.length < 1}>
          {isThrowing ? 'Throw' : 'Feed'}
        </AttackButton>

        : <AttackButton disabled={selectedBeasts.length < 1} onClick={() => game.actions.attack()}>
          {totalDamage < summit.healthLeft
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

      <AttackButton disabled={!address} sx={{ mr: 2 }} onClick={() => setWeaponThrow()}>
        Throw Weapon
      </AttackButton>

      <ConsumableButton onClick={() => game.setState.potions(prev => prev + 1)}>
        <img src={potion} alt='' height={'35px'} />
      </ConsumableButton>
    </Box>

    <Box sx={{ display: 'flex', gap: 2 }}>
      <BuyConsumablesButton disabled={selectedBeasts.length < 1} onClick={() => game.setState.showFeedingGround(prev => !prev)}>
        Feeding Ground
      </BuyConsumablesButton>

      <BuyConsumablesButton onClick={() => openBuyPotionsDialog(true)} disabled={!address}>
        Buy Consumables
      </BuyConsumablesButton>

      <BuyConsumables open={buyPotionsDialog} close={openBuyPotionsDialog} />
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
  }
}
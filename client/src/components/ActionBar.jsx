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
  const { address } = useAccount()

  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  return <Box sx={styles.container}>

    <Box sx={{ display: 'flex', gap: 2 }}>
      <AttackButton disabled={game.selected.length < 1}>
        {game.totalDamage < game.summit.health
          ? <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Typography color={game.selected.length < 1 ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant='h4'>
              Attack
            </Typography>

            {game.totalDamage > 0 && <Box display={'flex'} gap={'3px'} alignItems={'center'}>
              <img src={sword} alt='' height={'15px'} />

              <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'white'} variant='h4'>
                {game.totalDamage}
              </Typography>
            </Box>}
          </Box>
          : <Typography color={'white'} variant='h4'>
            Take Summit
          </Typography>
        }
      </AttackButton>

      <ConsumableButton disabled>
        <img src={potion} alt='' height={'35px'} style={{ opacity: 0.3 }} />
      </ConsumableButton>
    </Box>

    <Box sx={{ display: 'flex', gap: 2 }}>
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
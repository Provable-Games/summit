import FavoriteIcon from '@mui/icons-material/Favorite';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import React, { useContext } from 'react';
import attackPotionIcon from '../assets/images/attack-potion.png';
import cauldronIcon from '../assets/images/cauldron.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import sword from '../assets/images/sword.png';
import { GameContext } from '../contexts/gameContext';
import { AttackButton, RoundBlueButton } from '../helpers/styles';
import BuyConsumables from './dialogs/BuyConsumables';
import { useState } from 'react';

function ActionBar(props) {
  const game = useContext(GameContext)
  const { selectedBeasts, summit, showFeedingGround, totalDamage,
    selectedAdventurers, attackInProgress, ownedBeasts,
    feedingInProgress, adventurerCollection, collection, walletBalances } = game.getState

  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  const isSavage = Boolean(ownedBeasts.find(beast => beast.id === summit.id))
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const enableAttack = !attackInProgress && selectedBeasts.length > 0 && beast?.current_health > 0
  const enableRevivePotion = selectedBeasts.length === 1 && walletBalances.revivePotions > 0 && beast?.current_health === 0
  const enableAttackPotion = selectedBeasts.length === 1 && walletBalances.attackPotions > 0 && !isSavage && beast?.current_health > 0
  const enableExtraLifePotion = selectedBeasts.length === 1 && walletBalances.extraLifePotions > 0 && beast?.current_health > 0
  const enableFeedingGround = selectedBeasts.length === 1 && adventurerCollection.length > 0

  if (showFeedingGround) {
    return <Box sx={styles.container}>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <AttackButton disabled={feedingInProgress || selectedAdventurers.length < 1} onClick={() => game.actions.feed()}>
          {feedingInProgress
            ? <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Feeding</Typography>
              <div className='dotLoader white' />
            </Box>
            : <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>
                Feed
              </Typography>

              {selectedAdventurers.length > 0 && <Box display={'flex'} gap={'3px'} alignItems={'center'}>
                <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'white'} variant='h4'>
                  +{selectedAdventurers.reduce((sum, adventurer) => sum + adventurer.level, 0)}
                </Typography>

                <FavoriteIcon fontSize='small' htmlColor='white' />
              </Box>}
            </Box>
          }
        </AttackButton>
      </Box>
    </Box>
  }

  return <Box sx={styles.container}>

    <Box sx={{ display: 'flex', gap: 1 }}>
      {isSavage
        ? <AttackButton sx={{ fontSize: '18px' }}>
          YOU'RE THE SAVÁGE
        </AttackButton>
        : <AttackButton disabled={!enableAttack} onClick={() => game.actions.attack()}>
          {attackInProgress
            ? <Box display={'flex'} alignItems={'baseline'}>
              <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Attacking</Typography>
              <div className='dotLoader white' />
            </Box>

            : totalDamage < summit.current_health
              ? <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Typography color={!enableAttack ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant='h4'>
                  Attack
                </Typography>

                {totalDamage > 0 && <Box display={'flex'} gap={'3px'} alignItems={'center'}>
                  <img src={sword} alt='' height={'15px'} />

                  <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'white'} variant='h4'>
                    {totalDamage}
                  </Typography>
                </Box>}
              </Box>
              : <Typography color={!enableAttack ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant='h4'>
                TAKE SUMMIT
              </Typography>
          }
        </AttackButton>}

      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.potionTooltip}>
        <Typography variant='h6' letterSpacing={'0.5px'}>Revive Potion</Typography>
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Revives a dead beast to full health</Typography>
        <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button>
      </Box>}>
        <RoundBlueButton
          sx={enableRevivePotion ? styles.highlightButton : styles.fadeButton}
          onClick={() => {
            if (!enableRevivePotion) return;
            game.setState.selectedItem('revivePotion');
          }}
        >
          <img src={revivePotionIcon} alt='' height={'32px'} />

          <Box sx={styles.count}>
            <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '13px', lineHeight: '12px' }}>
              {walletBalances.revivePotions}
            </Typography>
          </Box>
        </RoundBlueButton>
      </Tooltip>

      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.potionTooltip}>
        <Typography variant='h6' letterSpacing={'0.5px'}>Attack Potion</Typography>
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Adds 10% damage to a beast's next attack</Typography>
        <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button>
      </Box>}>
        <RoundBlueButton
          sx={enableAttackPotion ? styles.highlightButton : styles.fadeButton}
          onClick={() => {
            if (!enableAttackPotion) return;
            game.setState.selectedItem('attackPotion');
          }}
        >
          <img src={attackPotionIcon} alt='' height={'32px'} />

          <Box sx={styles.count}>
            <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '12px', lineHeight: '12px' }}>
              {walletBalances.attackPotions}
            </Typography>
          </Box>
        </RoundBlueButton>
      </Tooltip>

      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.potionTooltip}>
        <Typography variant='h6' letterSpacing={'0.5px'}>Extra Life Potion</Typography>
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Beast revives to full health instead of dying</Typography>
        <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button>
      </Box>}>
        <RoundBlueButton
          sx={enableExtraLifePotion ? styles.highlightButton : styles.fadeButton}
          onClick={() => {
            if (!enableExtraLifePotion) return;
            game.setState.selectedItem('extraLifePotion');
          }}
        >
          <img src={lifePotionIcon} alt='' height={'32px'} />

          <Box sx={styles.count}>
            <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '12px', lineHeight: '12px' }}>
              {walletBalances.extraLifePotions}
            </Typography>
          </Box>
        </RoundBlueButton>
      </Tooltip>

      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.potionTooltip}>
        <Typography variant='h6' letterSpacing={'0.5px'}>Dead adventurers</Typography>
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Feed dead adventurers from Loot Survivor to increase your beasts max health</Typography>
      </Box>}>
        <RoundBlueButton
          sx={enableFeedingGround ? styles.highlightButton : styles.fadeButton}
          onClick={() => {
            if (!enableFeedingGround) return;
            game.setState.showFeedingGround(true);
          }}
        >
          <img src={cauldronIcon} alt='' height={'32px'} style={{ marginTop: '-4px' }} />

          <Box sx={styles.count}>
            <Typography pl={'3px'} pr={'2px'} py={'1px'} sx={{ fontSize: '12px', lineHeight: '12px' }}>
              {adventurerCollection.length}
            </Typography>
          </Box>
        </RoundBlueButton>
      </Tooltip>
    </Box>

    {buyPotionsDialog && <BuyConsumables open={buyPotionsDialog} close={openBuyPotionsDialog} />}
  </Box>
}

export default ActionBar;

const styles = {
  container: {
    height: '60px',
    width: '100%',
    maxWidth: '100vw',
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
    bottom: '-5px',
    borderRadius: '10px',
    right: '-2px',
    background: '#f6e6bc',
    color: 'white',
    border: '1px solid rgba(0, 0, 0, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '15px'
  },
  highlightButton: {
    opacity: 1,
    boxShadow: '0 0 8px white'
  },
  fadeButton: {
    opacity: 0.6,
  },
  potionTooltip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: '#f6e6bc',
    border: '3px solid rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    px: 2,
    pt: 0.5,
    pb: 1
  }
}
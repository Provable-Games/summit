import FavoriteIcon from '@mui/icons-material/Favorite';
import { Box, IconButton, Input, ListItemText, Menu, MenuItem, Slider, Tooltip, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import attackPotionIcon from '../assets/images/attack-potion.png';
import cauldronIcon from '../assets/images/cauldron.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import { GameContext } from '../contexts/gameContext';
import { AttackButton, RoundBlueButton } from '../helpers/styles';
import BuyConsumables from './dialogs/BuyConsumables';
import heart from '../assets/images/heart.png';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

function ActionBar(props) {
  const game = useContext(GameContext)
  const { selectedBeasts, summit, showFeedingGround, totalDamage,
    selectedAdventurers, attackInProgress, ownedBeasts,
    feedingInProgress, adventurerCollection, walletBalances, potionsApplied } = game.getState

  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  const [anchorEl, setAnchorEl] = useState(null);
  const [potion, setPotion] = useState(null)

  const handleClick = (event, potion) => {
    setAnchorEl(event.currentTarget);
    setPotion(potion);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPotion(null);
  };


  const isSavage = Boolean(ownedBeasts.find(beast => beast.id === summit.id))

  const revivalPotionsRequired = selectedBeasts.filter(beast => beast.current_health === 0).reduce((sum, beast) => sum + beast.revival_count + 1, 0)
  const enableAttack = !attackInProgress && selectedBeasts.length > 0 && walletBalances.revivePotions >= revivalPotionsRequired;
  const enableFeedingGround = selectedBeasts.length === 1 && adventurerCollection.length > 0

  const enableExtraLifePotion = walletBalances.extraLifePotions > 0;
  const enableAttackPotion = walletBalances.attackPotions > 0;
  const isPotionsApplied = potionsApplied.revive + potionsApplied.attack + potionsApplied.extraLife > 0

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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: isPotionsApplied ? '4px' : '0px' }}>
            {attackInProgress
              ? <Box display={'flex'} alignItems={'baseline'}>
                <Typography variant={isPotionsApplied ? 'h5' : 'h4'} lineHeight={isPotionsApplied ? '14px' : '16px'} color={'white'}>Attacking</Typography>
                <div className='dotLoader white' />
              </Box>
              : <Typography color={!enableAttack ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant={isPotionsApplied ? 'h5' : 'h4'} lineHeight={isPotionsApplied ? '14px' : '16px'}>
                Attack
              </Typography>
            }

            {isPotionsApplied && <Box sx={{ display: 'flex', gap: 0.5 }}>
              {potionsApplied.revive > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'} mr={'-3px'}>{potionsApplied.revive}</Typography>
                <img src={revivePotionIcon} alt='' height={'16px'} />
              </Box>}
              {potionsApplied.attack > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'} mr={'-2px'}>{potionsApplied.attack}</Typography>
                <img src={attackPotionIcon} alt='' height={'16px'} />
              </Box>}
              {potionsApplied.extraLife > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'}>{potionsApplied.extraLife}</Typography>
                <img src={heart} alt='' height={'14px'} />
              </Box>}
            </Box>
            }
          </Box>
        </AttackButton>}

      <Tooltip leaveDelay={300} placement='top' title={<Box sx={styles.potionTooltip}>
        <Typography variant='h6' letterSpacing={'0.5px'}>Revive Potions</Typography>
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Attack with your dead beasts by using revival potions</Typography>
        {/* <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button> */}
      </Box>}>
        <RoundBlueButton
          sx={styles.fadeButton}
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
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Add 10% damage to your beast's next attack</Typography>
        {/* <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button> */}
      </Box>}>
        <RoundBlueButton
          sx={enableAttackPotion ? styles.highlightButton : styles.fadeButton}
          onClick={(event) => {
            if (!enableAttackPotion) return;
            handleClick(event, 'attack');
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
        <Typography sx={{ opacity: 0.8, mb: 0.5 }}>Apply extra lives to your beast after taking the summit</Typography>
        {/* <Button sx={{ backgroundColor: 'black', color: 'white', borderRadius: '4px', padding: '0px 12px', height: '20px' }} size='small' onClick={() => openBuyPotionsDialog(true)}>
          Buy Potions
        </Button> */}
      </Box>}>
        <RoundBlueButton
          sx={enableExtraLifePotion ? styles.highlightButton : styles.fadeButton}
          onClick={(event) => {
            if (!enableExtraLifePotion) return;
            handleClick(event, 'extraLife');
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

    {potion && <Menu
      sx={{ zIndex: 10000 }}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Box width={'150px'} display={'flex'} alignItems={'center'} flexDirection={'column'} justifyContent={'space-between'} m={1}>
        <Box sx={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography fontSize={'20px'} letterSpacing={'0.5px'}>
            {potion === 'attack' ? 'Boost Attack' : 'Extra Life'}
          </Typography>
        </Box>

        <Box textAlign={'center'} display={'flex'} alignItems={'center'} mt={1}>
          <IconButton onClick={() => game.setState.applyPotions(prev => ({
            ...prev,
            [potion]: Math.max(0, prev[potion] - 1)
          }))}>
            <RemoveIcon />
          </IconButton>

          <Box textAlign={'right'} ml={1}>
            <Typography variant='h2'>
              {potion === 'attack' ? potionsApplied.attack : potionsApplied.extraLife}
            </Typography>
          </Box>

          <img src={potion === 'attack' ? attackPotionIcon : lifePotionIcon} alt='' />

          <IconButton onClick={() => game.setState.applyPotions(prev => ({
            ...prev,
            [potion]: Math.min(prev[potion] + 1, Math.min(potion === 'attack' ? walletBalances.attackPotions : walletBalances.extraLifePotions, 255))
          }))}>
            <AddIcon />
          </IconButton>
        </Box>

        <Slider
          value={potion === 'attack' ? potionsApplied.attack : potionsApplied.extraLife}
          step={1}
          marks
          min={0}
          max={Math.min(potion === 'attack' ? walletBalances.attackPotions : walletBalances.extraLifePotions, 255)}
          onChange={(e) => game.setState.applyPotions(prev => ({
            ...prev,
            [potion]: e.target.value
          }))}
          size='small'
        />
      </Box>
    </Menu>}
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
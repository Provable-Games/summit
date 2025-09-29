import { useController } from '@/contexts/controller';
import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import AddIcon from '@mui/icons-material/Add';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, IconButton, Menu, Slider, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import attackPotionIcon from '../assets/images/attack-potion.png';
import cauldronIcon from '../assets/images/cauldron.png';
import heart from '../assets/images/heart.png';
import lifePotionIcon from '../assets/images/life-potion.png';
import revivePotionIcon from '../assets/images/revive-potion.png';
import { AttackButton, RoundBlueButton } from '../utils/styles';
import BuyConsumables from './dialogs/BuyConsumables';

interface ActionBarProps {
  [key: string]: any;
}

function ActionBar(props: ActionBarProps) {
  const { executeGameAction } = useGameDirector();
  const { tokenBalances } = useController();

  const { selectedBeasts, summit, showFeedingGround,
    selectedAdventurers, attackInProgress, collection, setShowFeedingGround,
    feedingInProgress, adventurerCollection, appliedPotions, setAppliedPotions } = useGameStore();

  const [buyPotionsDialog, openBuyPotionsDialog] = useState(false)

  const [anchorEl, setAnchorEl] = useState(null);
  const [potion, setPotion] = useState(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>, potion: any) => {
    setAnchorEl(event.currentTarget);
    setPotion(potion);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setPotion(null);
  };


  const isSavage = Boolean(collection.find((beast: any) => beast.token_id === summit.beast.token_id))

  const revivalPotionsRequired = selectedBeasts.filter((beast: any) => beast.current_health === 0).reduce((sum: number, beast: any) => sum + beast.revival_count + 1, 0)
  const enableAttack = !attackInProgress && selectedBeasts.length > 0 && tokenBalances.revivePotions >= revivalPotionsRequired;
  const enableFeedingGround = selectedBeasts.length === 1 && adventurerCollection.length > 0

  const enableExtraLifePotion = tokenBalances.extraLifePotions > 0;
  const enableAttackPotion = tokenBalances.attackPotions > 0;
  const isappliedPotions = appliedPotions.revive + appliedPotions.attack + appliedPotions.extraLife > 0

  if (showFeedingGround) {
    return <Box sx={styles.container}>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <AttackButton disabled={feedingInProgress || selectedAdventurers.length < 1} onClick={() => executeGameAction({ type: 'feed' })}>
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
        : <AttackButton disabled={!enableAttack} onClick={() => executeGameAction({ type: 'attack' })}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: isappliedPotions ? '4px' : '0px' }}>
            {attackInProgress
              ? <Box display={'flex'} alignItems={'baseline'}>
                <Typography variant={isappliedPotions ? 'h5' : 'h4'} lineHeight={isappliedPotions ? '14px' : '16px'} color={'white'}>Attacking</Typography>
                <div className='dotLoader white' />
              </Box>
              : <Typography color={!enableAttack ? 'rgba(0, 0, 0, 0.26)' : 'white'} variant={isappliedPotions ? 'h5' : 'h4'} lineHeight={isappliedPotions ? '14px' : '16px'}>
                Attack
              </Typography>
            }

            {isappliedPotions && <Box sx={{ display: 'flex', gap: 0.5 }}>
              {appliedPotions.revive > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'} mr={'-3px'}>{appliedPotions.revive}</Typography>
                <img src={revivePotionIcon} alt='' height={'16px'} />
              </Box>}
              {appliedPotions.attack > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'} mr={'-2px'}>{appliedPotions.attack}</Typography>
                <img src={attackPotionIcon} alt='' height={'16px'} />
              </Box>}
              {appliedPotions.extraLife > 0 && <Box display={'flex'} alignItems={'center'}>
                <Typography color={'#000000a8'}>{appliedPotions.extraLife}</Typography>
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
              {tokenBalances.revivePotions}
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
              {tokenBalances.attackPotions}
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
              {tokenBalances.extraLifePotions}
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
            setShowFeedingGround(true);
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
          <IconButton onClick={() => setAppliedPotions({
            ...appliedPotions,
            [potion]: Math.max(0, appliedPotions[potion] - 1)
          })}>
            <RemoveIcon />
          </IconButton>

          <Box textAlign={'right'} ml={1}>
            <Typography variant='h2'>
              {potion === 'attack' ? appliedPotions.attack : appliedPotions.extraLife}
            </Typography>
          </Box>

          <img src={potion === 'attack' ? attackPotionIcon : lifePotionIcon} alt='' />

          <IconButton onClick={() => setAppliedPotions({
            ...appliedPotions,
            [potion]: Math.min(appliedPotions[potion] + 1, Math.min(potion === 'attack' ? tokenBalances.attackPotions : tokenBalances.extraLifePotions, 255))
          })}>
            <AddIcon />
          </IconButton>
        </Box>

        <Slider
          value={potion === 'attack' ? appliedPotions.attack : appliedPotions.extraLife}
          step={1}
          marks
          min={0}
          max={Math.min(potion === 'attack' ? tokenBalances.attackPotions : tokenBalances.extraLifePotions, 255)}
          onChange={(e, value) => setAppliedPotions({
            ...appliedPotions,
            [potion]: value
          })}
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
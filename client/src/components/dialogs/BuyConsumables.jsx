import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Dialog, Icon, IconButton, Input, InputAdornment, Tooltip, Typography } from '@mui/material';
import React, { useContext, useState } from 'react';
import revivePotionIcon from '../../assets/images/revive-potion.png';
import attackPotionIcon from '../../assets/images/attack-potion.png';
import lifePotionIcon from '../../assets/images/life-potion.png';
import { GameContext } from '../../contexts/gameContext';
import { BuyConsumablesButton } from '../../helpers/styles';
import { useEffect } from 'react';
import { debounce } from '../../helpers/utilities';
import { getTokenPrice } from '../../api/ekubo';

const POTIONS = [
  {
    id: 1,
    name: 'revive potion',
    icon: revivePotionIcon,
    description: 'Revives a dead beast. Amount required varies on tier.',
    cost: 0.25,
    token: 'USDC'
  },
  {
    id: 2,
    name: 'attack potion',
    icon: attackPotionIcon,
    description: 'Doubles the damage of a beast\'s next attack.',
    cost: 0.25,
    token: 'STARK'
  },
  {
    id: 3,
    name: 'Extra life potion',
    icon: lifePotionIcon,
    description: 'Beast revives to full health instead of dying.',
    cost: 0.25,
    token: 'LORDS'
  },
]

const revivePotionsRequired = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1
}

function BuyConsumables(props) {
  const { open, close } = props
  const game = useContext(GameContext)

  const [amount, setAmount] = useState({
    1: 0,
    2: 0,
    3: 0
  })
  const [prices, setPrices] = useState({
    1: 0,
    2: 0,
    3: 0
  })
  const [totalCost, setTotalCost] = useState(0)

  const updateTotalCost = async (potion, newAmount) => {
    const cost = newAmount > 0 ? await getTokenPrice(potion.token, newAmount * 10 ** 6) : 0
    setPrices(prev => ({ ...prev, [potion.id]: Number(cost) }))
  }

  const debouncedUpdateTotalCost = debounce((potion, newAmount) => {
    if (newAmount === amount[potion.id]) {
      updateTotalCost(potion, newAmount)
    }
  }, 500)

  useEffect(() => {
    const total = Object.values(prices).reduce((acc, price) => acc + price, 0)
    setTotalCost(total)
  }, [prices])

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

          <Box sx={{ textAlign: 'center'}}>
            <Typography fontSize={'35px'} letterSpacing={'1px'} mb={2}>
              Potions
            </Typography>

            <Typography letterSpacing={'0.5px'} color={'rgba(0,0,0,0.7)'} variant='h6'>
              Potions are single-use consumables. Their supply is limited, and prices fluctuate based on demand.
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
                              Potions required
                            </Typography>

                            {Object.entries(revivePotionsRequired).map(([tier, potions]) => (
                              <Box display={'flex'} justifyContent={'space-between'}>
                                <Typography color='white'>
                                  Tier {tier}:
                                </Typography>
                                <Typography color='white'>
                                  {potions} potions
                                </Typography>
                              </Box>
                            ))}
                          </Box>}>
                            <InfoIcon htmlColor='black' sx={{ fontSize: '13px', ml: '2px', mb: '-2px' }} />
                          </Tooltip>}
                        </Typography>

                      </Box>

                      <Box sx={styles.cost}>
                        <Typography sx={{ letterSpacing: '0.5px', fontSize: '13px', opacity: 0.8 }}>
                          Cost
                        </Typography>
                        <Typography sx={{ letterSpacing: '0.5px', fontSize: '13px', opacity: 0.8 }}>
                          ${potion.cost}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ my: 1, display: 'flex', width: '100%', justifyContent: 'space-between', px: 1, boxSizing: 'border-box' }}>
                    <Box sx={{ display: 'flex' }}>
                      <IconButton onClick={() => {
                        const newAmount = Math.max(0, amount[potion.id] - 1)
                        setAmount(prev => ({ ...prev, [potion.id]: newAmount }))
                        debouncedUpdateTotalCost(potion, newAmount)
                      }}>
                        <RemoveIcon fontSize='small' />
                      </IconButton>

                      <IconButton onClick={() => {
                        const newAmount = amount[potion.id] + 1
                        setAmount(prev => ({ ...prev, [potion.id]: newAmount }))
                        debouncedUpdateTotalCost(potion, newAmount)
                      }}>
                        <AddIcon fontSize='small' />
                      </IconButton>
                    </Box>

                    <Input disableUnderline={true} sx={{ color: 'black', width: '80px', fontSize: '18px', textAlign: 'right' }}
                      inputProps={{ style: { textAlign: 'right', border: '1px solid #c87d3b', padding: '0 3px', fontSize: '15px' } }}
                      value={amount[potion.id]}
                      onChange={e => {
                        const newAmount = isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                        setAmount(prev => ({ ...prev, [potion.id]: newAmount }))
                        debouncedUpdateTotalCost(potion, newAmount)
                      }}
                      endAdornment={
                        <InputAdornment position="end">
                          <Typography letterSpacing={'0.5px'}>
                            Selected
                          </Typography>
                        </InputAdornment>
                      }
                    />
                  </Box>
                </Box>
              })
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography variant='h4' letterSpacing={'1px'}>
              Total ${totalCost}
            </Typography>

            <BuyConsumablesButton disabled={totalCost < 1} onClick={() => { game.setState.totalReward(prev => prev + totalCost), close(false); }}>
              Buy Potions
            </BuyConsumablesButton>
          </Box>
        </Box>

      </Box>

    </Dialog >
  )
}

export default BuyConsumables

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
    minHeight: '55px'
  },
  cost: {
    p: 1,
    border: '1px solid #c87d3b',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between'
  }
}
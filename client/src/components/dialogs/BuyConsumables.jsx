import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Dialog, IconButton, Input, InputAdornment, Tooltip, Typography, Skeleton } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { useDebounce } from "use-debounce";
import { generateSwapCalls, getSwapQuote } from '../../api/ekubo';
import attackPotionIcon from '../../assets/images/attack-potion.png';
import lifePotionIcon from '../../assets/images/life-potion.png';
import revivePotionIcon from '../../assets/images/revive-potion.png';
import { DojoContext } from '../../contexts/dojoContext';
import { GameContext } from '../../contexts/gameContext';
import { BuyConsumablesButton } from '../../helpers/styles';

const POTIONS = [
  {
    id: 1,
    name: 'revive potion',
    icon: revivePotionIcon,
    description: 'Revives a dead beast. Amount required increases with each revival.',
    costName: 'revive',
    token: 'STRK',
    address: import.meta.env.VITE_PUBLIC_REVIVE_ERC20_ADDRESS
  },
  {
    id: 2,
    name: 'attack potion',
    icon: attackPotionIcon,
    description: 'Adds 10% damage to a beast\'s next attack.',
    costName: 'attack',
    token: 'UNI',
    address: import.meta.env.VITE_PUBLIC_ATTACK_ERC20_ADDRESS
  },
  {
    id: 3,
    name: 'Extra life potion',
    icon: lifePotionIcon,
    description: 'Beast revives to full health instead of dying.',
    costName: 'extraLife',
    token: 'LORDS',
    address: import.meta.env.VITE_PUBLIC_EXTRA_LIFE_ERC20_ADDRESS
  },
]

function BuyConsumables(props) {
  const { open, close } = props

  const dojo = useContext(DojoContext)
  const game = useContext(GameContext)
  const { potionPrices } = game.getState

  const [reviveAmount, setReviveAmount] = useState(0)
  const [attackAmount, setAttackAmount] = useState(0)
  const [extraLifeAmount, setExtraLifeAmount] = useState(0)

  const [debouncedReviveAmount] = useDebounce(reviveAmount, 500)
  const [debouncedAttackAmount] = useDebounce(attackAmount, 500)
  const [debouncedExtraLifeAmount] = useDebounce(extraLifeAmount, 500)

  const [quotes, setQuotes] = useState({ 1: null, 2: null, 3: null })
  const [prices, setPrices] = useState({ 1: 0, 2: 0, 3: 0 })
  const [totalCost, setTotalCost] = useState(0)

  const [fetchingPrice, setFetchingPrice] = useState(true)
  const [buyInProgress, setBuyInProgress] = useState(false)

  const updateTotalCost = async (potion, newAmount) => {
    if (newAmount === 0) {
      setQuotes(prev => ({ ...prev, [potion.id]: null }))
      setPrices(prev => ({ ...prev, [potion.id]: 0 }))
      return
    }

    setFetchingPrice(true)
    const quote = await getSwapQuote(-1 * newAmount * 10 ** 18, potion.token, 'USDC')
    const cost = (quote.total * -1) / (10 ** 6)

    setPrices(prev => ({ ...prev, [potion.id]: cost }))
    setQuotes(prev => ({ ...prev, [potion.id]: quote }))
    setFetchingPrice(false)
  }

  const handleAmountChange = (potion, newAmount) => {
    if (potion.id === 1) {
      setReviveAmount(newAmount)
    } else if (potion.id === 2) {
      setAttackAmount(newAmount)
    } else if (potion.id === 3) {
      setExtraLifeAmount(newAmount)
    }
  }

  useEffect(() => {
    updateTotalCost(POTIONS[0], debouncedReviveAmount)
  }, [debouncedReviveAmount])

  useEffect(() => {
    updateTotalCost(POTIONS[1], debouncedAttackAmount)
  }, [debouncedAttackAmount])

  useEffect(() => {
    updateTotalCost(POTIONS[2], debouncedExtraLifeAmount)
  }, [debouncedExtraLifeAmount])

  useEffect(() => {
    const total = Object.values(prices).reduce((acc, price) => acc + price, 0)
    setTotalCost(total)
  }, [prices])

  const buyConsumables = async () => {
    let potionQuotes = POTIONS.map(potion => ({
      tokenAddress: potion.address,
      minimumAmount: potion.id === 1 ? reviveAmount : potion.id === 2 ? attackAmount : extraLifeAmount,
      quote: quotes[potion.id]
    }))

    setBuyInProgress(true)
    const calls = generateSwapCalls(dojo.routerContract, import.meta.env.VITE_PUBLIC_PURCHASE_TOKEN, potionQuotes)
    console.log(calls)
    const success = await dojo.executeTx(calls)

    if (success) {
      game.update.ERC20Balances()
      game.update.potionPrices()
      close(false);
    }

    setBuyInProgress(false)
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
                              Potions required to revive a beast depends on how many times you have revived it. Max 16 potions.
                            </Typography>
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
                          ${potionPrices[potion.costName]}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ my: 1, display: 'flex', width: '100%', justifyContent: 'space-between', px: 1, boxSizing: 'border-box' }}>
                    <Box sx={{ display: 'flex' }}>
                      <IconButton onClick={() => {
                        const newAmount = Math.max(0, potion.id === 1 ? reviveAmount - 1 : potion.id === 2 ? attackAmount - 1 : extraLifeAmount - 1)
                        handleAmountChange(potion, newAmount)
                      }}>
                        <RemoveIcon fontSize='small' />
                      </IconButton>

                      <IconButton onClick={() => {
                        const newAmount = potion.id === 1 ? reviveAmount + 1 : potion.id === 2 ? attackAmount + 1 : extraLifeAmount + 1
                        handleAmountChange(potion, newAmount)
                      }}>
                        <AddIcon fontSize='small' />
                      </IconButton>
                    </Box>

                    <Input disableUnderline={true} sx={{ color: 'black', width: '80px', fontSize: '18px', textAlign: 'right' }}
                      inputProps={{ style: { textAlign: 'right', border: '1px solid #c87d3b', padding: '0 3px', fontSize: '15px' } }}
                      value={potion.id === 1 ? reviveAmount : potion.id === 2 ? attackAmount : extraLifeAmount}
                      onChange={e => {
                        const newAmount = isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                        handleAmountChange(potion, newAmount)
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
              Total ${totalCost.toFixed(2)}
            </Typography>

            <BuyConsumablesButton disabled={totalCost === 0} onClick={buyConsumables}>
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
import ForwardIcon from '@mui/icons-material/Forward';
import { Box, Dialog, Slider, Typography } from '@mui/material';
import { useContext, useState } from 'react';
import heart from '../../assets/images/heart.png';
import potionsIcon from '../../assets/images/life-potion.png';
import { GameContext } from '../../contexts/gameContext';
import { calculateBattleResult, fetchBeastImage } from '../../helpers/beasts';
import { AttackButton } from '../../helpers/styles';
import { DojoContext } from '../../contexts/dojoContext';
import { getContractByName } from '@dojoengine/core';
import { dojoConfig } from '../../../dojoConfig';

function ApplyExtraLifePotion(props) {
  const dojo = useContext(DojoContext)
  const game = useContext(GameContext)

  const { selectedBeasts, collection, walletBalances, summit } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const { open, close } = props

  const [amount, setAmount] = useState(1)
  const [applyingConsumable, setApplyingConsumable] = useState(false)

  const applyExtraLife = async () => {
    setApplyingConsumable(true)

    try {
      const success = await dojo.executeTx([
        {
          contractAddress: import.meta.env.VITE_PUBLIC_EXTRA_LIFE_ERC20_ADDRESS,
          entrypoint: "approve",
          calldata: [getContractByName(dojoConfig.manifest, "savage_summit", "summit_systems")?.address, amount * 1e18, "0"]
        },
        {
          contractName: "summit_systems",
          entrypoint: "apply_consumable",
          calldata: [beast.id, "0x2", amount]
        }
      ])

      if (success) {
        let newBeast = { ...beast, extra_lives: (beast.extra_lives || 0) + amount }
        const newBattleResult = calculateBattleResult(newBeast, summit, newBeast.attack_potions)

        game.setState.walletBalances(prev => ({
          ...prev,
          extraLifePotions: prev.extraLifePotions - amount
        }))

        game.setState.beasts(prev => prev.map(_beast => ({
          ...(_beast.id === newBeast.id ? newBeast : _beast),
          ...(_beast.id === newBeast.id ? newBattleResult : {}),
        })))
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setApplyingConsumable(false)
      close(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => close(false)}
      maxWidth={'lg'}
      PaperProps={{
        sx: { background: '#feffda', border: '3px solid rgba(0, 0, 0, 0.35)', borderRadius: '10px', maxWidth: '95%' }
      }}
    >

      <Box sx={styles.dialogContainer}>
        <Box sx={styles.container}>

          <Typography fontSize={'35px'} letterSpacing={'1px'}>
            Extra Life
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box width={'120px'} height={'150px'} display={'flex'} alignItems={'center'} flexDirection={'column'} justifyContent={'space-between'}>
              <Box height={'28px'}></Box>

              <Box textAlign={'center'} display={'flex'} alignItems={'center'}>
                <Box width={'12px'} textAlign={'right'}>
                  <Typography variant='h2'>
                    {amount}
                  </Typography>
                </Box>

                <img src={potionsIcon} alt='' />
              </Box>

              <Slider
                defaultValue={amount}
                step={1}
                marks
                min={1}
                max={Math.min(walletBalances.extraLifePotions, 127)}
                onChange={(e) => setAmount(e.target.value)}
                size='small'
              />
            </Box>

            <ForwardIcon htmlColor='black' sx={{ fontSize: '50px' }} />

            <Box sx={{ position: 'relative', width: '150px', textAlign: 'center' }}>
              <img src={fetchBeastImage(beast.name)} alt='' height={'120px'} />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>

                {amount <= 5 ? (
                  Array.from({ length: amount }).map((_, index) => (
                    <img key={index} src={heart} alt='health icon' height={'20px'} />
                  ))
                ) : (
                  <>
                    <Typography variant='h4' sx={{ letterSpacing: '0.5px', mr: '4px', lineHeight: '16px' }}>
                      {amount}
                    </Typography>

                    <img src={heart} alt='health icon' height={'20px'} />
                  </>
                )}

              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'black' }}>
              You are about to burn {amount} extra life potions
            </Typography>

            <AttackButton disabled={amount === 0 || applyingConsumable} onClick={applyExtraLife}>
              {applyingConsumable
                ? <Box display={'flex'} alignItems={'baseline'}>
                  <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Applying</Typography>
                  <div className='dotLoader white' />
                </Box>
                : 'Apply'
              }
            </AttackButton>
          </Box>
        </Box>
      </Box>

    </Dialog >
  )
}

export default ApplyExtraLifePotion

const styles = {
  dialogContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '480px',
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
  healthText: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%)',
    textAlign: 'center',
    letterSpacing: '0.5px'
  }
}
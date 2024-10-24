import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import ForwardIcon from '@mui/icons-material/Forward';
import { Box, Dialog, Slider, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import potionsIcon from '../../assets/images/attack-potion.png';
import sword from '../../assets/images/sword.png';
import { DojoContext } from '../../contexts/dojoContext';
import { GameContext } from '../../contexts/gameContext';
import { calculateBattleResult, fetchBeastImage } from '../../helpers/beasts';
import { AttackButton } from '../../helpers/styles';

function ApplyAttackPotion(props) {
  const dojo = useContext(DojoContext)
  const game = useContext(GameContext)
  const { selectedBeasts, collection, summit, walletBalances } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const { open, close } = props

  const [newBattleResult, setNewBattleResult] = useState(beast)
  const [amount, setAmount] = useState(1)

  const [applyingConsumable, setApplyingConsumable] = useState(false)

  const applyAttackPotion = async () => {
    setApplyingConsumable(true)

    try {
      const success = true
      // const success = await dojo.executeTx([
      //   {
      //     contractName: "summit_systems",
      //     entrypoint: "apply_consumable",
      //     calldata: [beast.id, 1, amount]
      //   }
      // ])

      if (success) {
        game.setState.beasts(prev => prev.map(_beast => ({
          ..._beast,
          ...(_beast.id === beast.id ? newBattleResult : {}),
          attack_potions: _beast.id === beast.id ? amount : 0
        })))

        game.setState.walletBalances(prev => ({
          ...prev,
          attackPotions: prev.attackPotions - amount
        }))
      }
    } catch (ex) {
      console.log(ex)
    } finally {
      setApplyingConsumable(false)
      close(false)
    }
  }

  useEffect(() => {
    const newBattleResult = calculateBattleResult(beast, summit, amount)
    setNewBattleResult(newBattleResult)
  }, [amount])

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

          <Box sx={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography fontSize={'35px'} letterSpacing={'1px'}>
              Boost Attack
            </Typography>

            <img src={sword} alt='' height={'24px'} />
          </Box>

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
                max={Math.min(walletBalances.attackPotions, 127)}
                onChange={(e) => setAmount(e.target.value)}
                size='small'
              />
            </Box>

            <ForwardIcon htmlColor='black' sx={{ fontSize: '50px' }} />

            <Box sx={{ position: 'relative', width: '150px', textAlign: 'center' }}>
              <img src={fetchBeastImage(beast.name)} alt='' height={'120px'} />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>

                {beast.damage && <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkred' }}>
                  {beast.damage} dmg
                </Typography>}

                {beast.healthLeft && <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkgreen' }}>
                  {beast.healthLeft} hp
                </Typography>}

                <ArrowRightAltIcon htmlColor='darkred' sx={{ fontSize: '25px' }} />

                {newBattleResult.damage && <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkred' }}>
                  {newBattleResult.damage} dmg
                </Typography>}

                {newBattleResult.healthLeft && <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkgreen' }}>
                  {newBattleResult.healthLeft} hp
                </Typography>}

              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'black' }}>
              Potions will be used once you attack
            </Typography>

            <AttackButton disabled={amount === 0 || applyingConsumable} onClick={applyAttackPotion}>
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

export default ApplyAttackPotion

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
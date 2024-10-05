import { Box, Dialog, Typography, Button, Slider } from '@mui/material';
import { GameContext } from '../../contexts/gameContext';
import { useContext } from 'react';
import { AttackButton, HealthBar } from '../../helpers/styles';
import ForwardIcon from '@mui/icons-material/Forward';
import potionsIcon from '../../assets/images/attack-potion.png';
import { fetchBeastImage } from '../../helpers/beasts';
import { useState } from 'react';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import sword from '../../assets/images/sword.png';

function ApplyAttackPotion(props) {
  const game = useContext(GameContext)
  const { selectedBeasts, collection } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const { open, close } = props

  const potions = 50
  const [amount, setAmount] = useState(1)

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
                max={Math.min(potions, 9)}
                onChange={(e) => setAmount(e.target.value)}
                size='small'
              />
            </Box>

            <ForwardIcon htmlColor='black' sx={{ fontSize: '50px' }} />

            <Box sx={{ position: 'relative', width: '150px', textAlign: 'center' }}>
              <img src={fetchBeastImage(beast.name)} alt='' height={'120px'} />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>

                <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkred' }}>
                  {beast.damage} dmg
                </Typography>

                <ArrowRightAltIcon htmlColor='darkred' sx={{ fontSize: '25px' }} />

                <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkred' }}>
                  {beast.damage * Math.pow(2, amount)} dmg
                </Typography>

              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'black' }}>
              Potions will be consumed once you attack
            </Typography>

            <AttackButton disabled={amount === 0}>
              Apply
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
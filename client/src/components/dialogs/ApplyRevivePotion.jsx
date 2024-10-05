import { Box, Dialog, Typography, Button } from '@mui/material';
import { GameContext } from '../../contexts/gameContext';
import { useContext } from 'react';
import { AttackButton, HealthBar } from '../../helpers/styles';
import ForwardIcon from '@mui/icons-material/Forward';
import potionsIcon from '../../assets/images/revive-potion.png';
import { fetchBeastImage } from '../../helpers/beasts';

function ApplyRevivePotion(props) {
  const { open, close } = props

  const game = useContext(GameContext)
  const { selectedBeasts, collection } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const potions = 5
  const notEnoughPotions = potions < 6 - beast.tier

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

          <Box sx={{ textAlign: 'center' }}>
            <Typography fontSize={'35px'} letterSpacing={'1px'} mb={1}>
              Revive Beast
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box width={'80px'} textAlign={'center'} display={'flex'} alignItems={'center'}>
              <Typography variant='h2' color={notEnoughPotions ? 'darkred' : 'black'}>
                {6 - beast.tier}
              </Typography>

              <img src={potionsIcon} alt='' />
            </Box>

            <ForwardIcon htmlColor='black' sx={{ fontSize: '50px' }} />

            <Box sx={{ position: 'relative' }}>
              <img src={fetchBeastImage(beast.name)} alt='' height={'120px'} />

              <Box position={'relative'} width={'100%'}>
                <HealthBar variant="determinate" value={100} sx={{ height: '14px', }} />

                <Box sx={styles.healthText}>
                  <Typography sx={{ fontSize: '13px', lineHeight: '14px', color: 'white' }}>
                    {beast.health}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {notEnoughPotions ? <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'darkred' }}>
              You need {6 - beast.tier} potions to revive this beast
            </Typography>
            : <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'black' }}>
              You are about to burn {6 - beast.tier} revive potions
            </Typography>}

            <AttackButton disabled={notEnoughPotions}>
              Consume
            </AttackButton>
          </Box>
        </Box>
      </Box>

    </Dialog>
  )
}

export default ApplyRevivePotion

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
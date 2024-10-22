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
  const { selectedBeasts, collection, walletBalances, applyingConsumable } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])

  const potionsRequired = (beast.revival_count || 0) + 1
  const notEnoughPotions = potionsRequired > walletBalances.revivePotions

  const reviveBeast = () => {
    game.actions.reviveBeast()
    close(false)
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

          <Box sx={{ textAlign: 'center' }}>
            <Typography fontSize={'35px'} letterSpacing={'1px'} mb={1.5}>
              Revive Beast
            </Typography>

            <Typography fontSize={'14px'} letterSpacing={'0.5px'} sx={{ color: 'rgba(0,0,0,0.7)' }}>
              The cost of reviving a beast increases with each revival. Max 16 potions.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box width={'80px'} textAlign={'center'} display={'flex'} alignItems={'center'}>
              <Typography variant='h2' color={notEnoughPotions ? 'darkred' : 'black'}>
                {potionsRequired}
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
              You need {potionsRequired} potions to revive this beast
            </Typography>
              : <Typography variant='h6' sx={{ letterSpacing: '0.5px', color: 'black' }}>
                You are about to burn {potionsRequired} revive {potionsRequired === 1 ? 'potion' : 'potions'}
              </Typography>}

            <AttackButton disabled={notEnoughPotions || applyingConsumable} onClick={reviveBeast}>
              {applyingConsumable
                ? <Box display={'flex'} alignItems={'baseline'}>
                  <Typography variant="h4" color={'white'} letterSpacing={'0.5px'}>Reviving</Typography>
                  <div className='dotLoader white' />
                </Box>
                : 'Apply'
              }
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
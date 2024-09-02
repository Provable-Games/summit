import { Box, Button, Dialog, IconButton, Typography } from '@mui/material';
import { BuyConsumablesButton } from '../../helpers/styles';
import potion from '../../assets/images/potion.png';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { useContext } from 'react';
import { GameContext } from '../../contexts/gameContext';

function BuyConsumables(props) {
  const { open, close } = props
  const [amount, setAmount] = useState(0)
  const game = useContext(GameContext)

  return (
    <Dialog
      open={open}
      onClose={() => { close(false); setAmount(0) }}
      maxWidth={'lg'}
      PaperProps={{
        sx: { background: '#feffda', border: '3px solid rgba(0, 0, 0, 0.35)', borderRadius: '10px' }
      }}
    >

      <Box sx={styles.wizardContainer}>
        <Box sx={styles.container}>

          <Box sx={styles.providerContainer}>
            <Typography variant='h3'>
              Buy Consumables
            </Typography>

            <Box sx={{ display: 'flex', height: '100px', alignItems: 'center' }}>
              <img src={potion} alt='' height={'60px'} />

              <IconButton sx={{ mr: 2 }} onClick={() => setAmount(prev => prev + 1)}>
                <AddIcon />
              </IconButton>

              <Typography variant='h3'>
                {amount}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Typography variant='h4' letterSpacing={'1px'}>
                ${amount * 0.25}
              </Typography>

              <BuyConsumablesButton onClick={() => { game.setState.totalReward(prev => prev + (amount * 0.25)), close(false); }}>
                Buy Potions
              </BuyConsumablesButton>
            </Box>
          </Box>

        </Box>
      </Box>

    </Dialog>
  )
}

export default BuyConsumables

const styles = {
  wizardContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '26px 10px',
    width: '250px',
  },
  container: {
    boxSizing: 'border-box',
    width: '100%',
    px: 4,
    py: 1,
    display: 'flex',
    justifyContent: 'space-between',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  providerContainer: {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  }
}
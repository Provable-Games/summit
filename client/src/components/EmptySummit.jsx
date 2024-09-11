import { Box, Typography } from '@mui/material'
import React from 'react'
import summitImage from '../assets/images/summit.png'
import { useContext } from 'react'
import { GameContext } from '../contexts/gameContext'

function EmptySummit() {
  const game = useContext(GameContext)
  const { summit } = game.getState

  return (
    <Box sx={styles.emptySummit}>
      <Box sx={styles.mainContainer}>
        {summit.loading
          ? <Box display={'flex'} alignItems={'baseline'}>
            <Typography variant="h2" letterSpacing={'1px'}>Fetching Summit</Typography>
            <div className='dotLoader' />
          </Box>
          : <Typography variant='h1' letterSpacing={'1px'}>
            The summit is empty
          </Typography>
        }

        <img src={summitImage} alt='' width={'100%'} style={{ position: 'absolute', bottom: '30px', zIndex: 0 }} />
      </Box>
    </Box>
  );
}

export default EmptySummit;

const styles = {
  emptySummit: {
    height: 'calc(100% - 270px)',
    width: '350px',
    boxSizing: 'border-box',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    pt: 2,
    overflow: 'hidden',
    transition: '0.3s',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
    height: '380px',
    justifyContent: 'space-between',
    position: 'relative',
  },
}
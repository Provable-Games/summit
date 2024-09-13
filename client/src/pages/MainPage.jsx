import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Typography } from '@mui/material'
import React, { useContext } from 'react'
import ActionBar from '../components/ActionBar'
import AdventurerCollection from '../components/AdventurerCollection'
import BeastCollection from '../components/BeastCollection'
import Chat from '../components/Chat'
import Feeding from '../components/Feeding'
import Leaderboard from '../components/Leaderboard'
import Summit from '../components/Summit'
import WalletConnect from '../components/WalletConnect'
import { GameContext } from '../contexts/gameContext'
import EmptySummit from '../components/EmptySummit'
import { BEAST_NAMES } from '../helpers/BeastData'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { fetchBeastImage } from '../helpers/beasts'
import { isBrowser, isMobile } from 'react-device-detect';

function MainPage() {
  const game = useContext(GameContext)
  const { showFeedingGround, summit } = game.getState

  function PreloadBeastImages() {
    return <>
      {React.Children.toArray(
        Object.values(BEAST_NAMES).map(name =>
          <LazyLoadImage
            style={{ position: 'fixed', top: '-5px', left: '-5px' }}
            alt={""}
            height={1}
            src={fetchBeastImage(name)}
            width={1}
          />
        ))}
    </>
  }

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {showFeedingGround ? <>
        {isBrowser && <Box sx={styles.sideContainer}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size='large' onClick={() => { game.setState.showFeedingGround(false); game.setState.selectedBeasts([]); }}>
              <ArrowBackIcon fontSize='large' htmlColor='black' />
            </IconButton>
            <Typography variant='h2'>
              Feeding Ground
            </Typography>
          </Box>
        </Box>}

        <Feeding />

        {isBrowser && <Box sx={styles.sideContainer}>
          <WalletConnect />
        </Box>}

        <Box sx={styles.bottomContainer}>
          <ActionBar />
          <AdventurerCollection />
        </Box>
      </>
        : <>
          {isBrowser && <Box sx={styles.sideContainer}>
            <Leaderboard />
            <Chat />
          </Box>}

          {summit.id ? <Summit /> : <EmptySummit />}

          {isBrowser && <Box sx={styles.sideContainer}>
            <WalletConnect />
          </Box>}

          <Box sx={styles.bottomContainer}>
            <ActionBar />
            <BeastCollection />
          </Box>
        </>
      }

      {isMobile && <Box sx={{ position: 'absolute', top: '10px' }}>
        <WalletConnect />
      </Box>
      }
    </Box >

    {PreloadBeastImages()}
  </>
}

export default MainPage

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative'
  },
  bottomContainer: {
    width: '100%',
    height: '100vh',
    maxHeight: '260px',
    position: 'absolute',
    background: '#fbf7da',
    bottom: 0,
    zIndex: 101
  },
  sideContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 'calc(100% - 260px)',
    width: '400px',
    p: 1.5,
    boxSizing: 'border-box',
  }
}
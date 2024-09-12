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

function MainPage() {
  const game = useContext(GameContext)
  const { showFeedingGround, summit } = game.getState

  function PreloadBeastImages() {
    return <>
      {React.Children.toArray(
        Object.values(BEAST_NAMES).map(name =>
          <LazyLoadImage
            alt={""}
            height={0}
            src={fetchBeastImage(name)}
            width={0}
          />
        ))}
    </>
  }

  return <>
    <Box sx={styles.container}>
      {showFeedingGround ? <>
        <Box sx={styles.sideContainer}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size='large' onClick={() => { game.setState.showFeedingGround(false); game.setState.selectedBeasts([]); }}>
              <ArrowBackIcon fontSize='large' htmlColor='black' />
            </IconButton>
            <Typography variant='h2'>
              Feeding Ground
            </Typography>
          </Box>
        </Box>

        <Feeding />

        <Box sx={styles.sideContainer}>
          <WalletConnect />
        </Box>

        <Box sx={styles.bottomContainer}>
          <ActionBar />
          <AdventurerCollection />
        </Box>
      </>
        : <>
          <Box sx={styles.sideContainer}>
            <Leaderboard />
            <Chat />
          </Box>

          {summit.id ? <Summit /> : <EmptySummit />}

          <Box sx={styles.sideContainer}>
            <WalletConnect />
          </Box>

          <Box sx={styles.bottomContainer}>
            <ActionBar />
            <BeastCollection />
          </Box>
        </>
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
    justifyContent: 'space-between',
    position: 'relative'
  },
  bottomContainer: {
    width: '100%',
    height: '260px',
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
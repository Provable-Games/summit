import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Typography } from '@mui/material'
import React from 'react'
import { isBrowser, isMobile } from 'react-device-detect'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import ActionBar from '../components/ActionBar'
import AdventurerCollection from '../components/AdventurerCollection'
import BeastCollection from '../components/BeastCollection'
import Feeding from '../components/Feeding'
import Leaderboard from '../components/Leaderboard'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import ConnectWallet from '../components/dialogs/ConnectWallet'
import { useGameStore } from "@/stores/gameStore";
import { BEAST_NAMES } from '../utils/BeastData'
import { fetchBeastImage } from '../utils/beasts'

function MainPage() {
  const { summit, showFeedingGround, setShowFeedingGround } = useGameStore()

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
            <IconButton size='large'>
              <ArrowBackIcon fontSize='large' htmlColor='black' />
            </IconButton>
            <Typography variant='h2'>
              Feeding Ground
            </Typography>
          </Box>
        </Box>}

        <Feeding />

        {isBrowser && <Box sx={styles.sideContainer} alignItems={'flex-end'}>
          <ProfileCard />
        </Box>}

        <Box sx={styles.bottomContainer}>
          <ActionBar />
          <AdventurerCollection />
        </Box>
      </>
        : <>
          {isBrowser && <Box sx={styles.sideContainer}>
            <Leaderboard />
          </Box>}

          {summit && <Summit />}

          {isBrowser && <Box sx={styles.sideContainer} alignItems={'flex-end'}>
            <ProfileCard />
          </Box>}

          <Box sx={styles.bottomContainer}>
            <ActionBar />
            <BeastCollection />
          </Box>
        </>
      }

      {isMobile && <Box sx={{ position: 'absolute', top: '10px', width: '100%', boxSizing: 'border-box', px: 1, display: 'flex', justifyContent: 'center' }}>
        {showFeedingGround
          ? <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <IconButton size='large' onClick={() => { setShowFeedingGround(false); }}>
              <ArrowBackIcon fontSize='large' htmlColor='black' />
            </IconButton>

            <Typography variant='h2'>
              Feeding Ground
            </Typography>

            <Box width={'60px'} />
          </Box>
          : <ConnectWallet />
        }
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
    height: '260px',
    minHeight: '260px',
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
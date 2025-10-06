import { useGameStore } from "@/stores/gameStore"
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Typography } from '@mui/material'
import { isBrowser, isMobile } from 'react-device-detect'
import ActionBar from '../components/ActionBar'
import AdventurerCollection from '../components/AdventurerCollection'
import BeastCollection from '../components/BeastCollection'
import Feeding from '../components/Feeding'
import Leaderboard from '../components/Leaderboard'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import ConnectWallet from '../components/dialogs/ConnectWallet'
import { gameColors } from '../utils/themes'

function MainPage() {
  const { summit, showFeedingGround, setShowFeedingGround } = useGameStore()

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {showFeedingGround ? <>
        {isBrowser && <Box sx={styles.sideContainer}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size='large' onClick={() => setShowFeedingGround(false)}>
              <ArrowBackIcon fontSize='large' htmlColor={gameColors.gameYellow} />
            </IconButton>
            <Typography variant='h3' color={gameColors.gameYellow} fontWeight={'600'} mt={'4px'}>
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
              <ArrowBackIcon fontSize='large' htmlColor={gameColors.brightGreen} />
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

  </>
}

export default MainPage

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    backgroundColor: 'transparent'
  },
  bottomContainer: {
    width: '100%',
    height: '271px',
    position: 'absolute',
    background: `linear-gradient(to bottom, transparent, ${gameColors.darkGreen})`,
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
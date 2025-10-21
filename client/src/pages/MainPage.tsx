import { useGameStore } from "@/stores/gameStore"
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Typography } from '@mui/material'
import { isBrowser, isMobile } from 'react-device-detect'
import ActionBar from '../components/ActionBar'
import AdventurerCollection from '../components/AdventurerCollection'
import BeastCollection from '../components/BeastCollection'
import BurgerMenu from '../components/BurgerMenu'
import Feeding from '../components/Feeding'
import KilledByAdventurers from '../components/KilledByAdventurers'
import Leaderboard from '../components/Leaderboard'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import { gameColors } from '../utils/themes'
import Countdown from "@/components/Countdown"
import AttackingBeasts from "@/components/AttackingBeasts"

function MainPage() {
  const { summit, showFeedingGround, setShowFeedingGround, attackInProgress } = useGameStore()

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {summit?.beast?.shiny ? <Box sx={styles.shinyContainer}>
        <img src="/images/shiny.png" alt="shiny" />
      </Box> : null}

      {showFeedingGround ? <>
        {isBrowser && <Box sx={[styles.sideContainer, { justifyContent: 'flex-start' }]}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
            <IconButton size='large' onClick={() => setShowFeedingGround(false)}>
              <ArrowBackIcon fontSize='large' htmlColor={gameColors.gameYellow} />
            </IconButton>
            <Typography variant='h3' color={gameColors.gameYellow} fontWeight={'600'} mt={'4px'}>
              Feeding Ground
            </Typography>
          </Box>
          <KilledByAdventurers />
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

          {!attackInProgress && <Box sx={styles.bottomContainer}>
            <ActionBar />
            <BeastCollection />
          </Box>}

          {attackInProgress &&
            <AttackingBeasts />
          }
        </>
      }

      {isMobile && <Box sx={{ position: 'absolute', top: '10px', width: '100%', boxSizing: 'border-box', px: 1, display: 'flex', justifyContent: 'center' }}>
        {showFeedingGround
          ? <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', width: '100%' }}>
            <IconButton size='medium' onClick={() => setShowFeedingGround(false)}>
              <ArrowBackIcon fontSize='medium' htmlColor={gameColors.gameYellow} />
            </IconButton>
            <Typography variant='h4' color={gameColors.gameYellow} fontWeight={'600'} mt={'10px'}>
              Feeding Ground
            </Typography>

            <Box width={'60px'} />
          </Box>
          : <Box pt={'12px'}>
            <Typography sx={styles.title}>SUMMIT</Typography>
          </Box>
        }
      </Box>
      }

      {isMobile && <BurgerMenu />}

      <Countdown />
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
  shinyContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 0
  },
  bottomContainer: {
    width: '100%',
    height: '271px',
    position: 'absolute',
    bottom: 0,
    background: `linear-gradient(to bottom, transparent, ${gameColors.darkGreen})`,
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
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    textAlign: 'center',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
}
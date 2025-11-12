import AttackingBeasts from "@/components/AttackingBeasts"
import Countdown from "@/components/Countdown"
import { useGameDirector } from "@/contexts/GameDirector"
import { useGameStore } from "@/stores/gameStore"
import { Box, Typography } from '@mui/material'
import { isBrowser, isMobile } from 'react-device-detect'
import ActionBar from '../components/ActionBar'
import BeastCollection from '../components/BeastCollection'
import BurgerMenu from '../components/BurgerMenu'
import Leaderboard from '../components/Leaderboard'
import Onboarding from '../components/Onboarding'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import { gameColors } from '../utils/themes'

function MainPage() {
  const { summit, attackInProgress, selectedBeasts, onboarding } = useGameStore()
  const { pauseUpdates } = useGameDirector();

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {summit?.beast?.shiny ? <Box sx={styles.shinyContainer}>
        <img src="/images/shiny.png" alt="shiny" />
      </Box> : null}

      <>
        {isBrowser && <Box sx={styles.sideContainer}>
          <Leaderboard />
        </Box>}

        {summit && <Summit />}

        {!onboarding
          ? <Onboarding />
          : <>
            {isBrowser && <Box sx={styles.sideContainer} alignItems={'flex-end'}>
              <ProfileCard />
            </Box>}

            {(!attackInProgress || !pauseUpdates) && <Box sx={styles.bottomContainer}>
              <ActionBar />
              <BeastCollection />
            </Box>}

            {(attackInProgress && pauseUpdates && selectedBeasts.length > 0) &&
              <AttackingBeasts />
            }
          </>}
      </>

      {isMobile && <Box sx={{ position: 'absolute', top: '10px', width: '100%', boxSizing: 'border-box', px: 1, display: 'flex', justifyContent: 'center' }}>
        <Box pt={'12px'}>
          <Typography sx={styles.title}>SUMMIT</Typography>
        </Box>
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
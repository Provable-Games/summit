import AttackingBeasts from "@/components/AttackingBeasts"
import Countdown from "@/components/Countdown"
import { useGameDirector } from "@/contexts/GameDirector"
import { useGameStore } from "@/stores/gameStore"
import { Box, Typography } from '@mui/material'
import { isBrowser, isMobile } from 'react-device-detect'
import { useState } from 'react'
import ActionBar from '../components/ActionBar'
import BeastCollection from '../components/BeastCollection'
import BurgerMenu from '../components/BurgerMenu'
import ClaimRewardsButton from '../components/ClaimRewardsButton'
import Leaderboard from '../components/Leaderboard'
import LeaderboardButton from '../components/LeaderboardButton'
import BeastBoard from '../components/BeastBoard'
import Top5000BeastsModal from '../components/dialogs/Top5000BeastsModal'
import LeaderboardModal from '../components/dialogs/LeaderboardModal'
import Onboarding from '../components/Onboarding'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import { gameColors } from '../utils/themes'

function MainPage() {
  const { summit, attackInProgress, selectedBeasts, onboarding, attackMode } = useGameStore()
  const { pauseUpdates } = useGameDirector();
  const [top5000ModalOpen, setTop5000ModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {summit?.beast?.shiny ? <Box sx={styles.shinyContainer}>
        <img src="/images/shiny.png" alt="shiny" />
      </Box> : null}

      <>
        {isBrowser && <Box sx={styles.sideContainer}>
          <Box sx={styles.leaderboardSection}>
            <Leaderboard />
            <LeaderboardButton onClick={() => setLeaderboardModalOpen(true)} />
          </Box>
        </Box>}

        {summit && <Summit />}

        {isBrowser && <Box sx={styles.sideContainer} alignItems={'flex-end'}>
          <Box sx={styles.profileSection}>
            <ClaimRewardsButton />
            <BeastBoard onClick={() => setTop5000ModalOpen(true)} />
            <ProfileCard />
          </Box>
        </Box>}

        {onboarding
          ? <Onboarding />
          : <>
            {(attackInProgress && pauseUpdates && selectedBeasts.length > 0 && attackMode !== 'autopilot' && attackMode !== 'capture')
              ? <AttackingBeasts />
              : <Box sx={styles.bottomContainer}>
                <ActionBar />
                <BeastCollection />
              </Box>
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

    {top5000ModalOpen && (
      <Top5000BeastsModal
        open={top5000ModalOpen}
        onClose={() => setTop5000ModalOpen(false)}
      />
    )}

    {leaderboardModalOpen && (
      <LeaderboardModal
        open={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
      />
    )}
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
  profileSection: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1,
  },
  leaderboardSection: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1,
  },
}
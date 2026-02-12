import AttackingBeasts from "@/components/AttackingBeasts"
import Countdown from "@/components/Countdown"
import { useGameDirector } from "@/contexts/GameDirector"
import { useGameStore } from "@/stores/gameStore"
import { Box, Typography } from '@mui/material'
import { useAccount } from "@starknet-react/core"
import { useState } from 'react'
import { isBrowser, isMobile } from 'react-device-detect'
import ActionBar from '../components/ActionBar'
import QuestBoard from '../components/QuestBoard'
import BeastCollection from '../components/BeastCollection'
import BurgerMenu from '../components/BurgerMenu'
import ClaimRewardsButton from '../components/ClaimRewardsButton'
import EventHistoryModal from '../components/dialogs/EventHistoryModal'
import LeaderboardModal from '../components/dialogs/LeaderboardModal'
import QuestsModal from '../components/dialogs/QuestsModal'
import EventHistoryButton from '../components/EventHistoryButton'
import GameNotificationFeed from '../components/GameNotificationFeed'
import Leaderboard from '../components/Leaderboard'
import LeaderboardButton from '../components/LeaderboardButton'
import ProfileCard from '../components/ProfileCard'
import Summit from '../components/Summit'
import { gameColors } from '../utils/themes'

function MainPage() {
  const { address } = useAccount()
  const { summit, attackInProgress, selectedBeasts, attackMode } = useGameStore()
  const { pauseUpdates } = useGameDirector();
  const [questsModalOpen, setQuestsModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [eventHistoryModalOpen, setEventHistoryModalOpen] = useState(false);

  return <>
    <Box sx={styles.container} justifyContent={isBrowser ? 'space-between' : 'center'}>
      {summit?.beast?.shiny ? <Box sx={styles.shinyContainer}>
        <img src="/images/shiny.png" alt="shiny" />
      </Box> : null}

      <>
        {isBrowser && <Box sx={styles.sideContainer}>
          <Box sx={styles.leaderboardSection}>
            <Leaderboard />
            <Box sx={styles.buttonsContainer}>
              <LeaderboardButton onClick={() => setLeaderboardModalOpen(true)} />
              <EventHistoryButton onClick={() => setEventHistoryModalOpen(true)} />
            </Box>
          </Box>
        </Box>}

        {summit && <Summit />}

        {isBrowser && <Box sx={styles.sideContainer} alignItems={'flex-end'}>
          <Box sx={styles.profileSection}>
            {address ? <QuestBoard onClick={() => setQuestsModalOpen(true)} /> : null}
            {address ? <ClaimRewardsButton /> : null}
            <ProfileCard />
          </Box>
        </Box>}

        {isBrowser && <GameNotificationFeed />}

        <>
          {(attackInProgress && pauseUpdates && selectedBeasts.length > 0 && attackMode !== 'autopilot')
            ? <AttackingBeasts />
            : <Box sx={styles.bottomContainer}>
              <ActionBar />
              <BeastCollection />
            </Box>
          }
        </>
      </>

      {isMobile && <BurgerMenu />}

      <Countdown />
    </Box >

    {questsModalOpen && (
      <QuestsModal
        open={questsModalOpen}
        onClose={() => setQuestsModalOpen(false)}
      />
    )}

    {leaderboardModalOpen && (
      <LeaderboardModal
        open={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
      />
    )}

    {eventHistoryModalOpen && (
      <EventHistoryModal
        open={eventHistoryModalOpen}
        onClose={() => setEventHistoryModalOpen(false)}
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
    minHeight: '266px',
    position: 'absolute',
    bottom: 0,
    background: `linear-gradient(to bottom, transparent, ${gameColors.darkGreen})`,
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
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
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
}
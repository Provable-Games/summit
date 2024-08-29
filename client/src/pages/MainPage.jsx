import { Box, Typography } from '@mui/material'
import React from 'react'
import ActionBar from '../components/ActionBar'
import BeastCollection from '../components/BeastCollection'
import Summit from '../components/Summit'
import WalletConnect from '../components/WalletConnect'
import Leaderboard from '../components/Leaderboard'

function MainPage() {
  return <Box sx={styles.container}>
    <Box sx={{ boxSizing: 'border-box', width: '400px', height: 'calc(100% - 255px)', p: 2 }}>

      <Leaderboard />

    </Box>

    <Summit />

    <Box width={'400px'}>
      <WalletConnect />
    </Box>

    <Box sx={styles.bottomContainer}>
      <ActionBar />
      <BeastCollection />
    </Box>


  </Box>
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
    bottom: 0
  },
}
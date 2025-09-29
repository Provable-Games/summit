import { Box, Typography } from "@mui/material";
import React, { useContext } from 'react';
import skull from '../assets/images/skull.svg';
import hero from '../assets/images/profile.svg';
import { useGameStore } from '@/stores/gameStore';
import { fetchBeastImage, normaliseHealth } from "../utils/beasts";
import { HealthBar } from '../utils/styles';
import StarIcon from '@mui/icons-material/Star';
import { isBrowser } from "react-device-detect";

const STAR_COLORS = {
  1: "#ff6f3a",
  2: "#C0C0C0",
  3: "#CD7F32"
}

function AdventurerCollection() {
  const game = useGameStore()
  const { adventurerCollection, selectedAdventurers, loadingAdventurers } = game.getState

  const selectAdventurer = (adventurer) => {
    if (selectedAdventurers.find(selected => selected.id === adventurer.id)) {
      game.setState.selectedAdventurers(prev => prev.filter(prev => prev.id !== adventurer.id))
    } else {
      game.setState.selectedAdventurers(prev => [...prev, adventurer])
    }
  }

  return (
    <Box sx={styles.container}>
      {loadingAdventurers && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

        <Box textAlign={'center'}>
          <Box display={'flex'} alignItems={'baseline'}>
            <Typography variant="h2" letterSpacing={'0.5px'}>Fetching adventurers</Typography>
            <div className='dotLoader' />
          </Box>
        </Box>

      </Box>}

      {React.Children.toArray(
        adventurerCollection.map(adventurer => {
          const isSelected = selectedAdventurers.some(selected => selected.id === adventurer.id)
          const isRanked = adventurer.rank > 0

          return <Box onClick={() => { if (!isRanked) selectAdventurer(adventurer); }}
            sx={[styles.itemContainer, isRanked && styles.rankedItem, isSelected && styles.selectedItem, ((selectedAdventurers.length > 0) && !isSelected) && { opacity: 0.5, borderColor: 'transparent' }]}
          >

            {isRanked && <StarIcon htmlColor={STAR_COLORS[adventurer.rank]} sx={{ position: 'absolute', top: '0', left: '0', fontSize: '20px' }} />}

            <Typography variant="h5" sx={{ lineHeight: '15px', letterSpacing: '1px', textAlign: 'center' }}>
              Adventurer #{adventurer.id}
            </Typography>

            <Box mt={1.5} mb={1.5}>
              {adventurer.health > 0 ? <img alt='' src={hero} height={'50px'} /> : <img alt='' src={skull} height={'50px'} />}
            </Box>

            <Typography sx={{ letterSpacing: '1px', lineHeight: '14px' }}>
              LEVEL {adventurer.level}
            </Typography>

            <Box position={'relative'} width={'100%'}>
              <HealthBar variant="determinate" value={normaliseHealth(adventurer.health, Math.max(90, adventurer.health))} />

              <Box sx={styles.healthText}>
                <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px' }}>
                  {adventurer.health}
                </Typography>
              </Box>
            </Box>
          </Box>
        })

      )}

      {adventurerCollection.length < 1 && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

        <Box textAlign={'center'}>
          <Typography variant="h2" letterSpacing={'0.5px'}>
            You don't own any dead adventurers
          </Typography>
          <Typography variant="h2" letterSpacing={'0.5px'}>
            Collect them in <a style={{ color: '#30a019' }} href="https://lootsurvivor.io" target="_blank">loot survivor 1.5</a>
          </Typography>
          <Typography variant="h2" letterSpacing={'0.5px'}>
            Or buy in <a style={{ color: '#ff92b6' }} href="https://market.realms.world/collection/0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4" target="_blank">Market</a>
          </Typography>
        </Box>

        {isBrowser && <img src={fetchBeastImage('ettin')} alt='' height={'150px'} />}

      </Box>}
    </Box >
  );
}

export default AdventurerCollection;

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    gap: 1,
    overflowX: 'auto',
    boxSizing: 'border-box',
    p: '5px'
  },
  itemContainer: {
    position: 'relative',
    height: '180px',
    boxSizing: 'border-box',
    width: '120px',
    minWidth: '120px',
    padding: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    cursor: 'pointer',
    borderRadius: '5px',
    border: '2px solid rgba(0, 0, 0, 0.5)',
    background: '#f6e6bc',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease',
  },
  selectedItem: {
    boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px;',
    border: '2px solid rgba(0, 0, 0, 0.8)',
  },
  rankedItem: {
    boxShadow: '0 0 5px 3px rgba(255, 165, 0, 1)'
  },
  healthText: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%)',
    textAlign: 'center'
  },
  order: {
    position: 'absolute',
    top: 0,
    left: 5
  },
  rank: {
    position: 'absolute',
    left: '5px',
    top: '40%'
  }
}
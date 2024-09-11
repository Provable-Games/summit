import { Box, Typography } from "@mui/material";
import { useAccount } from "@starknet-react/core";
import React, { useContext } from 'react';
import skull from '../assets/images/skull.png';
import sword from '../assets/images/sword.png';
import book from '../assets/images/book.png';
import club from '../assets/images/club.png';
import shortsword from '../assets/images/shortsword.png';
import { GameContext } from '../contexts/gameContext';
import { normaliseHealth } from "../helpers/beasts";
import { HealthBar } from '../helpers/styles';

function AdventurerCollection() {
  const game = useContext(GameContext)
  const { adventurerCollection, selectedAdventurers, isThrowing } = game.getState

  const selectAdventurer = (id) => {
    if (selectedAdventurers.includes(id)) {
      game.setState.selectedAdventurers(prev => prev.filter(prevId => prevId !== id))
    } else {
      game.setState.selectedAdventurers(prev => [...prev, id])
    }
  }

  return (
    <Box sx={styles.container}>

      {React.Children.toArray(
        adventurerCollection.map(adventurer => {
          const isSelected = selectedAdventurers.includes(adventurer.id)

          return <Box onClick={() => selectAdventurer(adventurer.id)}
            sx={[styles.itemContainer, isSelected && styles.selectedItem, ((selectedAdventurers.length > 0) && !isSelected) && { opacity: 0.5, borderColor: 'transparent' }]}
          >

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <Typography variant='h6' sx={{ lineHeight: '10px', letterSpacing: '0.5px' }}>
                {adventurer.name}
              </Typography>
              <Typography sx={{ letterSpacing: '0.5px' }}>
                lvl {adventurer.level}
              </Typography>
            </Box>

            {isThrowing
              ? <Box my={1}>
                <img alt='' src={adventurer.weapon === 'book' ? book : adventurer.weapon === 'club' ? club : shortsword} height={'60px'} />
              </Box>
              : <Box my={2}>
                <img alt='' src={skull} height={'40px'} />
              </Box>
            }

            {isThrowing
              ? <Box position={'relative'} width={'100%'}>
                <HealthBar variant="determinate" value={normaliseHealth(adventurer.healthLeft, adventurer.health)} />

                <Box sx={styles.healthText}>
                  <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px' }}>
                    {adventurer.healthLeft}
                  </Typography>
                </Box>
              </Box>
              : <Box position={'relative'} width={'100%'}>
                <HealthBar variant="determinate" value={normaliseHealth(0, adventurer.health)} />

                <Box sx={styles.healthText}>
                  <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px' }}>
                    0
                  </Typography>
                </Box>
              </Box>}

            <Box display={'flex'} gap={'3px'} alignItems={'center'} my={'5px'}>
              <img src={sword} alt='' height={'13px'} />

              <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'darkred'}>
                {adventurer.damage} dmg
              </Typography>
            </Box>

          </Box>
        })

      )}
    </Box>
  );
}

export default AdventurerCollection;

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    gap: 1,
    overflowX: 'scroll',
    boxSizing: 'border-box',
    p: '5px'
  },
  itemContainer: {
    position: 'relative',
    height: '100%',
    width: '100px',
    minWidth: '100px',
    padding: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    cursor: 'pointer',
    borderRadius: '5px',
    border: '2px solid rgba(0, 0, 0, 0.5)',
    background: '#f6e6bc',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease'
  },
  selectedItem: {
    boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px;',
    border: '2px solid rgba(0, 0, 0, 0.8)',
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
  }
}
import { Box, Typography } from "@mui/material";
import React, { useContext } from 'react';
import health from '../assets/images/health.png';
import sword from '../assets/images/sword.png';
import { GameContext } from '../contexts/gameContext';
import { calculateBattleResult, fetchBeastImage, normaliseHealth } from "../helpers/beasts";
import { HealthBar } from '../helpers/styles';
import { useAccount } from "@starknet-react/core";

function BeastCollection() {
  const game = useContext(GameContext)
  const { address } = useAccount()

  const selectBeast = (id) => {
    if (game.selected.includes(id)) {
      game.setSelected(prev => prev.filter(prevId => prevId !== id))
    } else {
      game.setSelected(prev => [...prev, id])
    }
  }

  return (
    <Box sx={styles.container}>
      {!address && !game.loadingCollection && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

        <Box textAlign={'center'}>
          <Typography variant="h2" letterSpacing={'0.5px'}>
            Connect Your Wallet
          </Typography>
          <Typography variant="h2" letterSpacing={'0.5px'}>
            Take the summit
          </Typography>
        </Box>

        <img src={fetchBeastImage('tarrasque')} alt='' height={'150px'} />

      </Box>}

      {game.loadingCollection && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, height: '200px', width: '100%' }}>

        <Box textAlign={'center'}>
          <Box display={'flex'} alignItems={'baseline'}>
            <Typography variant="h2" letterSpacing={'0.5px'}>Fetching beasts</Typography>
            <div className='dotLoader' />
          </Box>
        </Box>

      </Box>}

      {
        React.Children.toArray(
          game.collection.map(beast => {
            const isSelected = game.selected.includes(beast.id)
            return <Box
              sx={[styles.itemContainer, isSelected && styles.selectedItem, (game.selected.length > 0 && !isSelected) && { opacity: 0.5, borderColor: 'transparent' }]}
              onClick={() => selectBeast(beast.id)}>

              {isSelected && <Box sx={styles.order}>
                <Typography variant="h6" lineHeight={'19px'}>
                  {game.selected.findIndex(x => x === beast.id) + 1}
                </Typography>
              </Box>}

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <Typography variant='h6' sx={{ lineHeight: '10px', letterSpacing: '0.5px' }}>
                  {beast.name}
                </Typography>
                <Typography sx={{ letterSpacing: '0.5px' }}>
                  lvl {beast.level}
                </Typography>
              </Box>

              <img alt='' src={fetchBeastImage(beast.name)} height={'80px'} />

              <Box position={'relative'} width={'100%'}>
                <HealthBar variant="determinate" value={normaliseHealth(beast.health, beast.maxHealth)} />

                <Box sx={styles.healthText}>
                  <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px' }}>
                    {beast.health}
                  </Typography>
                </Box>
              </Box>

              {beast.capture
                ? <>
                  <Typography lineHeight={'10px'} letterSpacing={'0.5px'} color={'darkgreen'}>
                    Success
                  </Typography>

                  <Box display={'flex'} alignItems={'center'} gap={'2px'}>
                    <img src={health} alt='' height={'13px'} />

                    <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'darkgreen'}>
                      {beast.healthLeft} hp
                    </Typography>
                  </Box>
                </>

                : <>

                  <Typography lineHeight={'10px'} letterSpacing={'0.5px'} color={'darkred'}>
                    Defeat
                  </Typography>

                  <Box display={'flex'} gap={'3px'} alignItems={'center'}>
                    <img src={sword} alt='' height={'10px'} />

                    <Typography lineHeight={'6px'} letterSpacing={'0.5px'} color={'darkred'}>
                      {beast.damage} dmg
                    </Typography>
                  </Box>
                </>
              }

            </Box>
          })
        )
      }

    </Box >
  );
}

export default BeastCollection;

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
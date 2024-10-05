import { Box, Typography } from '@mui/material';
import React, { useContext } from 'react';
import { GameContext } from '../contexts/gameContext';
import { normaliseHealth } from '../helpers/beasts';
import { BeastsCollectedBar } from '../helpers/styles';

const leaderboardExample = [
  {
    rank: 1,
    name: "'Wrath Bane' Warlock",
    savage: 500,
  },
  {
    rank: 2,
    name: "'Ghoul Root' Typhon",
    savage: 482,
  },
  {
    rank: 3,
    name: "'Phoenix Form' Goblin",
    savage: 485,
  },
  {
    rank: 4,
    name: "'Spirit Song' Sprite",
    savage: 392,
  },
  {
    rank: 5,
    name: "'Honour Bender' Gorgon",
    savage: 360,
  },
]

function Leaderboard(props) {
  const game = useContext(GameContext)
  const { totalSupply, deadBeastCount } = game.getState

  return <Box sx={styles.container}>
    <Box sx={styles.innerContainer}>

      <Box sx={styles.content}>

        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '28px', letterSpacing: '1px', textAlign: 'center', width: '100%' }}>
            Summit
          </Typography>

          {/* <Typography sx={{ letterSpacing: '0.5px' }} variant='h5'>
            ${totalReward}
          </Typography> */}
        </Box>

        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, mb: 1 }}>
          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />

          <Box sx={{ width: '50%', height: '18px', border: '2px solid #07323d', textAlign: 'center', borderRadius: '10px', background: '#ddcdaa' }}>
            <Typography letterSpacing={'1px'} fontWeight={'bold'}>
              The Big Five
            </Typography>
          </Box>

          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />
        </Box>

        {React.Children.toArray(
          leaderboardExample.map(score => <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Typography sx={{ width: '8px' }}>
                {score.rank}.
              </Typography>
              <Typography sx={{ letterSpacing: '0.5px' }}>
                {score.name}
              </Typography>
            </Box>

            <Box display={'flex'} alignItems={'center'} gap={'2px'}>
              <Typography>
                {score.savage}
              </Typography>
            </Box>
          </Box>
          ))}

        {/* <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />

          <Box sx={{ width: '50%', height: '18px', border: '2px solid #07323d', textAlign: 'center', borderRadius: '10px', background: '#ddcdaa' }}>
            <Typography letterSpacing={'1px'} fontWeight={'bold'}>
              Potion cost
            </Typography>
          </Box>

          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Revive potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            $0.25
          </Typography>
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Attack potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            $0.75
          </Typography>
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Extra life potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            $2.10
          </Typography>
        </Box> */}

        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />

          <Box sx={{ width: '50%', height: '18px', border: '2px solid #07323d', textAlign: 'center', borderRadius: '10px', background: '#ddcdaa' }}>
            <Typography letterSpacing={'1px'} fontWeight={'bold'}>
              Stats
            </Typography>
          </Box>

          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Beasts alive
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            {totalSupply - deadBeastCount}/{totalSupply}
          </Typography>
        </Box>

        <Typography letterSpacing={'0.5px'} mt={1} color={'#006400'}>
          Beasts collected
        </Typography>
        <BeastsCollectedBar variant="determinate" value={normaliseHealth(totalSupply, 93150)} />

      </Box>

    </Box>
  </Box>;
}

export default Leaderboard;

const styles = {
  container: {
    width: '295px',
    border: '4px solid #1f8c9b',
    borderRadius: '16px',
    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px, rgb(51, 51, 51) 0px 0px 0px 2px'
  },
  innerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    boxSizing: 'border-box',
    border: '2px solid #1f8c9b',
    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px, rgb(51, 51, 51) 0px 0px 0px 2px'
  },
  content: {
    width: '100%',
    minHeight: '100%',
    borderRadius: '10px',
    boxSizing: 'border-box',
    p: '12px',
    background: '#f6e6bc',
    border: '2px solid rgb(51, 51, 51)',
    boxShadow: 'rgba(0, 0, 0, 0.24) 0px 3px 8px inset',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
}
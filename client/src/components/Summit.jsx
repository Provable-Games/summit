import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import React, { useContext, useEffect } from 'react'
import summit from '../assets/images/summit.png'
import { GameContext } from '../contexts/gameContext'
import { fetchBeastImage, normaliseHealth } from '../helpers/beasts'
import { HealthBar } from '../helpers/styles'
import SummitTimer from './SummitTimer'
import AttackAnimation from './animations/AttackAnimation'

function Summit() {
  const game = useContext(GameContext)
  const controls = useAnimationControls()

  const removeAttackAnimation = (id) => {
    game.setAttackAnimations((prevAnimations) => prevAnimations.filter((anim) => anim.id !== id));
  };

  const newSavageAnimation = async (beast) => {
    await controls.start({
      opacity: 0,
      transition: { duration: 1, type: 'just' }
    })

    game.setSummit({ ...beast })

    await controls.start({
      opacity: 1,
      transition: { duration: 0.8, type: 'just' }
    })
  }

  useEffect(() => {
    if (game.summitAnimations.length > 0) {
      newSavageAnimation(game.summitAnimations[0])
      game.setSummitAnimations(prev => prev.slice(1))
    }
  }, [game.summitAnimations])

  return (
    <Box sx={styles.beastSummit}>
      <Box position={'relative'} width={'100%'} mb={2}>
        <HealthBar variant="determinate" value={normaliseHealth(game.summit.health, game.summit.maxHealth)} />

        <Box sx={styles.healthText}>
          <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white' }}>
            {game.summit.health}
          </Typography>
        </Box>
      </Box>

      <motion.div animate={controls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
        <Typography variant='h3' sx={{ lineHeight: '14px', textAlign: 'center' }}>
          {game.summit.fullName}
        </Typography>
        <Typography variant='h4'>
          lvl {game.summit.level}
        </Typography>
      </motion.div>

      <motion.img
        key={game.summit.fullName}
        style={{ zIndex: 1, height: '180px' }}
        src={fetchBeastImage(game.summit.name)} alt=''
        animate={controls}
      />

      <img src={summit} alt='' width={'100%'} style={{ marginTop: '-105px', zIndex: 0 }} />

      <SummitTimer />

      {game.attackAnimations.map(attack => (
        <AttackAnimation key={attack.id} attack={attack} onEnd={removeAttackAnimation} />
      ))}
    </Box>
  );
}

export default Summit;

const styles = {
  beastSummit: {
    height: 'fit-content',
    width: '350px',
    position: 'relative',
    boxSizing: 'border-box',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pt: 1,
    overflow: 'hidden',
    transition: '0.3s',
  },
  clock: {
    position: 'absolute',
    top: '200px',
    left: '50px',
    width: '100px',
    height: '50px',
  },
  healthText: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%)',
    textAlign: 'center',
    letterSpacing: '0.5px'
  }
}
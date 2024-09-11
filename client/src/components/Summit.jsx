import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import React, { useContext, useEffect } from 'react'
import summitImage from '../assets/images/summit.png'
import { GameContext } from '../contexts/gameContext'
import { fetchBeastImage, normaliseHealth } from '../helpers/beasts'
import { HealthBar } from '../helpers/styles'
import { fadeVariant } from '../helpers/variants'
import SummitReward from './SummitReward'
import AttackAnimation from './animations/AttackAnimation'

function Summit() {
  const game = useContext(GameContext)
  const { summitAnimations, summit, attackAnimations, ownedBeasts } = game.getState

  const controls = useAnimationControls()

  const removeAttackAnimation = (id) => {
    game.setState.attackAnimations((prevAnimations) => prevAnimations.filter((anim) => anim.id !== id));
  };

  const newSavageAnimation = async (beast) => {
    await controls.start({
      opacity: 0,
      transition: { duration: 1, type: 'just' }
    })

    game.setState.summit({ ...beast })
    game.setState.beastReward(0)

    await controls.start({
      opacity: 1,
      transition: { duration: 0.8, type: 'just' }
    })

  }

  useEffect(() => {
    if (summitAnimations.length > 0) {
      newSavageAnimation(summitAnimations[0])
      game.setState.summitAnimations(prev => prev.slice(1))
    }
  }, [summitAnimations])

  return (
    <Box sx={styles.beastSummit}>
      <motion.div
        style={styles.mainContainer}
        variants={fadeVariant}
        animate="enter"
        initial="intial"
        exit="exit"
      >
        <Box position={'relative'} width={'100%'} mb={2}>
          <HealthBar variant="determinate" value={normaliseHealth(summit.currentHealth, summit.health)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white' }}>
              {summit.currentHealth}
            </Typography>
          </Box>
        </Box>

        <motion.div animate={controls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
          <Typography variant='h3' sx={{ lineHeight: '14px', textAlign: 'center' }}>
            {summit.prefix} {summit.suffix} {summit.name}
          </Typography>
          <Typography variant='h4'>
            lvl {summit.level}
          </Typography>
        </motion.div>

        <motion.img
          key={summit.id}
          style={{ zIndex: 1, height: '180px' }}
          src={fetchBeastImage(summit.name)} alt=''
          animate={controls}
        />

        <img src={summitImage} alt='' width={'100%'} style={{ marginTop: '-105px', zIndex: 0 }} />

        <SummitReward />

        {attackAnimations.map(attackingBeast => (
          <AttackAnimation key={attackingBeast.id} attackingBeast={attackingBeast} onEnd={removeAttackAnimation} />
        ))}
      </motion.div>

    </Box>
  );
}

export default Summit;

const styles = {
  beastSummit: {
    height: 'calc(100% - 270px)',
    width: '350px',
    boxSizing: 'border-box',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    pt: 2,
    overflow: 'hidden',
    transition: '0.3s',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
    height: '380px',
    justifyContent: 'space-between',
    position: 'relative',
    opacity: 0
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
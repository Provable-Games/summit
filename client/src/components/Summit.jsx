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
import { useStarkProfile } from '@starknet-react/core'
import heart from '../assets/images/heart.png';

function Summit() {
  const game = useContext(GameContext)
  const { summitAnimations, summit, attackAnimations, attackInProgress } = game.getState

  const controls = useAnimationControls()
  const { data: profile } = useStarkProfile({ address: summit.owner });
  const extraLives = summit.extra_lives ?? 0

  const removeAttackAnimation = (id) => {
    game.setState.attackAnimations((prevAnimations) => prevAnimations.filter((anim) => anim.id !== id));
  };

  const newSavageAnimation = async (beast) => {
    await controls.start({
      opacity: 0,
      transition: { duration: 1, type: 'just' }
    })

    game.setState.summit({ ...beast })

    await controls.start({
      opacity: 1,
      transition: { duration: 0.8, type: 'just' }
    })

  }

  useEffect(() => {
    if (attackAnimations.length > 0 || attackInProgress) {
      return;
    }

    if (summitAnimations.length > 0) {
      let animation = summitAnimations[0]

      if (animation.type === 'capture') {
        newSavageAnimation(animation.beast)
      } else if (animation.type === 'update') {
        game.setState.summit(prev => ({ ...prev, ...animation.updates }))
      }

      game.setState.summitAnimations(prev => prev.slice(1))
    }
  }, [summitAnimations, attackAnimations, attackInProgress])

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
          <HealthBar variant="determinate" value={normaliseHealth(summit.current_health, summit.health + (summit.bonus_health || 0))} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white' }}>
              {summit.current_health}
            </Typography>
          </Box>

          {extraLives > 0 && <Box sx={styles.extraLife}>
            {extraLives > 1 && <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px', textShadow: '0 0 3px #FFD700' }}>
              {extraLives}
            </Typography>}

            <img src={heart} alt='' height={'12px'} />
          </Box>}
        </Box>

        <motion.div animate={controls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
          <Typography variant='h3' sx={{ lineHeight: '12px', textAlign: 'center' }}>
            "{summit.prefix} {summit.suffix}" {summit.name}
          </Typography>

          <Typography variant='h6' sx={{ textAlign: 'center', letterSpacing: '0.5px' }}>
            Owned by {profile?.name?.replace('.stark', '') || 'Unknown'}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Typography variant='h5' sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)', lineHeight: '16px' }}>
                Pwr
              </Typography>

              <Typography variant='h5' sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)', lineHeight: '16px' }}>
                {(6 - summit.tier) * summit.level}
              </Typography>
            </Box>

          </Box>
        </motion.div>

        <motion.img
          key={summit.id}
          style={{ zIndex: 1, height: '200px', marginTop: '-10px' }}
          src={fetchBeastImage(summit.name)} alt=''
          animate={controls}
        />

        <img src={summitImage} alt='' width={'100%'} style={{ marginTop: '-105px', zIndex: 0 }} />

        <SummitReward />

        {attackAnimations.map((attackingBeast, i) => (
          <AttackAnimation key={attackingBeast.id} attackingBeast={attackingBeast} onEnd={removeAttackAnimation} delay={i} />
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
    maxWidth: '95vw',
    boxSizing: 'border-box',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  extraLife: {
    position: 'absolute',
    top: 0,
    right: '6px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
}
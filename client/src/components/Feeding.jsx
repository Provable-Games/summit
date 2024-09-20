import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import React, { useContext } from 'react'
import feedingImage from '../assets/images/feeding.png'
import frontfence from '../assets/images/frontfence.png'
import { GameContext } from '../contexts/gameContext'
import { fetchBeastImage, normaliseHealth } from '../helpers/beasts'
import { HealthBar } from '../helpers/styles'
import { fadeVariant } from '../helpers/variants'
import FeedAdventurerAnimation from './animations/FeedAdventurerAnimation'

function Feeding() {
  const game = useContext(GameContext)
  const { selectedBeasts, collection, feedAnimations } = game.getState
  const beast = collection.find(beast => beast.id === selectedBeasts[0])
  const controls = useAnimationControls()

  const removeFeedAnimation = (id) => {
    game.setState.feedAnimations((prevAnimations) => prevAnimations.filter((anim) => anim.id !== id));
  };

  return (
    <Box sx={styles.feedingGround}>

      <motion.div
        style={styles.mainContainer}
        variants={fadeVariant}
        animate="enter"
        initial="intial"
        exit="exit"
      >
        <motion.div animate={controls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant='h3' sx={{ lineHeight: '14px', textAlign: 'center' }}>
            {beast.prefix} {beast.suffix} {beast.name}
          </Typography>
          <Typography variant='h4'>
            lvl {beast.level}
          </Typography>

          <motion.img
            key={beast.id}
            style={{ zIndex: 1, height: '180px', marginTop: '10px' }}
            src={fetchBeastImage(beast.name)} alt=''
            animate={controls}
          />
        </motion.div>

        <img src={feedingImage} alt='' width={'100%'} style={{ position: 'absolute', bottom: '25px', zIndex: 0 }} />
        <img src={frontfence} alt='' width={'100%'} style={{ position: 'absolute', bottom: '110px', zIndex: 4 }} />

        <Box position={'relative'} width={'80%'}>
          <HealthBar variant="determinate" value={normaliseHealth(beast.currentHealth, beast.health)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white' }}>
              {beast.currentHealth}
            </Typography>
          </Box>
        </Box>

        {feedAnimations.map((adventurer, i) => (
          <FeedAdventurerAnimation key={adventurer.id} adventurer={adventurer} onEnd={removeFeedAnimation} delay={i} />
        ))}
      </motion.div>

    </Box >
  );
}

export default Feeding;

const styles = {
  feedingGround: {
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
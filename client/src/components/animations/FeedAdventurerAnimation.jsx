import { Typography } from '@mui/material';
import { motion, useAnimationControls } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import adventurerImage from '../../assets/images/adventurer.png';
function FeedAdventurerAnimation(props) {
  const { adventurer, onEnd, delay } = props

  const controls = useAnimationControls()
  const textControls = useAnimationControls()

  const ref = useRef()
  const textRef = useRef()

  const [health] = useState(1)

  useEffect(() => {
    feedAnimation()
  }, [])

  const feedAnimation = async () => {
    await controls.start({
      opacity: 1,
      transition: { delay: delay * 0.2 }
    })

    await controls.start({
      y: (window.innerHeight - 270) * 0.5,
      transition: { type: 'just' }
    })

    ref.current.style.opacity = 1
    textRef.current.style.opacity = 1


    await textControls.start({
      y: -30,
      transition: { type: 'just', duration: 0.5 }
    })

    ref.current.style.opacity = 0

    await textControls.start({
      opacity: 0,
      transition: { duration: 0.8 }
    })

    await controls.start({
      opacity: 0
    })

    onEnd(adventurer.id)
  }

  return <>
    <motion.div style={{ ...styles.damageText }} ref={textRef} animate={textControls}>
      <Typography variant='h2' color={'darkgreen'}>
        +{health} health
      </Typography>
    </motion.div>

    <motion.div
      ref={ref}
      style={{ ...styles.explosion }}
    >
      <img alt='' src={health} />
    </motion.div>

    <motion.div
      style={{ ...styles.container }}
      key={adventurer.id}
      animate={controls}
    >
      <img alt='' src={adventurerImage} height={'80px'} />
    </motion.div>
  </>
}

export default FeedAdventurerAnimation;

const styles = {
  container: {
    position: 'fixed',
    zIndex: 3,
    opacity: 0,
    top: 0
  },
  explosion: {
    opacity: 0,
    width: '100px',
    position: 'fixed',
    left: '50%',
    transform: 'translate(-50%)',
    bottom: '520px',
    zIndex: 98
  },
  damageText: {
    position: 'absolute',
    zIndex: 100,
    right: 0,
    top: '50px',
    opacity: 0
  }
}
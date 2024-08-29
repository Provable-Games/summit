import React from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { fetchBeastImage } from '../../helpers/beasts';
import { useEffect } from 'react';
import explosion from '../../assets/images/explosion.png'
import { useRef } from 'react';
import { useState } from 'react';
import { useContext } from 'react';
import { GameContext } from '../../contexts/gameContext';
import { Typography } from '@mui/material';

function AttackAnimation(props) {
  const game = useContext(GameContext)
  const { attack, onEnd } = props
  const controls = useAnimationControls()
  const textControls = useAnimationControls()

  const ref = useRef()
  const textRef = useRef()

  const [randomOffSet] = useState(Math.floor(Math.random() * 301) - 100)

  let yOffSet = 310 + Math.abs(randomOffSet) / 5
  let strOffSet = randomOffSet < 0 ? `calc(50% - ${randomOffSet * -1}px)` : `calc(50% + ${randomOffSet}px)`

  useEffect(() => {
    attackAnimation()
  }, [])

  const attackAnimation = async () => {
    await controls.start({
      opacity: 1
    })

    await controls.start({
      x: randomOffSet * -1,
      y: -200 + Math.abs(randomOffSet) / 5,
      transition: { type: 'just' }
    })

    ref.current.style.opacity = 1
    textRef.current.style.opacity = 1

    game.setSummit(prev => ({ ...prev, health: Math.max(0, prev.health - attack.damage) }))

    controls.start({
      opacity: 0
    })

    await textControls.start({
      y: -30,
      transition: { type: 'just', duration: 0.5 }
    })

    ref.current.style.opacity = 0

    await textControls.start({
      opacity: 0,
      transition: { duration: 0.8 }
    })

    onEnd(attack.id)
  }

  return <>
    <motion.div style={{ ...styles.damageText }} ref={textRef} animate={textControls}>
      <Typography variant='h1'>
        -{attack.damage}
      </Typography>
    </motion.div>

    <motion.div
      ref={ref}
      style={{ ...styles.explosion }}
    >
      <img alt='' src={explosion} />
    </motion.div>

    <motion.div
      style={{ ...styles.container, left: strOffSet, bottom: `${yOffSet}px` }}
      key={attack.id}
      animate={controls}
    >

      <img alt='' src={fetchBeastImage(attack.beast)} height={'80px'} />

    </motion.div>
  </>
}

export default AttackAnimation;

const styles = {
  container: {
    position: 'fixed',
    zIndex: 99,
    opacity: 0,
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
    top: '150px',
    opacity: 0
  }
}
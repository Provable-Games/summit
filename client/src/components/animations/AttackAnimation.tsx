import React from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { fetchBeastImage } from '../../utils/beasts';
import { useEffect } from 'react';
import explosion from '../../assets/images/explosion.png'
import { useRef } from 'react';
import { useState } from 'react';
import { useContext } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Typography } from '@mui/material';

function AttackAnimation(props) {
  const { attackingBeast, onEnd, delay } = props

  const game = useContext(GameContext)
  const { summit } = game.getState

  const controls = useAnimationControls()
  const textControls = useAnimationControls()

  const ref = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const [randomOffSet] = useState(Math.floor(Math.random() * 201) - 100)

  let strOffSet = randomOffSet < 0 ? `calc(50% - ${randomOffSet * -1}px)` : `calc(50% + ${randomOffSet}px)`

  const [damage] = useState(attackingBeast.capture ? summit.current_health : attackingBeast.damage)

  useEffect(() => {
    attackAnimation()
    game.setState.attackInProgress(false)
  }, [])

  const attackAnimation = async () => {
    await controls.start({
      opacity: 1,
      transition: { delay: delay * 0.25 }
    })

    await controls.start({
      x: (randomOffSet + 20) * -1,
      y: -((window.innerHeight - 260) * 0.5 - 90),
      transition: { type: 'tween' as const }
    })

    if (ref.current) ref.current.style.opacity = '1'
    if (textRef.current) textRef.current.style.opacity = '1'

    game.setState.summit(prev => ({ ...prev, current_health: Math.max(0, prev.current_health - damage) }))

    controls.start({
      opacity: 0
    })

    await textControls.start({
      y: -30,
      transition: { type: 'tween' as const, duration: 0.5 }
    })

    if (ref.current) ref.current.style.opacity = '0'

    await textControls.start({
      opacity: 0,
      transition: { duration: 0.8 }
    })

    let updatedBeastObject = {}

    if (!attackingBeast.capture && summit.current_health > 0) {
      let newBonusXp = attackingBeast.bonus_xp + (10 + attackingBeast.attack_streak)
      let totalXp = Math.pow(attackingBeast.level, 2) + newBonusXp
      let newLevel = Math.floor(Math.sqrt(totalXp))

      updatedBeastObject = {
        level: newLevel,
        totalXp: totalXp,
        current_health: 0,
        deadAt: Date.now(),
        attack_streak: Math.min(attackingBeast.attack_streak + 1, 10),
        bonus_xp: newBonusXp,
      }
    } else if (summit.current_health === 0) {
      updatedBeastObject = {
        totalXp: Math.pow(attackingBeast.level, 2) + attackingBeast.bonus_xp
      }
    }

    game.setState.beasts(prev => prev.map(beast => ({
      ...beast,
      ...(beast.id === attackingBeast.id ? updatedBeastObject : {})
    })))

    onEnd(attackingBeast.id)
  }

  return <>
    <motion.div style={{ ...styles.damageText }} ref={textRef} animate={textControls}>
      <Typography variant='h1'>
        -{damage}
      </Typography>
    </motion.div>

    <motion.div
      ref={ref}
      style={{ ...styles.explosion, top: ((window.innerHeight - 260) * 0.5 - 90) }}
    >
      <img alt='' src={explosion} />
    </motion.div>

    <motion.div
      style={{ ...styles.container, left: strOffSet, bottom: `290px` }}
      key={attackingBeast.id}
      animate={controls}
    >

      <img alt='' src={fetchBeastImage(attackingBeast.name)} height={'100px'} />

    </motion.div>
  </>
}

export default AttackAnimation;

const styles = {
  container: {
    position: 'fixed' as const,
    zIndex: 99,
    opacity: 0,
  },
  explosion: {
    opacity: 0,
    width: '100px',
    position: 'fixed' as const,
    left: '50%',
    transform: 'translate(-60%)',
    zIndex: 98
  },
  damageText: {
    position: 'absolute' as const,
    zIndex: 100,
    right: 0,
    top: '150px',
    opacity: 0
  }
}
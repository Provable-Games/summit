import { Typography } from '@mui/material';
import { motion, useAnimationControls } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import adventurerImage from '../../assets/images/adventurer.png';
import { useContext } from 'react';
import { useGameStore } from '@/stores/gameStore';

interface FeedAdventurerAnimationProps {
  adventurer: {
    id: string;
    level: number;
  };
  onEnd: (id: string) => void;
  delay: number;
}

function FeedAdventurerAnimation(props: FeedAdventurerAnimationProps) {
  const { adventurer, onEnd, delay } = props

  const game = useContext(GameContext)
  const { selectedBeasts } = game.getState

  const controls = useAnimationControls()
  const textControls = useAnimationControls()

  const ref = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const [health] = useState(adventurer.level)

  useEffect(() => {
    feedAnimation()
    game.setState.feedInProgress(false)
  }, [])

  const feedAnimation = async () => {
    await controls.start({
      opacity: 1,
      transition: { delay: delay * 0.2 }
    })

    await controls.start({
      y: (window.innerHeight - 270) * 0.5,
      transition: { type: 'tween' as const }
    })

    if (ref.current) {
      ref.current.style.opacity = '1'
    }
    if (textRef.current) {
      textRef.current.style.opacity = '1'
    }

    game.setState.beasts(prev => prev.map(beast => ({
      ...beast,
      current_health: beast.id === selectedBeasts[0] ? beast.current_health + health : beast.current_health
    })))

    await textControls.start({
      y: -30,
      transition: { type: 'tween' as const, duration: 0.5 }
    })

    if (ref.current) {
      ref.current.style.opacity = '0'
    }

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
      <img alt='' src={adventurerImage} />
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
    position: 'fixed' as const,
    zIndex: 3,
    opacity: 0,
    top: 0
  },
  explosion: {
    opacity: 0,
    width: '100px',
    position: 'fixed' as const,
    left: '50%',
    transform: 'translate(-50%)',
    bottom: '520px',
    zIndex: 98
  },
  damageText: {
    position: 'absolute' as const,
    zIndex: 100,
    right: 0,
    top: '50px',
    opacity: 0
  }
}
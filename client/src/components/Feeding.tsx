import { useGameTokens } from '@/dojo/useGameTokens'
import { useGameStore } from '@/stores/gameStore'
import { useGameDirector } from '@/contexts/GameDirector'
import { Beast } from '@/types/game'
import { Box, Typography } from '@mui/material'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { fetchBeastSummitImage, normaliseHealth } from '../utils/beasts'
import { gameColors } from '../utils/themes'
import { fadeVariant } from '../utils/variants'

interface FloatingHealth {
  id: string;
  value: number;
}

interface AnimatingAdventurer {
  id: number;
  level: number;
  healthGain: number;
  image: string;
  delay: number;
}

function Feeding() {
  const { getKilledBy } = useGameTokens()
  const { setPauseUpdates } = useGameDirector()
  const {
    selectedBeasts,
    collection,
    setKilledByAdventurers,
    feedingInProgress,
    killedByAdventurers,
    selectedAdventurers,
    adventurerCollection,
    setAdventurerCollection,
    setSelectedAdventurers,
    setFeedingInProgress
  } = useGameStore()

  const [animatingAdventurers, setAnimatingAdventurers] = useState<AnimatingAdventurer[]>([])
  const [floatingHealthTexts, setFloatingHealthTexts] = useState<FloatingHealth[]>([])
  const [animatedHealth, setAnimatedHealth] = useState(0)
  const [animatedBonusHealth, setAnimatedBonusHealth] = useState(0)

  const beast = collection.find((beast: Beast) => beast.token_id === selectedBeasts[0]?.token_id)
  if (!beast) return null

  const name = beast.prefix ? `"${beast.prefix} ${beast.suffix}" ${beast.name}` : beast.name

  // Fetch killed by adventurers and initialize health
  useEffect(() => {
    const fetchKilledBy = async () => {
      const killedBy = await getKilledBy(beast)
      setKilledByAdventurers(killedBy)
    }
    fetchKilledBy()
    setAnimatedHealth(beast.current_health)
    setAnimatedBonusHealth(beast.bonus_health)
  }, [beast.token_id])

  const handleAnimationComplete = useCallback(() => {
    // Remove selected adventurers from collection
    setAdventurerCollection(
      adventurerCollection.filter(
        adventurer => !selectedAdventurers.some(selected => selected.id === adventurer.id)
      )
    )
    setSelectedAdventurers([])
    setFeedingInProgress(false)
    setPauseUpdates(false)
  }, [selectedAdventurers])

  // Handle feeding animation when feedingInProgress becomes true
  useEffect(() => {
    if (!feedingInProgress || selectedAdventurers.length === 0) return

    // Create animating adventurers with staggered delays
    const adventurersToAnimate = selectedAdventurers.map((adventurer, index) => ({
      id: adventurer.id,
      level: adventurer.level,
      healthGain: killedByAdventurers.includes(adventurer.id)
        ? adventurer.level * 10
        : adventurer.level,
      image: `/images/adventurers/adventurer_${Math.floor(Math.random() * 7) + 1}.png`,
      delay: index * 0.5 // 0.5 second delay between each
    }))

    setAnimatingAdventurers(adventurersToAnimate)

    // Schedule health animations for each adventurer
    adventurersToAnimate.forEach((adventurer) => {
      const landingTime = adventurer.delay + 1 // delay + fall duration

      setTimeout(() => {
        // Show floating health text
        const textId = `health-${adventurer.id}-${Date.now()}`
        setFloatingHealthTexts(prev => [...prev, { id: textId, value: adventurer.healthGain }])

        // Update health
        setAnimatedHealth(prev => {
          const newHealth = prev + adventurer.healthGain
          const maxHealth = beast.health

          if (newHealth > maxHealth) {
            const overflow = newHealth - maxHealth
            setAnimatedBonusHealth(prevBonus => Math.min(prevBonus + overflow, 1023))
            return maxHealth
          }
          return newHealth
        })

        // Remove floating text after animation
        setTimeout(() => {
          setFloatingHealthTexts(prev => prev.filter(text => text.id !== textId))
        }, 1000)
      }, landingTime * 1000)
    })

    // Calculate total animation time and cleanup
    const totalTime = adventurersToAnimate.length * 0.5

    setTimeout(() => {
      handleAnimationComplete()
    }, totalTime * 1000)

  }, [feedingInProgress, selectedAdventurers])

  return (
    <Box sx={styles.feedingContainer}>
      {/* Animating adventurers */}
      <AnimatePresence>
        {animatingAdventurers.map((adventurer) => (
          <motion.div
            key={adventurer.id}
            style={{
              position: 'absolute',
              left: `calc(50% - 100px)`,
              width: '200px',
              height: '200px',
              zIndex: 1000,
            }}
            variants={adventurerVariants}
            initial="hidden"
            animate="animate"
            exit="exit"
            custom={{ delay: adventurer.delay }}
          >
            <img
              src={adventurer.image}
              alt="Falling adventurer"
              style={{
                width: '100%',
                objectFit: 'contain',
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        style={styles.mainContainer}
        variants={fadeVariant}
        animate="enter"
        initial="initial"
        exit="exit"
      >
        {/* Stats and Health Section */}
        <Box sx={styles.statsSection}>
          <Box sx={styles.nameSection}>
            <Typography sx={styles.beastName}>{name}</Typography>
          </Box>

          {/* Health Bars */}
          <Box sx={styles.healthContainer}>
            <Box sx={styles.healthBar}>
              <motion.div
                style={styles.healthFill}
                animate={{ width: `${normaliseHealth(animatedHealth, beast.health)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <Typography sx={styles.healthText}>
                {Math.round(animatedHealth)} / {beast.health} HP
              </Typography>
            </Box>

            <Box sx={styles.bonusHealthBar}>
              <motion.div
                style={styles.bonusHealthFill}
                animate={{ width: `${normaliseHealth(animatedBonusHealth, 1023)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <Typography sx={styles.bonusHealthText}>
                Bonus: {Math.round(animatedBonusHealth)} / 1023 HP
              </Typography>
            </Box>
          </Box>

          {/* Stats */}
          <Box sx={styles.statsRow}>
            <Box sx={styles.statBox}>
              <Typography sx={styles.statLabel}>LEVEL</Typography>
              <Typography sx={styles.statValue}>{beast.level}</Typography>
            </Box>
            <Box sx={styles.statBox}>
              <Typography sx={styles.statLabel}>POWER</Typography>
              <Typography sx={styles.powerValue}>{beast.power}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Beast Image */}
        <Box sx={styles.beastImageContainer}>
          <img
            style={styles.beastImage}
            src={fetchBeastSummitImage(beast)}
            alt={name}
          />

          {/* Floating health texts */}
          <AnimatePresence>
            {floatingHealthTexts.map((text) => (
              <motion.div
                key={text.id}
                style={{
                  position: 'absolute',
                  left: '60%',
                  top: '50%',
                  pointerEvents: 'none',
                  zIndex: 1001,
                }}
                variants={floatingTextVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Typography
                  sx={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: gameColors.brightGreen,
                    textShadow: `
                      0 2px 4px rgba(0, 0, 0, 0.8),
                      0 0 12px ${gameColors.brightGreen}60
                    `,
                  }}
                >
                  +{text.value}
                </Typography>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </motion.div>
    </Box>
  )
}

export default Feeding

const adventurerVariants: Variants = {
  hidden: {
    y: window.innerHeight * 0.3 * -1,
    opacity: 0,
  },
  animate: (custom: { delay: number }) => ({
    y: [null, null, window.innerHeight * 0.16, window.innerHeight * 0.16, window.innerHeight * 0.16],
    opacity: [0, 1, 1, 1, 0],
    transition: {
      delay: custom.delay,
      times: [0, 0.1, 0.6, 0.9, 1], // fade in 10%, fall for 50%, land for 17%, fade for 33%
      duration: 2,
    }
  }),
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

const floatingTextVariants: Variants = {
  hidden: {
    y: 0,
    opacity: 0,
    scale: 0.8
  },
  visible: {
    y: -50,
    opacity: 1,
    scale: 1.2,
    transition: {
      duration: 1,
      ease: "easeOut"
    }
  },
  exit: {
    y: -80,
    opacity: 0,
    scale: 1,
    transition: {
      duration: 0.5
    }
  }
}

const styles = {
  feedingContainer: {
    height: 'calc(100% - 270px)',
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative' as const,
    opacity: 0
  },
  nameSection: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  beastName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffedbb',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '4px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
  },
  beastImageContainer: {
    position: 'relative',
    width: '300px',
    height: '300px',
    maxHeight: '35dvh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beastImage: {
    height: '100%',
    maxWidth: '100%',
    transition: 'all 0.3s ease',
    zIndex: 1,
  },
  statsSection: {
    width: '100%',
    maxWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
  },
  statsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    justifyContent: 'center',
  },
  statBox: {
    background: `${gameColors.darkGreen}70`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '6px 12px',
    minWidth: '60px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '9px',
    color: '#ffedbb',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
    lineHeight: '1',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  statValue: {
    fontSize: '14px',
    color: '#ffedbb',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  powerValue: {
    fontSize: '14px',
    color: '#FFD700',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: `
      0 1px 2px rgba(0, 0, 0, 0.8),
      0 0 8px rgba(255, 215, 0, 0.6)
    `,
  },
  healthContainer: {
    width: '100%',
    marginBottom: '4px',
  },
  healthBar: {
    position: 'relative',
    width: '100%',
    height: '16px',
    backgroundColor: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  healthFill: {
    height: '100%',
    backgroundColor: gameColors.brightGreen,
    borderRadius: '8px',
    transition: 'width 0.3s ease',
  },
  healthText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    letterSpacing: '0.5px',
    zIndex: 2,
  },
  bonusHealthBar: {
    position: 'relative',
    width: '100%',
    height: '12px',
    backgroundColor: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.orange}40`,
    borderRadius: '6px',
    overflow: 'hidden',
  },
  bonusHealthFill: {
    height: '100%',
    backgroundColor: gameColors.orange,
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  bonusHealthText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '10px',
    color: '#ffedbb',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    letterSpacing: '0.5px',
    zIndex: 2,
  },
}
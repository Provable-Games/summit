import { useGameStore } from '@/stores/gameStore'
import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import { useLottie } from 'lottie-react'
import { useEffect, useState } from 'react'
import strikeAnim from '../assets/animations/strike.json'
import heart from '../assets/images/heart.png'
import { fetchBeastSummitImage, normaliseHealth } from '../utils/beasts'
import { gameColors } from '../utils/themes'
import { lookupAddresses } from '@cartridge/controller'
import { useStarkProfile } from '@starknet-react/core'

function Summit() {
  const { collection, summit, attackInProgress, selectedBeasts, lastAttack, totalDamage } = useGameStore()
  const controls = useAnimationControls()
  const [cartridgeName, setCartridgeName] = useState<string | null>(null)

  // Use StarkProfile hook for StarkNet ID
  const { data: profile } = useStarkProfile({ address: summit?.owner as `0x${string}` })

  const strike = useLottie({
    animationData: strikeAnim,
    loop: false,
    autoplay: false,
    style: { position: 'absolute', width: '50%', height: '50%', top: '25%', right: '25%', zIndex: 10 },
    onComplete: () => {
      strike.stop();
    }
  });

  useEffect(() => {
    if (lastAttack && lastAttack > 0) {
      strike.play();
    }
  }, [lastAttack]);

  useEffect(() => {
    // Fetch Cartridge name when summit changes
    const fetchCartridgeName = async () => {
      if (summit?.owner) {
        try {
          const addressMap = await lookupAddresses([summit.owner]);
          setCartridgeName(addressMap.get(summit.owner) || null);
        } catch (error) {
          setCartridgeName(null);
        }
      } else {
        setCartridgeName(null);
      }
    };

    fetchCartridgeName();
  }, [summit?.owner]);

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit.beast.token_id))
  const showAttack = !isSavage && !attackInProgress && selectedBeasts.length > 0 && totalDamage > 0
  const summitHealthRemaining = summit.beast.current_health + (summit.beast.extra_lives * (summit.beast.health + summit.beast.bonus_health))
  const name = summit.beast.prefix ? `"${summit.beast.prefix} ${summit.beast.suffix}" ${summit.beast.name}` : summit.beast.name

  const calculateExtraLifeLoss = () => {
    let loss = 0
    let damageRemaining = totalDamage

    if (damageRemaining < summit.beast.current_health) {
      return loss
    }

    loss = 1
    damageRemaining -= summit.beast.current_health

    loss += Math.floor(damageRemaining / (summit.beast.health + summit.beast.bonus_health))

    return Math.min(loss, summit.beast.extra_lives)
  }

  return (
    <Box sx={styles.summitContainer}>
      {/* Stats and Health Section */}
      <Box sx={styles.statsSection}>
        {/* Name and Owner */}
        <Box sx={styles.nameSection}>
          <Typography sx={styles.beastName}>
            {name}
          </Typography>
          <Typography sx={styles.ownerText}>
            Owned by {cartridgeName || profile?.name?.replace('.stark', '') || 'Unknown'}
          </Typography>
        </Box>

        {/* Health Bar */}
        <Box sx={styles.healthContainer}>
          <Box sx={styles.healthBar}>
            <Box sx={[styles.healthFill, {
              width: `${normaliseHealth(summit.beast.current_health, summit.beast.health + summit.beast.bonus_health)}%`
            }]} />

            <Typography sx={styles.healthText}>
              {summit.beast.current_health} / {summit.beast.health + summit.beast.bonus_health}
            </Typography>
            
            {/* Extra Lives Indicator */}
            {summit.beast.extra_lives > 0 && (
              <Box sx={styles.extraLivesContainer}>
                {summit.beast.extra_lives > 1 && (
                  <Typography sx={styles.extraLivesNumber}>
                    {summit.beast.extra_lives}
                  </Typography>
                )}
                <img src={heart} alt='Extra Life' style={styles.extraLivesHeart} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Stats Row */}
        <Box sx={styles.statsRow}>
          <Box sx={styles.statBox}>
            <Typography sx={styles.statLabel}>LEVEL</Typography>
            <Typography sx={styles.levelValue}>{summit.beast.level}</Typography>
          </Box>
          <Box sx={styles.statBox}>
            <Typography sx={styles.statLabel}>POWER</Typography>
            <Box sx={styles.powerValueContainer}>
              <Typography sx={styles.powerValue}>{summit.beast.power}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Beast Image */}
      <Box sx={styles.beastImageContainer}>
        <motion.img
          key={summit.beast.token_id}
          style={{ ...styles.beastImage, opacity: showAttack && totalDamage >= summitHealthRemaining ? 0.7 : showAttack ? 0.9 : 1 }}
          src={fetchBeastSummitImage(summit.beast)}
          alt=''
          animate={controls}
        />

        {/* Attack Effects */}
        {showAttack && (
          <>
            <Box sx={styles.damageIndicator}>
              <Typography variant='h3' sx={styles.damageText}>
                -{totalDamage}
              </Typography>
              <img src={'/images/sword.png'} alt='' height={'24px'} />
            </Box>

            <Box sx={styles.effectIcon}>
              {totalDamage < summitHealthRemaining
                ? <img src={'/images/explosion.png'} alt='' height={'120px'} style={{ opacity: 0.85 }} />
                : <img src={'/images/skull.png'} alt='' height={'100px'} style={{ opacity: 0.85 }} />
              }
            </Box>

            {calculateExtraLifeLoss() > 0 && (
              <Box sx={styles.heartLossIndicator}>
                <Typography sx={styles.heartLossText}>
                  -{calculateExtraLifeLoss()}
                </Typography>
                <img src={heart} alt='' height={'16px'} />
              </Box>
            )}
          </>
        )}

        {strike.View}
      </Box>
    </Box>
  );
}

export default Summit;

const styles = {
  summitContainer: {
    height: 'calc(100% - 270px)',
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  ownerText: {
    fontSize: '12px',
    color: '#ffedbbdd',
    letterSpacing: '0.5px',
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
    marginTop: '2px',
    justifyContent: 'center',
  },
  statBox: {
    background: `${gameColors.darkGreen}70`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '4px 12px',
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
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  levelValue: {
    fontSize: '14px',
    color: '#ffedbb',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  powerValueContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  powerValue: {
    fontSize: '14px',
    color: '#FFD700',
    fontWeight: 'bold',
    lineHeight: '1',
  },
  healthContainer: {
    width: '100%',
    marginBottom: '4px',
  },
  healthBar: {
    position: 'relative',
    width: '100%',
    height: '16px',
    backgroundColor: `${gameColors.darkGreen}90`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    overflow: 'hidden',
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
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    letterSpacing: '0.5px',
    zIndex: 2,
  },
  extraLivesContainer: {
    position: 'absolute',
    top: '50%',
    right: '4px',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    zIndex: 3,
  },
  extraLivesNumber: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    letterSpacing: '0.5px',
  },
  extraLivesHeart: {
    width: '14px',
    height: '14px',
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))',
  },
  damageIndicator: {
    position: 'absolute',
    top: '20px',
    right: '-40px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 10,
  },
  damageText: {
    color: gameColors.yellow,
    fontWeight: 'bold',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  effectIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 5,
  },
  heartLossIndicator: {
    position: 'absolute',
    top: '-30px',
    right: '-20px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    zIndex: 10,
  },
  heartLossText: {
    fontSize: '18px',
    color: gameColors.yellow,
    fontWeight: 'bold',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
}
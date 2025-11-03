import { useGameStore } from '@/stores/gameStore'
import CasinoIcon from '@mui/icons-material/Casino'
import EnergyIcon from '@mui/icons-material/ElectricBolt'
import StarIcon from '@mui/icons-material/Star'
import { Box, LinearProgress, Tooltip, Typography } from '@mui/material'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useLottie } from 'lottie-react'
import { useEffect, useState } from 'react'
import strikeAnim from '../assets/animations/strike.json'
import heart from '../assets/images/heart.png'
import { lookupAddressName } from '../utils/addressNameCache'
import { fetchBeastSummitImage, normaliseHealth } from '../utils/beasts'
import { gameColors } from '../utils/themes'
import { useGameDirector } from '@/contexts/GameDirector'

function Summit() {
  const { collection, summit, attackInProgress, selectedBeasts, spectatorBattleEvents } = useGameStore()
  const { pauseUpdates } = useGameDirector()

  const controls = useAnimationControls()
  const [cartridgeName, setCartridgeName] = useState<string | null>(null)
  const [spectatorDamage, setSpectatorDamage] = useState<Array<{ id: string; damage: number; attackerName: string }>>([])
  const [processedEventIds, setProcessedEventIds] = useState<Set<string>>(new Set())

  const originalExperience = Math.pow(summit.beast.level, 2);
  const currentExperience = originalExperience + summit.beast.bonus_xp;
  const nextLevelExperience = Math.pow(summit.beast.current_level + 1, 2);

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
    const fetchCartridgeName = async () => {
      if (summit?.owner) {
        try {
          const name = await lookupAddressName(summit.owner);
          setCartridgeName(name);
        } catch (error) {
          setCartridgeName(null);
        }
      } else {
        setCartridgeName(null);
      }
    };

    fetchCartridgeName();
  }, [summit?.owner]);

  // Process incoming battle events for spectators - rapid fire style!
  useEffect(() => {
    if (!summit || spectatorBattleEvents.length === 0 || pauseUpdates) return;

    spectatorBattleEvents.forEach(async (event, index) => {
      // Only show events for the current summit beast
      if (event.defending_beast_token_id !== summit.beast.token_id) return;

      // Create unique ID for this event
      const eventId = `${event.attacking_beast_token_id}-${Date.now()}`;

      // Skip if already processed
      if (processedEventIds.has(eventId)) return;

      // Calculate total damage
      const totalDamage =
        (event.attack_damage * event.attack_count) +
        (event.critical_attack_damage * event.critical_attack_count);

      // Wait for attacker name lookup
      let attackerName = 'Unknown';
      if (event.attacking_beast_owner) {
        try {
          attackerName = await lookupAddressName(event.attacking_beast_owner);
        } catch (error) {
          attackerName = 'Unknown';
        }
      }

      setTimeout(() => {
        setSpectatorDamage(prev => [...prev, { id: eventId, damage: totalDamage, attackerName }]);
        setProcessedEventIds(prev => new Set([...prev, eventId]));

        setTimeout(() => {
          setSpectatorDamage(prev => prev.filter(d => d.id !== eventId));
          setProcessedEventIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(eventId);
            return newSet;
          });
        }, 1200);
      }, index * 120);
    });
  }, [spectatorBattleEvents, summit?.beast.token_id]);

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit.beast.token_id))
  const showAttack = !isSavage && !attackInProgress && selectedBeasts.length > 0
  const name = summit.beast.prefix ? `"${summit.beast.prefix} ${summit.beast.suffix}" ${summit.beast.name}` : summit.beast.name

  return (
    <Box sx={styles.summitContainer}>
      {/* Stats and Health Section */}
      <Box sx={styles.statsSection}>
        {/* Name and Owner */}
        <Box sx={styles.nameSection}>
          <Box sx={styles.nameRow}>
            <Typography sx={styles.beastName}>
              {name}
            </Typography>
          </Box>
          <Typography sx={styles.ownerText}>
            Owned by {cartridgeName || 'Unknown'}
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

          {/* XP Progress Bar */}
          <Box sx={{ position: 'relative' }}>
            <LinearProgress
              variant="determinate"
              value={normaliseHealth(currentExperience - originalExperience, nextLevelExperience - originalExperience)}
              sx={styles.xpBar}
            />
            <Typography sx={styles.xpText}>XP</Typography>
          </Box>
        </Box>

        {/* Stats Row */}
        <Box sx={styles.statsRow}>
          <Box sx={styles.statBox}>
            <Typography sx={styles.statLabel}>LEVEL</Typography>
            <Typography sx={styles.levelValue}>{summit.beast.current_level}</Typography>
          </Box>
          <Box sx={styles.statBox}>
            <Typography sx={styles.statLabel}>POWER</Typography>
            <Box sx={styles.powerValueContainer}>
              <Typography sx={styles.powerValue}>{summit.beast.power}</Typography>
            </Box>
          </Box>
          {(summit.beast.stats.spirit || summit.beast.stats.luck || summit.beast.stats.specials) ? (<Box sx={[styles.statBox, { minWidth: '0px' }]}>
            {/* Stats Upgrades Badge */}
            <Box sx={styles.statsBadge}>
              {summit.beast.stats.luck && (
                <Tooltip title={<Box sx={styles.tooltipContent}>This beast has 50% crit chance</Box>} placement="bottom">
                  <Box sx={{ color: '#ff69b4', display: 'flex' }}>
                    <CasinoIcon sx={{ fontSize: '20px' }} />
                  </Box>
                </Tooltip>
              )}
              {summit.beast.stats.spirit && (
                <Tooltip title={<Box sx={styles.tooltipContent}>This beast revives 50% faster</Box>} placement="bottom">
                  <Box sx={{ color: '#00ffff', display: 'flex' }}>
                    <EnergyIcon sx={{ fontSize: '20px' }} />
                  </Box>
                </Tooltip>
              )}
              {summit.beast.stats.specials && (
                <Tooltip title={<Box sx={styles.tooltipContent}>This beast has name match bonus</Box>} placement="bottom">
                  <Box sx={{ color: '#ffd700', display: 'flex' }}>
                    <StarIcon sx={{ fontSize: '20px' }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>
          ) : null}
        </Box>
      </Box>

      {/* Beast Image */}
      <Box sx={styles.beastImageContainer}>
        {/* Orbiting Light Behind Image - for animated beasts */}
        {summit.beast.animated ?
          <Box
            component={motion.div}
            sx={styles.orbitingLightBehind}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Box sx={styles.glowingOrb} />
          </Box>
          : null}

        <motion.img
          key={summit.beast.token_id}
          style={{ ...styles.beastImage, opacity: showAttack ? 0.9 : 1 }}
          src={fetchBeastSummitImage(summit.beast)}
          alt=''
          animate={controls}
        />

        {/* Orbiting Light In Front of Image - for animated beasts */}
        {summit.beast.animated ?
          <Box
            component={motion.div}
            sx={styles.orbitingLightFront}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Box sx={styles.glowingOrb} />
          </Box>
          : null}

        {/* Attack Effects */}
        {showAttack && (
          <>
            {/* Estimated Damage Display */}
            <Box sx={styles.estimatedDamageContainer}>
              <Box sx={styles.damageBox}>
                <Typography sx={styles.damageLabel}>ESTIMATED DAMAGE</Typography>
                <Box sx={styles.damageValueContainer}>
                  <Box sx={styles.swordIcon}>
                    <img src={'/images/sword.png'} alt='' height={'24px'} />
                  </Box>
                  <Typography sx={styles.damageValue}>
                    {selectedBeasts.reduce((acc, beast) => acc + beast.combat?.estimatedDamage || 0, 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={styles.effectIcon}>
              <img src={'/images/explosion.png'} alt='' height={'120px'} style={{ opacity: 0.85 }} />
            </Box>
          </>
        )}

        {strike.View}
      </Box>

      {/* Spectator damage numbers - rapid fire style! */}
      <AnimatePresence>
        {spectatorDamage.map((damage) => {
          // Add random offset for variety
          const randomX = (Math.random() - 0.5) * 260; // -130 to 130px

          return (
            <motion.div
              key={damage.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, x: randomX }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -30, -70, -100],
                scale: [0.5, 1.3, 1, 0.8],
              }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                times: [0, 0.15, 0.7, 1]
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              <Box sx={styles.spectatorDamageContainer}>
                <Typography sx={styles.spectatorDamageValue}>
                  -{damage.damage}
                </Typography>
                <Typography sx={styles.spectatorAttackerName}>
                  {damage.attackerName}
                </Typography>
              </Box>
            </motion.div>
          );
        })}
      </AnimatePresence>
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
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  statsBadge: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px'
  },
  beastName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffedbb',
    textTransform: 'uppercase',
    letterSpacing: '1px',
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
    zIndex: 2,
  },
  orbitingLightBehind: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 1,
    clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
  },
  orbitingLightFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 3,
    clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
  },
  glowingOrb: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #00ff88 0%, #00cc66 40%, transparent 70%)',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    animation: 'pulse 1s ease-in-out infinite',
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
    padding: '4px 8px',
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
  typeValue: {
    fontSize: '12px',
    color: '#FFF',
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
  xpBar: {
    height: '6px',
    borderRadius: '2px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: '4px',
    position: 'relative',
    overflow: 'hidden',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#9C27B0',
      boxShadow: '0 0 8px rgba(156, 39, 176, 0.5)',
    },
  },
  xpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '8px',
    color: '#ffedbb',
    fontWeight: 'bold',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    letterSpacing: '0.5px',
    zIndex: 2,
    lineHeight: '1',
  },
  estimatedDamageContainer: {
    position: 'absolute',
    left: 'calc(50% + 110px)',
    top: '30px',
    zIndex: 10,
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
  },
  damageBox: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen}dd 0%, ${gameColors.mediumGreen}dd 100%)`,
    border: `2px solid ${gameColors.accentGreen}`,
    borderRadius: '12px',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
  },
  damageLabel: {
    fontSize: '10px',
    color: gameColors.brightGreen,
    fontWeight: 'bold',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px ${gameColors.accentGreen}40`,
    lineHeight: '1',
  },
  damageValueContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  swordIcon: {
    display: 'flex',
    alignItems: 'center',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))',
  },
  damageValue: {
    fontSize: '24px',
    color: '#FFD700',
    fontWeight: 'bold',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 10px rgba(255, 215, 0, 0.5),
      0 0 20px rgba(255, 215, 0, 0.3)
    `,
    lineHeight: '1',
    fontFamily: 'monospace',
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
  tooltipContent: {
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    padding: '6px 10px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}60`,
    color: gameColors.brightGreen,
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px ${gameColors.darkGreen}`,
    boxShadow: `
      inset 0 1px 0 ${gameColors.accentGreen}40,
      0 2px 4px rgba(0, 0, 0, 0.3)
    `,
  },
  spectatorDamageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  spectatorDamageValue: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: gameColors.red,
    textShadow: `
      0 2px 8px rgba(0, 0, 0, 0.8),
      0 0 20px ${gameColors.red}60
    `,
    lineHeight: '1',
  },
  spectatorAttackerName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
}
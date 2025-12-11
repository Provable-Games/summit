import { useGameDirector } from '@/contexts/GameDirector';
import { useSound } from '@/contexts/sound';
import { useGameStore } from '@/stores/gameStore';
import CasinoIcon from '@mui/icons-material/Casino';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StarIcon from '@mui/icons-material/Star';
import { Box, LinearProgress, Tooltip, Typography } from '@mui/material';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useLottie } from 'lottie-react';
import { useEffect, useRef, useState } from 'react';
import strikeAnim from '../assets/animations/strike.json';
import heart from '../assets/images/heart.png';
import poisonPotionIcon from '../assets/images/poison-potion.png';
import { lookupAddressName } from '../utils/addressNameCache';
import { BEAST_NAMES } from '../utils/BeastData';
import { calculateBattleResult, fetchBeastImage, fetchBeastSound, fetchBeastSummitImage, getLuckCritChancePercent, normaliseHealth } from '../utils/beasts';
import { gameColors } from '../utils/themes';

function Summit() {
  const { collection, summit, attackInProgress, selectedBeasts, spectatorBattleEvents,
    poisonEvent, setSpectatorBattleEvents, setSummit, setPoisonEvent, appliedPotions } = useGameStore()
  const { pauseUpdates } = useGameDirector()
  const { play } = useSound()

  const controls = useAnimationControls()
  const [cartridgeName, setCartridgeName] = useState<string | null>(null)
  const [spectatorDamage, setSpectatorDamage] = useState<Array<{ id: string; damage: number; attackerName: string; imageSrc: string }>>([])
  const [poisonNotices, setPoisonNotices] = useState<Array<{ id: string; count: number; playerName: string }>>([])
  const [estimatedDamage, setEstimatedDamage] = useState<number>(0)

  // Queue and dedup for spectator battle events
  const spectatorQueueRef = useRef<any[]>([])
  const processingSpectatorRef = useRef<boolean>(false)
  const spectatorAnimSeqRef = useRef<number>(0)

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

  useEffect(() => {
    if (!summit || poisonEvent === null || pauseUpdates) {
      setPoisonEvent(null);
      setPoisonNotices([]);
      return;
    };

    if (poisonEvent.beast_token_id === summit.beast.token_id) {
      let cancelled = false;

      const run = async () => {
        let playerName = 'Unknown';
        if (poisonEvent.player) {
          try {
            playerName = await lookupAddressName(poisonEvent.player);
          } catch {
            playerName = 'Unknown';
          }
        }
        if (cancelled) return;
        const id = `poison-${poisonEvent.beast_token_id}-${Date.now()}`;
        setPoisonNotices(prev => [...prev, { id, count: poisonEvent.count, playerName }]);
        setTimeout(() => {
          setPoisonNotices(prev => prev.filter(p => p.id !== id));
        }, 2000);
      };

      run();
      play("poison");
      return () => { cancelled = true; };
    }
  }, [poisonEvent]);

  // Per-second poison ticker
  useEffect(() => {
    if (!summit || summit.poison_count === 0) return;

    const tick = () => {
      setSummit(prevSummit => {
        if (!prevSummit) return prevSummit;

        const damage = prevSummit.poison_count;
        if (damage <= 0) return prevSummit;

        const maxHealth = prevSummit.beast.health + prevSummit.beast.bonus_health;
        const tickDamage = prevSummit.poison_count;

        // Treat current health and extra lives as one pooled health bar,
        // mirroring `applyPoisonDamage` so that if tickDamage > current_health,
        // at least one life is always consumed.
        const totalPoolBefore = (prevSummit.beast.extra_lives || 0) * maxHealth + prevSummit.beast.current_health;
        const totalPoolAfter = totalPoolBefore - tickDamage;

        let newHealth: number;
        let extraLives: number;

        if (totalPoolAfter <= 0) {
          newHealth = 1;
          extraLives = 0;
        } else {
          extraLives = Math.floor((totalPoolAfter - 1) / maxHealth);
          newHealth = totalPoolAfter - extraLives * maxHealth;
        }

        return {
          ...prevSummit,
          beast: {
            ...prevSummit.beast,
            current_health: newHealth,
            extra_lives: extraLives,
          },
        }
      })
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [summit?.poison_count]);

  useEffect(() => {
    if (summit) {
      setEstimatedDamage(
        selectedBeasts.reduce((acc, beast) => acc + calculateBattleResult(beast, summit, appliedPotions.attack).estimatedDamage, 0)
      )
    }
  }, [selectedBeasts, summit, appliedPotions.attack])

  const processSpectatorQueue = async () => {
    if (processingSpectatorRef.current) return;
    processingSpectatorRef.current = true;
    try {
      while (spectatorQueueRef.current.length > 0) {
        const event = spectatorQueueRef.current.shift();
        if (!event) break;
        // Play per-event sound
        play(fetchBeastSound(Number(event.attacking_beast_id)));
        // Calculate total damage
        const totalDamage =
          (event.attack_damage * event.attack_count) +
          (event.critical_attack_damage * event.critical_attack_count);
        // Resolve attacker name
        let attackerName = 'Unknown';
        if (event.attacking_beast_owner) {
          try {
            attackerName = await lookupAddressName(event.attacking_beast_owner);
          } catch {
            attackerName = 'Unknown';
          }
        }
        // Build visual payload
        const attackerBeastName = BEAST_NAMES[event.attacking_beast_id] || 'Unknown'
        const imageSrc = fetchBeastImage({
          name: attackerBeastName,
          shiny: event.attacking_beast_shiny,
          animated: event.attacking_beast_animated,
        } as any)
        const eventId = `spectator-${++spectatorAnimSeqRef.current}`;
        // Show animation
        setSpectatorDamage(prev => [...prev, { id: eventId, damage: totalDamage, attackerName, imageSrc }]);
        // Remove after animation duration
        setTimeout(() => {
          setSpectatorDamage(prev => prev.filter(d => d.id !== eventId));
        }, 2000);
        // Small delay between events to avoid overlapping starts
        await new Promise(res => setTimeout(res, 500));
      }
    } finally {
      processingSpectatorRef.current = false;
    }
  }

  // Enqueue spectator events and kick the processor
  useEffect(() => {
    if (!summit) return;
    // If paused, immediately drop any incoming events and exit
    if (pauseUpdates) {
      if (spectatorBattleEvents.length > 0) {
        setSpectatorBattleEvents([]);
      }
      return;
    }
    if (!spectatorBattleEvents || spectatorBattleEvents.length === 0) return;

    let enqueued = false;
    for (const event of spectatorBattleEvents) {
      if (event.defending_beast_token_id !== summit.beast.token_id) continue;
      spectatorQueueRef.current.push(event);
      enqueued = true;
    }
    // Clear incoming events once we've added them to our local queue
    if (enqueued) {
      setSpectatorBattleEvents([]);
    }
    if (enqueued && spectatorQueueRef.current.length > 0) {
      processSpectatorQueue();
    }
  }, [spectatorBattleEvents, summit?.beast.token_id, pauseUpdates]);

  // Reset queue and visuals when summit changes or updates are paused
  useEffect(() => {
    // Clear state when switching beasts or pausing
    spectatorQueueRef.current = [];
    setSpectatorDamage([]);
  }, [summit?.beast.token_id, pauseUpdates]);

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
            <Box sx={styles.extraLivesContainer}>
              {summit.poison_count > 1 && (
                <Typography sx={styles.extraLivesNumber}>{summit.poison_count}</Typography>
              )}
              {summit.poison_count > 0 && (
                <img src={poisonPotionIcon} alt='' style={{ ...styles.extraLivesHeart, marginRight: '4px' }} />
              )}
              {summit.beast.extra_lives > 1 && (
                <Typography sx={styles.extraLivesNumber}>
                  {summit.beast.extra_lives}
                </Typography>
              )}
              {summit.beast.extra_lives > 0 && (
                <img src={heart} alt='Extra Life' style={styles.extraLivesHeart} />
              )}
            </Box>

            <Box sx={styles.abilitiesContainer}>
              {Boolean(summit.beast.stats.specials) && <StarIcon sx={{ fontSize: '16px', color: '#ffd700', pb: '1px', filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }} />}
              {Boolean(summit.beast.stats.wisdom) && <PsychologyIcon sx={{ fontSize: '16px', color: '#60a5fa', pb: '1px', filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }} />}
              {Boolean(summit.beast.stats.diplomacy) && <HandshakeIcon sx={{ fontSize: '16px', color: '#a78bfa', pb: '1px', filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }} />}
            </Box>
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
          <Tooltip
            title={
              <Box sx={styles.tooltipContent}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Typography sx={[styles.statLabel, { fontSize: '12px' }]}>LUCK</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <CasinoIcon sx={{ fontSize: '16px', color: '#ff69b4' }} />
                    <Typography sx={styles.levelValue}>{Math.max(0, Math.floor(summit.beast.stats.luck))}</Typography>
                  </Box>
                </Box>
              </Box>
            }
            placement="bottom"
          >
            <Box sx={styles.statBox}>
              <Typography sx={styles.statLabel}>CRIT</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Typography sx={styles.levelValue}>
                  {getLuckCritChancePercent(summit.beast.stats.luck)}%
                </Typography>
              </Box>
            </Box>
          </Tooltip>
          {summit.diplomacy && summit.diplomacy.bonus > 0 && <Tooltip
            title={
              <Box sx={styles.tooltipContent}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <HandshakeIcon sx={{ fontSize: '16px', color: '#a78bfa' }} />
                  <Typography sx={[styles.statLabel, { fontSize: '12px' }]}>DIPLOMACY BOOST</Typography>
                </Box>
              </Box>
            }
            placement="bottom"
          >
            <Box sx={styles.statBox}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Typography sx={styles.statLabel}>STR</Typography>
              </Box>
              <Typography sx={styles.levelValue}>{summit.diplomacy.bonus}</Typography>
            </Box>
          </Tooltip>}
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
        {/* Poison green overlay and count badge */}
        {summit.poison_count > 0 && (
          <>
            <Box
              component={motion.div}
              sx={styles.poisonImageOverlay}
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

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
        {showAttack && estimatedDamage > 0 && (
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
                    {estimatedDamage}
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

      {/* Poison indicator over summit */}
      <AnimatePresence>
        {poisonNotices.map((p) => {
          const randomX = (Math.random() - 0.5) * 220;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, scale: 0.5, x: randomX }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -20, -60, -90],
                scale: [0.5, 1.2, 1, 0.8],
              }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{
                duration: 2,
                ease: "easeOut",
                times: [0, 0.15, 0.7, 1]
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 110,
                pointerEvents: 'none',
              }}
            >
              <Box sx={styles.poisonNoticeContainer}>
                <Box sx={styles.poisonNoticeRow}>
                  <img src={poisonPotionIcon} alt='Poison' style={styles.spectatorAttackerImage} />
                  <Typography sx={styles.poisonNoticeValue}>
                    x{p.count}
                  </Typography>
                </Box>
                <Typography sx={styles.poisonNoticeName}>
                  {p.playerName}
                </Typography>
              </Box>
            </motion.div>
          )
        })}
      </AnimatePresence>

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
                duration: 2,
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
                <Box sx={styles.spectatorDamageRow}>
                  <img src={damage.imageSrc} alt={damage.attackerName} style={styles.spectatorAttackerImage} />
                  <Typography sx={styles.spectatorDamageValue}>
                    -{damage.damage}
                  </Typography>
                </Box>
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
    lineHeight: '20px',
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
    zIndex: 999,
  },
  statBox: {
    background: `${gameColors.darkGreen}70`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '4px 8px',
    minWidth: '55px',
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
  poisonContainer: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 3,
  },
  abilitiesContainer: {
    position: 'absolute',
    top: '50%',
    left: '4px',
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
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    mx: '2px',
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
  spectatorDamageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
  spectatorAttackerImage: {
    width: '28px',
    height: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))',
  },
  spectatorAttackerName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  poisonNoticeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  poisonNoticeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  poisonNoticeValue: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    textShadow: `
      0 2px 8px rgba(0, 0, 0, 0.8),
      0 0 20px ${gameColors.accentGreen}60
    `,
    lineHeight: '1',
  },
  poisonNoticeName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  poisonImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 50% 50%, rgba(12, 236, 0, 0.5), rgba(0,255,136,0.08) 55%, transparent 70%)',
    zIndex: 2,
    pointerEvents: 'none',
    mixBlendMode: 'screen',
    borderRadius: '8px',
  },
  poisonCountBadge: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    background: `${gameColors.darkGreen}b0`,
    border: `1px solid ${gameColors.accentGreen}70`,
    borderRadius: '10px',
    padding: '4px 8px',
    zIndex: 4,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
  },
  poisonCountDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #00ff88 10%, #00cc66 60%, transparent 70%)',
    boxShadow: '0 0 8px rgba(0,255,136,0.7)',
  },
  poisonCountText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFF',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    letterSpacing: '0.5px',
  },
  poisonBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${gameColors.darkGreen}dd 0%, ${gameColors.mediumGreen}dd 100%)`,
    border: `2px solid ${gameColors.accentGreen}`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
  },
  poisonIcon: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #00ff88 0%, #00cc66 40%, rgba(0,0,0,0) 70%)',
    boxShadow: '0 0 12px rgba(0,255,136,0.6)',
  },
  poisonTextCol: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1',
  },
  poisonTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  poisonPlayer: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
}
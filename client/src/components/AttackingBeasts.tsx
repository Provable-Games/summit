import { useGameDirector } from '@/contexts/GameDirector';
import { useGameStore } from '@/stores/gameStore';
import type { Beast } from '@/types/game';
import CasinoIcon from '@mui/icons-material/Casino';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import StarIcon from '@mui/icons-material/Star';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { fetchBeastImage } from '../utils/beasts';
import { gameColors } from '../utils/themes';
import { shuffle } from '../utils/utils';

/** Max beasts to render — the rest are off-screen due to overflow:hidden */
const MAX_VISIBLE_CARDS = 15;

type AttackingBeastEntity = Beast & {
  /** Composite id so a single beast can appear multiple times (multi-attack) */
  attack_index: number;
  entity_key: string;
};

const AttackingBeastCard = React.memo(function AttackingBeastCard({
  beast,
  index,
  isAttacking,
}: {
  beast: AttackingBeastEntity;
  index: number;
  isAttacking: boolean;
}) {
  const isActiveBeast = index === 0;
  const health = beast.current_health;
  const maxHealth = beast.health + (beast.bonus_health || 0);
  const healthPercentage = (health / maxHealth) * 100;

  return (
    <motion.div
      key={beast.entity_key}
      layout
      initial={{ opacity: 0, x: 50 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: isActiveBeast && isAttacking ? 1 : isActiveBeast ? 1 : 0.7,
      }}
      exit={{ opacity: 0, scale: 0.3, y: -30 }}
      transition={{
        layout: { type: "spring", stiffness: 400, damping: 30 },
        scale: { duration: 0.15 },
      }}
      style={{
        position: 'relative',
        marginLeft: index > 1 ? '-35px' : '0'
      }}
    >
      <Box sx={[
        styles.beastCard,
        isActiveBeast ? styles.activeBeastCard : styles.waitingBeastCard,
        isAttacking && isActiveBeast && styles.attackingCard
      ]}>
        {/* Beast image */}
        <Box sx={styles.imageContainer}>
          <img
            src={fetchBeastImage(beast)}
            alt={beast.name}
            style={styles.beastImage}
          />
          {(beast.spirit || beast.luck || beast.specials) && (
            <Box sx={styles.upgradeIconsContainer}>
              {beast.luck && (
                <Box sx={{ color: '#ff69b4' }}>
                  <CasinoIcon sx={{ fontSize: '12px' }} />
                </Box>
              )}
              {beast.spirit && (
                <Box sx={{ color: '#00ffff' }}>
                  <EnergyIcon sx={{ fontSize: '12px' }} />
                </Box>
              )}
              {beast.specials && (
                <Box sx={{ color: '#ffd700' }}>
                  <StarIcon sx={{ fontSize: '12px' }} />
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Typography sx={[styles.beastName, index !== 0 && styles.smallBeastName]}>
          {beast.name}
        </Typography>

        {index === 0 && (
          <Box sx={styles.healthBarContainer}>
            <Box sx={styles.healthBarBackground}>
              <motion.div
                style={{
                  ...styles.healthBarFill,
                  backgroundColor: healthPercentage > 50 ? gameColors.brightGreen :
                    healthPercentage > 25 ? gameColors.yellow :
                      gameColors.red
                }}
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </Box>
            <Typography sx={styles.healthText}>
              {health}/{maxHealth}
            </Typography>
          </Box>
        )}

        <Box sx={[styles.statsRow]}>
          <Box sx={[styles.statBox, index !== 0 && styles.smallStatBox]}>
            <Typography sx={[styles.statLabel, index !== 0 && styles.smallStatLabel]}>POWER</Typography>
            <Box sx={styles.powerValueContainer}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={gameColors.yellow}>
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              <Typography sx={[styles.powerValue]}>{beast.power}</Typography>
            </Box>
          </Box>
          <Box sx={[styles.statBox]}>
            <Typography sx={[styles.statLabel, index !== 0 && styles.smallStatLabel]}>TYPE</Typography>
            <Typography sx={[styles.typeValue]}>{beast.type}</Typography>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
});

function AttackingBeasts() {
  const { selectedBeasts, setAttackInProgress, setSelectedBeasts, battleEvents, setSummit, summit } = useGameStore();
  const { setPauseUpdates } = useGameDirector();
  const [isAttacking, setIsAttacking] = useState(false);
  const [deadBeasts, setDeadBeasts] = useState<Set<string>>(new Set());
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: string; value: number; type: 'attack' | 'counter'; beastKey: string; critical: boolean }>>([]);
  const [damageQueue, setDamageQueue] = useState<Array<{ id: string; value: number; type: 'attack' | 'counter'; beastKey: string; critical: boolean }>>([]);
  const [beasts, setBeasts] = useState<AttackingBeastEntity[]>([]);
  const [activeBeastKey, setActiveBeastKey] = useState<string | null>(null);

  // Create enhanced beasts with battle data
  useEffect(() => {
    if (battleEvents.length > 0 && battleEvents[0].defending_beast_token_id !== summit?.beast.token_id) {
      handleSkip()
      return;
    }

    if (selectedBeasts.length > 0) {
      const enhancedBeasts = selectedBeasts.flatMap((selectedBeast) => {
        const [beast, attacks] = selectedBeast;
        const attackCount = Math.max(1, attacks || 0);

        return Array.from({ length: attackCount }, (_, attackIndex) => {
          const battleEvent = battleEvents.find(
            event =>
              event.attacking_beast_token_id === beast.token_id &&
              event.attack_index === attackIndex
          );

          if (!battleEvent && battleEvents.length > 0) return null;

          return {
            ...beast,
            attack_index: attackIndex,
            entity_key: `${beast.token_id}-${attackIndex}`,
            current_health: beast.current_health || (beast.health + beast.bonus_health),
            battle: battleEvent,
          } satisfies AttackingBeastEntity;
        }).filter(Boolean) as AttackingBeastEntity[];
      });

      setBeasts(enhancedBeasts);
    } else {
      setBeasts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeasts, battleEvents]);

  useEffect(() => {
    if (beasts.length > 0 && !activeBeastKey && beasts[0]?.battle) {
      setActiveBeastKey(beasts[0]?.entity_key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beasts]);

  // Build damage queue for the CURRENT active beast only
  useEffect(() => {
    if (beasts.length === 0 || activeBeastKey === null) return;

    const beast = beasts.find(b => b.entity_key === activeBeastKey);
    if (!beast || !beast.battle) return;

    // Build attacks array
    const attacks = [];

    // Add normal attacks
    for (let i = 0; i < (beast.battle.attack_count || 0); i++) {
      attacks.push({
        id: `${beast.entity_key}-attack-${i}`,
        value: beast.battle.attack_damage || 0,
        type: 'attack' as const,
        critical: false,
        beastKey: beast.entity_key
      });
    }

    // Add critical attacks
    for (let i = 0; i < (beast.battle.critical_attack_count || 0); i++) {
      attacks.push({
        id: `${beast.entity_key}-crit-attack-${i}`,
        value: beast.battle.critical_attack_damage || 0,
        type: 'attack' as const,
        critical: true,
        beastKey: beast.entity_key
      });
    }

    // Build counter-attacks array
    const counterAttacks = [];

    // Add normal counter-attacks
    for (let i = 0; i < (beast.battle.counter_attack_count || 0); i++) {
      counterAttacks.push({
        id: `${beast.entity_key}-counter-${i}`,
        value: beast.battle.counter_attack_damage || 0,
        type: 'counter' as const,
        critical: false,
        beastKey: beast.entity_key
      });
    }

    // Add critical counter-attacks
    for (let i = 0; i < (beast.battle.critical_counter_attack_count || 0); i++) {
      counterAttacks.push({
        id: `${beast.entity_key}-crit-counter-${i}`,
        value: beast.battle.critical_counter_attack_damage || 0,
        type: 'counter' as const,
        critical: true,
        beastKey: beast.entity_key
      });
    }

    // Shuffle attacks and counter-attacks separately to randomize order
    const shuffledAttacks = shuffle(attacks);
    const shuffledCounterAttacks = shuffle(counterAttacks);

    // Interleave attacks and counter-attacks
    const queue = [];
    const maxLength = Math.max(shuffledAttacks.length, shuffledCounterAttacks.length);

    for (let i = 0; i < maxLength; i++) {
      if (shuffledAttacks[i]) {
        queue.push(shuffledAttacks[i]);
      }
      if (shuffledCounterAttacks[i]) {
        queue.push(shuffledCounterAttacks[i]);
      }
    }

    setDamageQueue(queue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBeastKey]);

  // Process damage queue continuously
  useEffect(() => {
    if (damageQueue.length === 0) return;

    let currentIndex = 0;
    const timeouts = [];

    const processNext = () => {
      if (currentIndex >= damageQueue.length) {
        if (visibleBeasts.length <= 1) {
          setTimeout(() => {
            handleSkip();
          }, 1000);
        }

        return;
      };

      const nextDamage = damageQueue[currentIndex];

      // Show damage number
      setDamageNumbers(current => [...current, nextDamage]);

      if (nextDamage.type === 'attack') {
        setIsAttacking(true);
        setSummit(prevSummit => {
          if (prevSummit.beast.current_health <= nextDamage.value && prevSummit.beast.extra_lives > 0) {
            return {
              ...prevSummit,
              beast: {
                ...prevSummit.beast,
                current_health: prevSummit.beast.health + prevSummit.beast.bonus_health,
                extra_lives: prevSummit.beast.extra_lives - 1
              }
            }
          }

          if (prevSummit.beast.current_health <= nextDamage.value) {
            setTimeout(() => {
              handleSkip();
            }, 1000);
          }

          return {
            ...prevSummit,
            beast: {
              ...prevSummit.beast,
              current_health: Math.max(0, prevSummit.beast.current_health - nextDamage.value)
            }
          }
        });
      }

      // Apply counter-attack damage to beast health
      else if (nextDamage.type === 'counter') {
        setBeasts(prevBeasts => {
          const newBeasts = [...prevBeasts];
          const beastIndex = newBeasts.findIndex(b => b.entity_key === nextDamage.beastKey);
          if (beastIndex === -1) return prevBeasts;

          const newHealth = Math.max(0, newBeasts[beastIndex].current_health - nextDamage.value);
          newBeasts[beastIndex] = {
            ...newBeasts[beastIndex],
            current_health: newHealth
          };

          if (newHealth === 0) {
            const deadKey = newBeasts[beastIndex].entity_key;
            setTimeout(() => {
              setDeadBeasts(dead => {
                const newDeadSet = new Set([...dead, deadKey]);
                const nextBeast = newBeasts.find(b => !newDeadSet.has(b.entity_key));

                // Find next alive beast and set as active
                if (nextBeast) {
                  setActiveBeastKey(nextBeast.entity_key);
                } else {
                  handleSkip()
                }

                return newDeadSet;
              });
            }, 1000);
          }

          return newBeasts;
        });

        setIsAttacking(false);
      }

      // Clean up damage number after display time
      const cleanupTimeout = setTimeout(() => {
        setDamageNumbers(prev => prev.filter(d => d.id !== nextDamage.id));
      }, 1200);
      timeouts.push(cleanupTimeout);

      currentIndex++;
      const nextTimeout = setTimeout(processNext, 300);
      timeouts.push(nextTimeout);
    };

    processNext();

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [damageQueue]);

  const visibleBeasts = useMemo(
    () => beasts.filter(beast => !deadBeasts.has(beast.entity_key)),
    [beasts, deadBeasts]
  );

  const handleSkip = () => {
    setPauseUpdates(false);
    setSelectedBeasts([]);
    setAttackInProgress(false);
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.infoPanel}>
        {battleEvents.length > 0 ? (<Box sx={styles.beastsRemaining}>
          <Typography sx={styles.remainingText}>
            {visibleBeasts.length} Beast{visibleBeasts.length !== 1 ? 's' : ''} Remaining
          </Typography>
        </Box>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: 0.3 }}
            style={{ width: '90%' }}
          >
            <Box sx={styles.preparingBattle}>
              <Typography sx={styles.preparingTitle}>
                Preparing Battle
              </Typography>

              <Box sx={styles.preparingDots}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: gameColors.accentGreen,
                    }}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </Box>
            </Box>
          </motion.div>
        )}

        {battleEvents.length > 0 && <Box sx={styles.skipButton} onClick={handleSkip}>
          <FastForwardIcon sx={styles.skipIcon} />
          <Typography sx={styles.skipButtonText}>
            Skip All
          </Typography>
        </Box>}
      </Box>
      <Box sx={styles.beastsRow}>
        <AnimatePresence mode="popLayout">
          {visibleBeasts.slice(0, MAX_VISIBLE_CARDS).map((beast, index) => (
            <AttackingBeastCard
              key={beast.entity_key}
              beast={beast}
              index={index}
              isAttacking={isAttacking}
            />
          ))}
        </AnimatePresence>

        {visibleBeasts.length > MAX_VISIBLE_CARDS && (
          <Box sx={styles.overflowBadge}>
            <Typography sx={styles.overflowText}>
              +{visibleBeasts.length - MAX_VISIBLE_CARDS}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Damage numbers overlay */}
      <AnimatePresence>
        {damageNumbers.map((damage) => (
          <motion.div
            key={damage.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [-10, -40, -80, -120],
              scale: [0.8, 1.1, 1, 0.9],
            }}
            transition={{
              duration: 1.2,
              ease: "easeOut",
              times: [0, 0.2, 0.8, 1]
            }}
            style={{
              position: 'fixed',
              top: damage.type === 'attack' ? `calc(50% - 80px)` : `calc(100% - 100px)`,
              left: damage.type === 'attack' ? 'calc(50% + 80px)' : 'clamp(100px, 15vw, 180px)',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <Typography sx={[
              styles.damageNumber,
              styles.counterDamage
            ]}>
              -{damage.value} {damage.critical ? ' CRIT!' : ''}
            </Typography>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
}

export default AttackingBeasts;

const styles = {
  container: {
    bottom: 0,
    padding: 2,
    position: 'absolute',
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    gap: 2,
  },
  infoPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    justifyContent: 'flex-end',
    paddingBottom: 1,
    minWidth: { xs: 'auto', sm: '220px' },
  },
  beastsRemaining: {
    width: '100%',
    background: 'transparent',
    boxSizing: 'border-box',
    display: { xs: 'none', sm: 'block' },
  },
  remainingText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  preparingBattle: {
    position: 'relative',
    width: '100%',
    background: `${gameColors.darkGreen}40`,
    backdropFilter: 'blur(4px)',
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  preparingTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: gameColors.accentGreen,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1,
  },
  preparingDots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  skipButton: {
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.red}60`,
    borderRadius: '10px',
    boxShadow: `
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    padding: { xs: '10px', sm: '12px' },
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minWidth: { xs: '44px', sm: 'auto' },
    '&:hover': {
      background: `${gameColors.darkGreen}95`,
      border: `2px solid ${gameColors.red}80`,
      boxShadow: `
        0 8px 24px rgba(0, 0, 0, 0.6),
        0 0 20px ${gameColors.red}40
      `,
    },
  },
  skipIcon: {
    fontSize: '20px',
    color: gameColors.red,
    filter: `drop-shadow(0 0 8px ${gameColors.red}40)`,
  },
  skipButtonText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: gameColors.red,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.red}40
    `,
    display: { xs: 'none', sm: 'block' },
  },
  beastsRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    flex: 1,
  },
  beastCard: {
    position: 'relative',
    background: `linear-gradient(135deg, ${gameColors.mediumGreen} 0%, ${gameColors.darkGreen} 100%)`,
    borderRadius: 2,
    padding: 1,
    boxShadow: `0 4px 8px rgba(0, 0, 0, 0.4)`,
    border: `1px solid ${gameColors.accentGreen}40`,
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5
  },
  activeBeastCard: {
    width: { xs: '100px', sm: '120px', md: '140px' },
    border: `2px solid ${gameColors.accentGreen}`,
    boxShadow: `0 6px 16px rgba(127, 255, 0, 0.3)`,
  },
  waitingBeastCard: {
    width: { xs: '80px', sm: '100px', md: '120px' },
    filter: 'brightness(0.85)',
  },
  attackingCard: {
    border: `2px solid ${gameColors.brightGreen}`,
    boxShadow: `0 0 20px rgba(127, 255, 0, 0.5)`,
    filter: 'brightness(1.2)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: { xs: '60px', sm: '70px', md: '80px' },
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '4px',
    borderRadius: '4px',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${gameColors.darkGreen} 0%, ${gameColors.black} 100%)`,
    boxShadow: `inset 0 1px 0 ${gameColors.darkGreen}, inset 0 -1px 0 ${gameColors.black}`,
  },
  beastImage: {
    height: '90%',
  },
  beastName: {
    fontSize: { xs: '11px', sm: '12px', md: '14px' },
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  healthBarContainer: {
    position: 'relative',
  },
  healthBarBackground: {
    width: '100%',
    height: '16px',
    background: `${gameColors.darkGreen}80`,
    borderRadius: 1,
    overflow: 'hidden',
    border: `1px solid ${gameColors.accentGreen}40`,
  },
  healthBarFill: {
    height: '100%',
    transition: 'width 0.5s ease',
  },
  healthText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#FFF',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  },
  potionIndicators: {
    display: 'flex',
    gap: 0.5,
    justifyContent: 'center',
  },
  potionIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    background: `${gameColors.darkGreen}60`,
    padding: '1px 6px',
    borderRadius: 1,
  },
  potionText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFF',
  },
  powerIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mt: 0.5,
    gap: '4px',
    color: gameColors.yellow,
  },
  powerText: {
    color: gameColors.yellow,
    fontSize: '14px',
    fontWeight: 'bold',
  },
  damageNumber: {
    fontSize: { xs: '24px', sm: '28px', md: '32px' },
    fontWeight: 'bold',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  },
  attackDamage: {
    color: gameColors.brightGreen,
  },
  counterDamage: {
    color: gameColors.red,
  },
  battleInfo: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: 'translateX(-50%)',
  },
  battleInfoText: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  smallPowerIndicator: {
    gap: '2px',
  },
  smallPowerText: {
    fontSize: '12px',
  },
  smallBeastName: {
    fontSize: '11px',
  },
  upgradeIconsContainer: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    display: 'flex',
    flexDirection: 'column',
  },
  statsRow: {
    display: 'flex',
    gap: '4px',
    marginTop: '2px',
    justifyContent: 'center',
  },
  smallStatsRow: {
    gap: '2px',
    marginTop: '1px',
  },
  statBox: {
    background: `${gameColors.darkGreen}70`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}40`,
    padding: '4px 8px',
    textAlign: 'center',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  smallStatBox: {
    padding: '2px 4px',
    minWidth: '40px',
  },
  statLabel: {
    fontSize: '8px',
    color: '#ffedbb',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
    lineHeight: '1',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  smallStatLabel: {
    fontSize: '7px',
    marginBottom: '1px',
  },
  powerValue: {
    fontSize: '12px',
    color: '#FFD700',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  smallPowerValue: {
    fontSize: '10px',
  },
  typeValue: {
    fontSize: '10px',
    color: '#FFF',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  smallTypeValue: {
    fontSize: '8px',
  },
  powerValueContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
  },
  overflowBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '48px',
    height: '32px',
    borderRadius: '16px',
    background: `${gameColors.darkGreen}90`,
    border: `1px solid ${gameColors.accentGreen}40`,
    alignSelf: 'flex-end',
    marginBottom: '40px',
    marginLeft: '-20px',
  },
  overflowText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
  },
};

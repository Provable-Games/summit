import { useGameStore } from '@/stores/gameStore'
import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import { fetchBeastSummitImage, normaliseHealth } from '../utils/beasts'
import { gameColors } from '../utils/themes'
import { fadeVariant } from '../utils/variants'

function Feeding() {
  const { selectedBeasts, collection } = useGameStore()
  const beast = collection.find(beast => beast.token_id === selectedBeasts[0])
  const controls = useAnimationControls()

  const name = beast.prefix ? `"${beast.prefix} ${beast.suffix}" ${beast.name}` : beast.name

  return (
    <Box sx={styles.feedingContainer}>
      <motion.div
        style={styles.mainContainer}
        variants={fadeVariant}
        animate="enter"
        initial="initial"
        exit="exit"
      >
        {/* Stats and Health Section */}
        <Box sx={styles.statsSection}>
          {/* Name and Level */}
          <Box sx={styles.nameSection}>
            <Typography sx={styles.beastName}>
              {name}
            </Typography>
          </Box>

          {/* Health Bar */}
          <Box sx={styles.healthContainer}>
            <Box sx={styles.healthBar}>
              <Box sx={[styles.healthFill, {
                width: `${normaliseHealth(beast.current_health, beast.health + beast.bonus_health)}%`
              }]} />

              <Typography sx={styles.healthText}>
                {beast.current_health} / {beast.health + beast.bonus_health} HP
              </Typography>
            </Box>

            {/* Bonus Health Bar */}
            <Box sx={styles.bonusHealthBar}>
              <Box sx={[styles.bonusHealthFill, {
                width: `${normaliseHealth(beast.bonus_health, 1023)}%`
              }]} />

              <Typography sx={styles.bonusHealthText}>
                Bonus: {beast.bonus_health} / 1023 HP
              </Typography>
            </Box>
          </Box>

          {/* Stats Row */}
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
          <motion.img
            key={beast.token_id}
            style={styles.beastImage}
            src={fetchBeastSummitImage(beast)}
            alt=''
            animate={controls}
          />
        </Box>
      </motion.div>
    </Box>
  );
}

export default Feeding;

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
    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8)`,
  },
  levelText: {
    fontSize: '12px',
    color: '#ffedbb',
    letterSpacing: '0.5px',
  },
  beastImageContainer: {
    position: 'relative',
    width: '280px',
    height: '280px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  },
  beastImage: {
    height: '240px',
    maxWidth: '240px',
    filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))',
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
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
  },
  statValue: {
    fontSize: '14px',
    color: '#ffedbb',
    fontWeight: 'bold',
    lineHeight: '1',
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
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
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
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
    textShadow: `0 1px 2px rgba(0, 0, 0, 0.8)`,
    letterSpacing: '0.5px',
    zIndex: 2,
  },
}
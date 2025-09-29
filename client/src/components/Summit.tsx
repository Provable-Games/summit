import { useGameStore } from '@/stores/gameStore'
import { Box, Typography } from '@mui/material'
import { motion, useAnimationControls } from 'framer-motion'
import explosion from '../assets/images/explosion.png'
import heart from '../assets/images/heart.png'
import skull from '../assets/images/skull.png'
import summitImage from '../assets/images/summit.png'
import sword from '../assets/images/sword.png'
import { fetchBeastImage, normaliseHealth } from '../utils/beasts'
import { HealthBar } from '../utils/styles'

function Summit() {
  const { collection, summit, attackInProgress, totalDamage, selectedBeasts } = useGameStore()

  const controls = useAnimationControls()

  const isSavage = Boolean(collection.find(beast => beast.token_id === summit.beast.token_id))
  const showAttack = !isSavage && !attackInProgress && selectedBeasts.length > 0 && totalDamage > 0
  const summitHealthRemaining = summit.beast.current_health + (summit.beast.extra_lives * (summit.beast.health + summit.beast.bonus_health))

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
    <Box sx={styles.beastSummit}>
      <Box position={'relative'} width={'100%'} mb={2}>
        <HealthBar variant="determinate" value={normaliseHealth(summit.beast.current_health, summit.beast.health + summit.beast.bonus_health)} />

        <Box sx={styles.healthText}>
          <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white' }}>
            {summit.beast.current_health}
          </Typography>
        </Box>

        {summit.beast.extra_lives > 0 && <Box sx={styles.extraLife}>
          {summit.beast.extra_lives > 1 && <Typography sx={{ fontSize: '13px', lineHeight: '16px', color: 'white', letterSpacing: '0.5px', textShadow: '0 0 3px #FFD700' }}>
            {summit.beast.extra_lives}
          </Typography>}

          <img src={heart} alt='' height={'12px'} />
        </Box>}
      </Box>

      <motion.div animate={controls} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: '8px' }}>
        <Typography variant='h3' sx={{ lineHeight: '12px', textAlign: 'center' }}>
          "{summit.beast.prefix} {summit.beast.suffix}" {summit.beast.name}
        </Typography>

        <Typography variant='h6' sx={{ textAlign: 'center', letterSpacing: '0.5px' }}>
          Owned by {summit.owner?.replace('.stark', '') || 'Unknown'}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', gap: 1, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: '2px' }}>
            <Typography variant='h5' sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)', lineHeight: '16px' }}>
              Pwr
            </Typography>

            <Typography variant='h5' sx={{ letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)', lineHeight: '16px' }}>
              {summit.beast.power}
            </Typography>
          </Box>

        </Box>
      </motion.div>

      <motion.img
        key={summit.beast.token_id}
        style={{ zIndex: 1, height: '200px', marginTop: '-10px', opacity: showAttack ? 0.6 : 1 }}
        src={fetchBeastImage(summit.beast.name)} alt=''
        animate={controls}
      />

      <img src={summitImage} alt='' width={'100%'} style={{ marginTop: '-105px', zIndex: 0 }} />

      {showAttack && <>
        <Box sx={styles.damageText} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Typography variant='h2'>
            -{totalDamage}
          </Typography>

          <img src={sword} alt='' height={'18px'} />
        </Box>

        <Box sx={styles.monsterDmgIcon} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {totalDamage < summitHealthRemaining
            ? <img src={explosion} alt='' height={'60px'} />
            : <img src={skull} alt='' height={'60px'} />
          }
        </Box>

        {calculateExtraLifeLoss() > 0 && <Box sx={styles.extraLifeLoss} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Typography variant='h5'>
            -{calculateExtraLifeLoss()}
          </Typography>

          <img src={heart} alt='' height={'12px'} />
        </Box>}
      </>}

    </Box>
  );
}

export default Summit;

const styles = {
  beastSummit: {
    height: 'calc(100% - 270px)',
    width: '350px',
    maxWidth: '95vw',
    boxSizing: 'border-box',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    transition: '0.3s',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
    height: '380px',
    justifyContent: 'space-between',
    position: 'relative',
    opacity: 0
  },
  clock: {
    position: 'absolute',
    top: '200px',
    left: '50px',
    width: '100px',
    height: '50px',
  },
  healthText: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%)',
    textAlign: 'center',
    letterSpacing: '0.5px'
  },
  extraLife: {
    position: 'absolute',
    top: 0,
    right: '6px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  damageText: {
    position: 'absolute',
    zIndex: 100,
    right: 0,
    top: '100px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  monsterDmgIcon: {
    position: 'absolute',
    width: '100px',
    left: '145px',
    top: '130px',
    zIndex: 98
  },
  extraLifeLoss: {
    position: 'absolute',
    zIndex: 100,
    right: '5px',
    top: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
}
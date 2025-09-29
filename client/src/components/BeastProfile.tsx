import { useGameStore } from '@/stores/gameStore';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Typography } from "@mui/material";
import { fetchBeastImage, fetchBeastTypeImage, normaliseHealth } from "../utils/beasts";
import { ExperienceBar, HealthBar } from "../utils/styles";

const MAX_HEALTH = 1023;
const MAX_LEVELS = 40;

export default function BeastProfile({ beast }) {
  const { summit } = useGameStore()

  const originalExperience = Math.pow(beast.level, 2);
  const currentExperience = beast.totalXp;
  const nextLevelExperience = Math.pow(beast.level + 1, 2);
  const bonusLevels = beast.level - beast.originalLevel;
  const diff = (beast.deadAt + 46 * 60 * 60 * 1000) - Date.now();
  const timeLeft = diff > 3600000 ? `${Math.floor(diff / 3600000)}h` : `${Math.floor((diff % 3600000) / 60000)}m`;
  const streakEnded = diff <= 0;
  const attackStreak = streakEnded ? 0 : beast.attack_streak;

  return (
    <Box sx={styles.container}>
      <Typography variant='h4' sx={{ lineHeight: '16px', textAlign: 'center' }}>
        "{beast.prefix} {beast.suffix}"
      </Typography>

      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', gap: 1, my: 2, mb: 1 }}>
        <Box sx={{ width: '50%', display: 'flex', justifyContent: 'center' }}>
          <img src={fetchBeastImage(beast.name)} alt='' height={'100px'} />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '50%' }}>
          <Box sx={styles.infoSection}>
            <Typography sx={{ fontSize: '18px', lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.name}
            </Typography>

            <img src={fetchBeastTypeImage(beast.type)} alt='' height={'16px'} />
          </Box>

          <Box sx={styles.infoSection}>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              Level
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.originalLevel}
            </Typography>
          </Box>

          <Box sx={styles.infoSection}>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              Tier
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.tier}
            </Typography>
          </Box>

          <Box sx={styles.infoSection}>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              Health
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.originalHealth}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.6)', borderRadius: '4px' }}>
          <Box sx={{ display: 'flex', justifyContent: (attackStreak > 0) ? 'space-between' : 'center', alignItems: 'center', px: 1 }}>
            <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px' }}>
              Attack Streak
            </Typography>
            {attackStreak > 0 && !streakEnded && <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px' }}>
              {beast.token_id === summit.beast.token_id ? "paused" : `ends in ${timeLeft}`}
            </Typography>}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '-5px' }}>
            {[...Array(10)].map((_, index) => (
              <WhatshotIcon
                key={index}
                htmlColor={index < attackStreak ? 'red' : 'gray'}
                sx={{ fontSize: '18px', pt: '4px' }}
              />
            ))}
          </Box>

          <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
            +{attackStreak * 10}% Bonus XP Next Attack
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '16px' }}>
          <Typography letterSpacing={'0.5px'}>
            Bonus Levels
          </Typography>

          {bonusLevels === MAX_LEVELS ? (
            <Typography letterSpacing={'1px'} className="special-text" fontSize={'12px'}>
              MAXED
            </Typography>
          ) : (
            <Typography letterSpacing={'0.5px'}>
              {bonusLevels}/{MAX_LEVELS}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[...Array(MAX_LEVELS)].map((_, index) => {
            let color;
            if (index < bonusLevels) {
              const ratio = index / MAX_LEVELS;
              const red = Math.floor(255 * (1 - ratio));
              const green = Math.floor(255 * ratio);
              color = `rgb(${red}, ${green}, 0)`;
            } else {
              color = 'gray';
            }
            return (
              <Box
                key={index}
                sx={{
                  width: '5px',
                  height: '10px',
                  backgroundColor: color,
                  borderRadius: '2px',
                  mr: '1px'
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '16px' }}>
          <Typography letterSpacing={'0.5px'}>
            Bonus Health
          </Typography>

          {beast.bonus_health === MAX_HEALTH ? (
            <Typography letterSpacing={'1px'} className="special-text" fontSize={'12px'}>
              MAXED
            </Typography>
          ) : (
            <Typography letterSpacing={'0.5px'}>
              {MAX_HEALTH}
            </Typography>
          )}
        </Box>

        <Box position={'relative'} width={'100%'}>
          <HealthBar sx={{ height: '12px', border: '2px solid black' }} variant="determinate" value={normaliseHealth(beast.bonus_health, MAX_HEALTH)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '11px', lineHeight: '9px', color: 'white', letterSpacing: '0.5px' }}>
              {beast.bonus_health}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '16px' }}>
          <Typography letterSpacing={'0.5px'}>
            Experience
          </Typography>

          <Typography letterSpacing={'0.5px'}>
            lvl {beast.level + 1}
          </Typography>
        </Box>

        <Box position={'relative'} width={'100%'}>
          <ExperienceBar sx={{ height: '12px', border: '2px solid black' }} variant="determinate" value={normaliseHealth(currentExperience - originalExperience, nextLevelExperience - originalExperience)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '11px', lineHeight: '9px', color: 'white', letterSpacing: '0.5px' }}>
              {currentExperience - originalExperience}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center' }} mt={'3px'}>
          <Typography color='rgba(0,0,0,0.7)' fontStyle={'normal'} fontSize={'13px'}>
            Revival Cost: {beast.revival_count + 1} {beast.revival_count + 1 > 1 ? 'Potions' : 'Potion'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '210px',
    backgroundColor: '#f6e6bc',
    border: '3px solid rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    padding: '10px 12px',
    pb: 0.5,
  },
  infoSection: {
    display: 'flex',
    borderBottom: '1px solid rgba(0, 0, 0, 0.5)',
    width: '100px',
    justifyContent: 'space-between',
    paddingBottom: '4px',
  },
  healthText: {
    position: 'absolute',
    top: '50%',
    left: '3px',
    transform: 'translate(3px, -50%)',
    zIndex: 1000
  }
}
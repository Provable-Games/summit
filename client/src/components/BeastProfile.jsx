import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Typography } from "@mui/material";
import { fetchBeastImage, normaliseHealth } from "../helpers/beasts";
import { BonusHealthBar, ExperienceBar, OriginalHealthBar } from "../helpers/styles";

const MAX_HEALTH = 2046;

export default function BeastProfile({ beast }) {
  const originalExperience = Math.pow(beast.originalLevel, 2);
  const currentExperience = beast.totalXp;
  const nextLevelExperience = Math.pow(beast.level + 1, 2);

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
          </Box>

          <Box sx={styles.infoSection}>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              Level
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.level}{beast.level !== beast.originalLevel ? `(${beast.originalLevel})` : ''}
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
              Saváge
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.num_deaths ?? 0}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.6)', borderRadius: '4px' }}>
          <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px' }}>
            Attack Streak
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '-5px' }}>
            {[...Array(10)].map((_, index) => (
              <WhatshotIcon
                key={index}
                htmlColor={index < beast.attack_streak ? 'red' : 'gray'}
                sx={{ fontSize: '18px', pt: '4px' }}
              />
            ))}
          </Box>

          <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
            +{(beast.attack_streak ?? 0) * 10}% Bonus XP Next Attack
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '16px' }}>
          <Typography letterSpacing={'0.5px'}>
            Total Health
          </Typography>

          <Typography letterSpacing={'0.5px'}>
            {MAX_HEALTH}
          </Typography>
        </Box>

        <Box position={'relative'} width={'100%'}>
          <BonusHealthBar variant="determinate" value={normaliseHealth(beast.health, MAX_HEALTH)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '11px', lineHeight: '9px', color: 'white', letterSpacing: '0.5px' }}>
              {beast.health}
            </Typography>
          </Box>

          <Box sx={{ position: 'absolute', left: 0, top: 0, width: '100%' }}>
            <OriginalHealthBar variant="determinate" value={normaliseHealth(beast.originalHealth, MAX_HEALTH)} />
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mr: '2px' }}>
          <Typography variant='subtitle2'>
            {nextLevelExperience - currentExperience} xp to next lvl
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
    width: '200px',
    backgroundColor: '#f6e6bc',
    border: '3px solid rgba(0, 0, 0, 0.5)',
    borderRadius: '10px',
    padding: '10px 12px',
    pb: 1,
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
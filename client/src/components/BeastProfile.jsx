import { Box, Typography } from "@mui/material";
import { fetchBeastImage, normaliseHealth } from "../helpers/beasts";
import { ExperienceBar, HealthBar } from "../helpers/styles";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

const MAX_HEALTH = 2046;
const MAX_BONUS_LEVELS = 40;

export default function BeastProfile({ beast }) {
  const currentExperience = Math.pow(beast.level, 2);
  const maxExperience = Math.pow(beast.level + 40, 2);

  return (
    <Box sx={styles.container}>
      <Typography variant='h4' sx={{ lineHeight: '16px', textAlign: 'center' }}>
        "{beast.prefix} {beast.suffix}"
      </Typography>

      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', gap: 1, my: 2, mb: 1 }}>
        <Box sx={{ width: '50%', display: 'flex', justifyContent: 'center' }}>
          <img src={fetchBeastImage(beast.name)} alt='' height={'100px'} />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '50%' }}>
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
              {beast.level}
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
              Deaths
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: '16px', textAlign: 'center', letterSpacing: '0.5px' }}>
              {beast.num_deaths ?? 0}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.6)', borderRadius: '4px' }}>
          <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
            Attack Streak
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '-5px', alignItems: 'center' }}>
            <Typography variant='h4' sx={{ letterSpacing: '0.5px' }}>
              {beast.attack_streak ?? 0}
            </Typography>

            {beast.attack_streak > 0 && <LocalFireDepartmentIcon htmlColor='red' sx={{ fontSize: '18px', pt: '2px' }} />}
          </Box>
        </Box>

        <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', textAlign: 'center', border: '1px solid rgba(0, 0, 0, 0.6)', borderRadius: '4px' }}>
          <Typography sx={{ fontSize: '12px', letterSpacing: '0.5px', color: 'rgba(0, 0, 0, 0.6)' }}>
            Saváge Earned
          </Typography>

          <Typography variant='h4' sx={{ letterSpacing: '0.5px', mt: '-5px' }}>
            0
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
          <HealthBar sx={{ height: '12px' }} variant="determinate" value={normaliseHealth(beast.health, MAX_HEALTH)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '11px', lineHeight: '9px', color: 'white', letterSpacing: '0.5px' }}>
              {beast.health}
            </Typography>
          </Box>
        </Box>

        {/* <Typography variant='subtitle2'>
          Feed beast adventurers to increase health.
        </Typography> */}
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '16px' }}>
          <Typography letterSpacing={'0.5px'}>
            Total Experience
          </Typography>

          <Typography letterSpacing={'0.5px'}>
            {maxExperience}
          </Typography>
        </Box>

        <Box position={'relative'} width={'100%'}>
          <ExperienceBar sx={{ height: '12px', border: '2px solid black' }} variant="determinate" value={normaliseHealth(currentExperience, maxExperience)} />

          <Box sx={styles.healthText}>
            <Typography sx={{ fontSize: '11px', lineHeight: '9px', color: 'white', letterSpacing: '0.5px' }}>
              {currentExperience}
            </Typography>
          </Box>
        </Box>

        {/* <Typography variant='subtitle2'>
          Attack the summit to gain bonus levels.
        </Typography> */}
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
    padding: '12px',
    pb: 2,
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
    left: '50%',
    transform: 'translate(-50%, -50%)',
  }
}
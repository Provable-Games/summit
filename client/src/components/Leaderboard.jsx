import { useStatistics } from '@/contexts/Statistics';
import { gameColors } from '@/utils/themes';
import { Box, Typography } from '@mui/material';
import { useGameTokens } from '@/dojo/useGameTokens';
import { useEffect, useState } from 'react';

function Leaderboard(props) {
  const { beastsRegistered } = useStatistics()
  const { getBigFive } = useGameTokens()
  const [bigFive, setBigFive] = useState([])
  const [loadingBigFive, setLoadingBigFive] = useState(true)

  useEffect(() => {
    const fetchBigFive = async () => {
      try {
        const data = await getBigFive()
        setBigFive(data)
      } catch (error) {
        console.error('Error fetching big five:', error)
      } finally {
        setLoadingBigFive(false)
      }
    }

    fetchBigFive()
  }, [])

  const formatRewards = (rewards) => {
    const num = parseInt(rewards, 16)
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  return <Box sx={styles.container}>
    <Box sx={styles.innerContainer}>

      <Box sx={styles.content}>

        <Typography sx={styles.title}>
          SUMMIT
        </Typography>

        <Typography sx={[styles.title, { fontSize: '14px', lineHeight: '14px', opacity: 0.9 }]}>
          Test Alpha
        </Typography>

        <Box sx={styles.sectionHeader}>
          <Typography sx={styles.sectionTitle}>
            THE BIG FIVE
          </Typography>
        </Box>

        {loadingBigFive ? (
          <Box sx={styles.loadingContainer}>
            <Typography sx={styles.loadingText}>Loading...</Typography>
          </Box>
        ) : bigFive.length > 0 ? (
          <Box sx={styles.bigFiveContainer}>
            {bigFive.map((beast, index) => (
              <Box key={index} sx={styles.bigFiveRow}>
                <Typography sx={styles.bigFiveRank}>{index + 1}.</Typography>
                <Typography sx={styles.bigFiveCompact}>
                  {beast.Prefix && beast.Suffix ? (
                    <span>
                      <span style={styles.bigFiveName}>"{beast.Prefix} {beast.Suffix}"</span>{' '}
                      <span style={styles.bigFiveName}>{beast.Beast || 'Unknown'}</span>
                    </span>
                  ) : (
                    <span style={styles.bigFiveName}>{beast.Beast || 'Unknown'}</span>
                  )}
                </Typography>
                <Typography sx={styles.bigFiveRewards}>
                  {formatRewards(beast.rewards_earned)}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={styles.emptyContainer}>
            <Typography sx={styles.emptyText}>No data available</Typography>
          </Box>
        )}

        {/* <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 1 }}>
          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />

          <Box sx={{ width: '50%', height: '18px', border: '2px solid #07323d', textAlign: 'center', borderRadius: '10px', background: '#ddcdaa' }}>
            <Typography letterSpacing={'1px'} fontWeight={'bold'}>
              Potion cost
            </Typography>
          </Box>

          <Box sx={{ width: '25%', height: '2px', background: '#07323d' }} />
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Revive potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            ${potionPrices.revive}
          </Typography>
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Attack potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            ${potionPrices.attack}
          </Typography>
        </Box>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            Extra life potion
          </Typography>
          <Typography sx={{ letterSpacing: '0.5px' }}>
            ${potionPrices.extraLife}
          </Typography>
        </Box> */}

        <Box sx={styles.sectionHeader}>
          <Typography sx={styles.sectionTitle}>
            STATS
          </Typography>
        </Box>

        <Box sx={styles.statRow}>
          <Typography sx={styles.statLabel}>
            Beasts Registered
          </Typography>
          <Typography sx={styles.statValue}>
            {beastsRegistered}
          </Typography>
        </Box>

      </Box>

    </Box>
  </Box>;
}

export default Leaderboard;

const styles = {
  container: {
    width: '295px',
    background: `${gameColors.darkGreen}90`,
    backdropFilter: 'blur(12px) saturate(1.2)',
    border: `2px solid ${gameColors.accentGreen}60`,
    borderRadius: '12px',
    boxShadow: `
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 0 1px ${gameColors.darkGreen}
    `,
    p: 2,
  },
  innerContainer: {
    width: '100%',
    height: '100%',
  },
  content: {
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: gameColors.yellow,
    textAlign: 'center',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.yellow}40
    `,
  },
  sectionHeader: {
    width: '100%',
    padding: '4px 0',
    borderBottom: `1px solid ${gameColors.accentGreen}40`,
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    textAlign: 'center',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  statLabel: {
    fontSize: '14px',
    color: '#ffedbb',
  },
  statValue: {
    fontSize: '14px',
    color: '#ffedbb',
    fontWeight: '600',
  },
  progressSection: {
    width: '100%',
    marginTop: '12px',
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: `${gameColors.darkGreen}80`,
    borderRadius: '6px',
    border: `1px solid ${gameColors.accentGreen}40`,
    overflow: 'hidden',
    marginTop: '6px',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: gameColors.brightGreen,
    borderRadius: '6px',
    transition: 'width 0.3s ease',
    boxShadow: `inset 0 1px 2px rgba(255, 255, 255, 0.2)`,
  },
  // Big Five styles
  bigFiveContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  bigFiveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.darkGreen}40`,
      borderRadius: '4px',
    },
  },
  bigFiveRank: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    minWidth: '16px',
  },
  bigFiveCompact: {
    flex: 1,
    fontSize: '12px',
    color: '#ffedbb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bigFivePrefix: {
    color: gameColors.accentGreen,
    fontStyle: 'italic',
    fontSize: '11px',
  },
  bigFiveName: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bigFiveRewards: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: '60px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
  },
  loadingText: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    fontStyle: 'italic',
  },
  emptyContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
  },
  emptyText: {
    fontSize: '12px',
    color: gameColors.accentGreen,
    opacity: 0.7,
  },
}
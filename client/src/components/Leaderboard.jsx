import { useStatistics } from '@/contexts/Statistics';
import { gameColors } from '@/utils/themes';
import { Box, Typography } from '@mui/material';
import { useGameTokens } from '@/dojo/useGameTokens';
import { useEffect, useState } from 'react';
import { lookupAddresses } from '@cartridge/controller';
import { useStarkProfile } from '@starknet-react/core';

function Leaderboard() {
  const { beastsRegistered } = useStatistics()
  const { summit } = useGameStore()
  const { getBigFive } = useGameTokens()
  const [bigFive, setBigFive] = useState([])
  const [loadingBigFive, setLoadingBigFive] = useState(true)
  const [addressNames, setAddressNames] = useState({})

  useEffect(() => {
    const fetchBigFive = async () => {
      try {
        const data = await getBigFive()
        setBigFive(data)

        // Fetch names for all addresses
        if (data.length > 0) {
          const addresses = data.map(player => player.account_address.replace(/^0x0+/, "0x").toLowerCase());
          const addressMap = await lookupAddresses(addresses);

          const names = {};
          data.forEach(player => {
            const normalizedAddress = player.account_address.replace(/^0x0+/, "0x").toLowerCase();
            names[player.account_address] = addressMap.get(normalizedAddress) || null;
          });
          setAddressNames(names);
        }
      } catch (error) {
        console.error('Error fetching big five:', error)
      } finally {
        setLoadingBigFive(false)
      }
    }

    fetchBigFive()
  }, [summit?.beast?.token_id])

  const formatRewards = (rewards) => {
    // rewards is already a number from getBigFive
    return rewards.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Component to handle individual player display with StarkNet profile
  const PlayerRow = ({ player, index, cartridgeName }) => {
    const { data: profile } = useStarkProfile({ address: player.account_address })
    const displayName = cartridgeName || profile?.name?.replace('.stark', '') || formatAddress(player.account_address)

    return (
      <Box key={player.account_address} sx={styles.bigFiveRow}>
        <Typography sx={styles.bigFiveRank}>{index + 1}.</Typography>
        <Typography sx={styles.bigFiveCompact}>
          {displayName}
        </Typography>
        <Typography sx={styles.bigFiveRewards}>
          {formatRewards(player.total_rewards)}
        </Typography>
      </Box>
    )
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
            {bigFive.map((player, index) => (
              <PlayerRow
                key={player.account_address}
                player={player}
                index={index}
                cartridgeName={addressNames[player.account_address]}
              />
            ))}
          </Box>
        ) : (
          <Box sx={styles.emptyContainer}>
            <Typography sx={styles.emptyText}>No data available</Typography>
          </Box>
        )}

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
    width: '250px',
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
import { useStarknetApi } from '@/api/starknet';
import { useStatistics } from '@/contexts/Statistics';
import { useGameTokens } from '@/dojo/useGameTokens';
import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { addAddressPadding } from 'starknet';
import { lookupAddressNames } from '@/utils/addressNameCache';
import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

function Leaderboard() {
  const { beastsRegistered, beastsAlive } = useStatistics()
  const { summit, leaderboard, setLeaderboard } = useGameStore()
  const { getLeaderboard } = useGameTokens()
  const { getCurrentBlock } = useStarknetApi()
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [addressNames, setAddressNames] = useState({})
  const [currentBlock, setCurrentBlock] = useState(0)
  const [summitOwnerRank, setSummitOwnerRank] = useState(null)

  // Fetch current block every 5 seconds
  useEffect(() => {
    const fetchBlock = async () => {
      const block = await getCurrentBlock()
      setCurrentBlock(block)
    }

    fetchBlock()
    const interval = setInterval(fetchBlock, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard()
        setLeaderboard(data)

        // Fetch names only for top 5 and summit owner (with caching)
        const addressesToLookup = [];

        // Add top 5 leaderboard addresses
        data.slice(0, 5).forEach(player => {
          addressesToLookup.push(player.owner);
        });

        // Add summit owner if exists
        if (summit?.owner) {
          addressesToLookup.push(summit.owner);
        }

        if (addressesToLookup.length > 0) {
          // Use cached lookup function
          const addressMap = await lookupAddressNames(addressesToLookup);

          const names = {};
          // Map all names using original addresses as keys
          addressesToLookup.forEach(address => {
            const normalized = address.replace(/^0x0+/, "0x").toLowerCase();
            names[address] = addressMap.get(normalized) || null;
          });

          setAddressNames(names);
        }
      } catch (error) {
        console.error('Error fetching big five:', error)
      } finally {
        setLoadingLeaderboard(false)
      }
    }

    fetchLeaderboard()
  }, [summit?.beast?.token_id, summit?.owner])

  // Calculate summit owner's live score and rank
  useEffect(() => {
    if (!summit?.owner || !summit?.taken_at || !currentBlock || leaderboard.length === 0) {
      setSummitOwnerRank(null)
      return
    }

    // Calculate bonus points from blocks held (1 point per block)
    const blocksHeld = (currentBlock - summit.taken_at)

    // Find summit owner in leaderboard
    const player = leaderboard.find(player => addAddressPadding(player.owner) === addAddressPadding(summit.owner))
    const score = (player?.amount || 0) + (blocksHeld * (100 - summit.diplomacy_count))

    // Find summit owner's rank in the sorted list
    const liveRank = leaderboard.findIndex(p => p.amount < score) + 1

    setSummitOwnerRank({
      rank: liveRank || leaderboard.length + 1,
      score: score,
    })
  }, [summit, currentBlock, leaderboard])

  const formatRewards = (rewards) => {
    return rewards.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const PlayerRow = ({ player, index, cartridgeName }) => {
    const displayName = cartridgeName || 'Warlock'

    return (
      <Box key={player.owner} sx={styles.bigFiveRow}>
        <Typography sx={styles.bigFiveRank}>{index + 1}.</Typography>
        <Typography sx={styles.bigFiveCompact}>
          {displayName}
        </Typography>
        <Typography sx={styles.bigFiveRewards}>
          {formatRewards(player.amount)}
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
          Alpha
        </Typography>

        <Box sx={styles.sectionHeader}>
          <Typography sx={styles.sectionTitle}>
            THE BIG FIVE
          </Typography>
        </Box>

        {loadingLeaderboard ? (
          <Box sx={styles.loadingContainer}>
            <Typography sx={styles.loadingText}>Loading...</Typography>
          </Box>
        ) : leaderboard.length > 0 ? (
          <Box sx={styles.bigFiveContainer}>
            {leaderboard.slice(0, 5).map((player, index) => (
              <PlayerRow
                key={player.owner}
                player={player}
                index={index}
                cartridgeName={addressNames[player.owner]}
              />
            ))}


            {summitOwnerRank && summit?.owner && (
              <>
                <Box sx={styles.summitOwnerRow}>
                  <Typography sx={[
                    styles.bigFiveRank,
                  ]}>
                    {summitOwnerRank.rank}.
                  </Typography>
                  <Typography sx={styles.summitOwnerName}>
                    {addressNames[summit.owner] || 'Warlock'}
                  </Typography>
                  <Typography sx={styles.summitOwnerScore}>
                    {formatRewards(summitOwnerRank.score)}
                  </Typography>
                </Box>
              </>
            )}
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
            Beasts Playing
          </Typography>
          <Typography sx={styles.statValue}>
            {beastsRegistered}
          </Typography>
        </Box>

        {/* <Box sx={styles.statRow}>
          <Typography sx={styles.statLabel}>
            Beasts Alive
          </Typography>
          <Typography sx={styles.statValue}>
            {beastsAlive}
          </Typography>
        </Box> */}
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
    fontSize: '12px',
    color: '#ffedbb',
  },
  statValue: {
    fontSize: '12px',
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
  // Summit Owner styles
  summitOwnerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    mt: 0.5,
    background: `${gameColors.darkGreen}40`,
    borderRadius: '4px',
    border: `1px solid ${gameColors.yellow}40`,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${gameColors.darkGreen}60`,
    },
  },
  summitOwnerRank: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    minWidth: '24px',
    transition: 'all 0.3s ease',
  },
  summitOwnerRankTop5: {
    color: gameColors.yellow,
    textShadow: `0 0 8px ${gameColors.yellow}60`,
  },
  summitOwnerName: {
    flex: 1,
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  summitOwnerScore: {
    fontSize: '11px',
    color: gameColors.yellow,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: '60px',
  },
}
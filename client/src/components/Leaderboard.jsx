import { useSummitApi } from '@/api/summitApi';
import { START_TIMESTAMP, SUMMIT_DURATION_SECONDS, SUMMIT_REWARDS_PER_SECOND } from '@/contexts/GameDirector';
import { useStatistics } from '@/contexts/Statistics';
import { useGameStore } from '@/stores/gameStore';
import { lookupAddressNames } from '@/utils/addressNameCache';
import { gameColors } from '@/utils/themes';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, IconButton, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { addAddressPadding } from 'starknet';
import { DiplomacyPopover } from './DiplomacyPopover';
import RewardsRemainingBar from './RewardsRemainingBar';

function Leaderboard() {
  const { beastsRegistered, beastsAlive, fetchBeastCounts } = useStatistics()
  const { summit, leaderboard, setLeaderboard } = useGameStore()
  const { getLeaderboard } = useSummitApi()
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [addressNames, setAddressNames] = useState({})
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Math.floor(Date.now() / 1000))
  const [summitOwnerRank, setSummitOwnerRank] = useState(null)
  const [diplomacyAnchor, setDiplomacyAnchor] = useState(null)

  // Update current timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000))
    }, 1000)

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

        // Add diplomacy beast owners
        if (summit?.diplomacy?.beasts) {
          summit.diplomacy.beasts.forEach(beast => {
            if (beast.owner) addressesToLookup.push(beast.owner);
          });
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
  }, [summit?.beast?.token_id, summit?.owner, summit?.diplomacy?.beasts?.length])

  // Calculate summit owner's live score and rank
  useEffect(() => {
    if (!summit?.owner || !summit?.block_timestamp || !currentTimestamp || leaderboard.length === 0) {
      setSummitOwnerRank(null)
      return
    }

    // Calculate rewards from seconds held
    const secondsHeld = Math.max(0, currentTimestamp - summit.block_timestamp)
    const diplomacyCount = (summit?.diplomacy?.beasts.length || 0) - (summit.beast.diplomacy ? 1 : 0);
    const diplomacyRewardPerSecond = SUMMIT_REWARDS_PER_SECOND / 100;
    const diplomacyRewards = diplomacyRewardPerSecond * secondsHeld * diplomacyCount;

    // Find summit owner in leaderboard
    const player = leaderboard.find(player => addAddressPadding(player.owner) === addAddressPadding(summit.owner))
    const gainedSince = (secondsHeld * SUMMIT_REWARDS_PER_SECOND) - diplomacyRewards;
    const score = (player?.amount || 0) + gainedSince;

    // Find summit owner's rank in the sorted list
    const liveRank = leaderboard.findIndex(p => p.amount < score) + 1

    setSummitOwnerRank({
      rank: liveRank || leaderboard.length + 1,
      score: score,
      beforeAmount: player?.amount || 0,
      gainedSince: gainedSince,
      diplomacyCount: diplomacyCount,
    })
  }, [summit?.owner, summit?.beast?.token_id, summit?.block_timestamp, summit?.diplomacy, currentTimestamp, leaderboard])

  const formatRewards = (rewards) => {
    const n = Number(rewards ?? 0);
    const fractional = Math.abs(n % 1);
    const hasNonZeroDecimal = fractional > 1e-9;

    return n.toLocaleString(undefined, {
      minimumFractionDigits: hasNonZeroDecimal ? 1 : 0,
      maximumFractionDigits: 1,
    });
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
          SUMMIT ALPHA
        </Typography>

        <RewardsRemainingBar currentTimestamp={currentTimestamp} />

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
                    {formatRewards(summitOwnerRank.beforeAmount)} <span style={{ color: gameColors.brightGreen }}>+{formatRewards(summitOwnerRank.gainedSince)}</span>
                  </Typography>
                </Box>
                {summitOwnerRank.diplomacyCount > 0 && summit.diplomacy && (
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography
                      sx={[styles.summitOwnerSub, styles.diplomacyLink]}
                      onClick={(e) => setDiplomacyAnchor(e.currentTarget)}
                    >
                      <HandshakeIcon sx={{ fontSize: '12px', mr: 0.5 }} />
                      +{summitOwnerRank.diplomacyCount} Diplomacy
                    </Typography>
                    <DiplomacyPopover
                      anchorEl={diplomacyAnchor}
                      onClose={() => setDiplomacyAnchor(null)}
                      diplomacy={summit.diplomacy}
                      summitBeast={summit.beast}
                      leaderboard={leaderboard}
                      addressNames={addressNames}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        ) : (
          <Box sx={styles.emptyContainer}>
            <Typography sx={styles.emptyText}>No data available</Typography>
          </Box>
        )}

        <Box sx={[styles.sectionHeader, { pt: 0, position: 'relative' }]}>
          <Typography sx={styles.sectionTitle}>
            STATS
          </Typography>
          <IconButton
            aria-label="Refresh beasts alive"
            size="small"
            onClick={fetchBeastCounts}
            sx={styles.refreshButton}
          >
            <RefreshIcon sx={{ color: gameColors.accentGreen, fontSize: '16px' }} />
          </IconButton>
        </Box>

        <Box sx={styles.statRow}>
          <Typography sx={styles.statLabel}>
            Beasts Alive
          </Typography>
          <Typography sx={styles.statValue}>
            {beastsRegistered - beastsAlive} / {beastsRegistered}
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
    gap: '6px',
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
    gap: '6px',
  },
  refreshButton: {
    position: 'absolute',
    right: 0,
    top: '-5px'
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
  // Current Summit compact
  currentSummitCompact: {
    width: '100%',
    mb: 1,
  },
  currentSummitLine: {
    fontSize: '11px',
    color: '#ffedbb',
    lineHeight: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  // Current Summit section
  currentSummitContainer: {
    width: '100%',
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '8px',
    background: `${gameColors.darkGreen}30`,
    p: 1,
    mb: 1,
  },
  currentSummitHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    mb: 0.5,
  },
  currentSummitHolder: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chipRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '10px',
    color: gameColors.yellow,
    background: `${gameColors.yellow}10`,
    border: `1px solid ${gameColors.yellow}40`,
  },
  chipMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '10px',
    color: gameColors.accentGreen,
    background: `${gameColors.accentGreen}10`,
    border: `1px solid ${gameColors.accentGreen}30`,
  },
  chipDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: gameColors.yellow,
  },
  currentSummitMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 0.5,
  },
  metaLabel: {
    fontSize: '11px',
    color: gameColors.accentGreen,
  },
  metaValue: {
    fontSize: '11px',
    color: '#ffedbb',
    fontWeight: 600,
  },
  currentSummitStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '6px',
  },
  statCard: {
    border: `1px solid ${gameColors.accentGreen}30`,
    background: `${gameColors.darkGreen}40`,
    borderRadius: '6px',
    padding: '6px',
    textAlign: 'center',
  },
  statCardLabel: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    marginBottom: '2px',
  },
  statCardValue: {
    fontSize: '12px',
    color: '#ffedbb',
    fontWeight: 700,
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
  summitOwnerSub: {
    fontSize: '10px',
    color: gameColors.accentGreen,
    mr: '2px'
  },
  diplomacyLink: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      color: gameColors.yellow,
    },
  },
}
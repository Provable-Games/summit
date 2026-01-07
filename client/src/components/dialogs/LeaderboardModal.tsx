import { useGameStore } from '@/stores/gameStore';
import { gameColors } from '@/utils/themes';
import { lookupAddressNames } from '@/utils/addressNameCache';
import { useGameTokens } from '@/dojo/useGameTokens';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Dialog, IconButton, Pagination, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
  const { leaderboard } = useGameStore();
  const { getTopBeastsByBlocksHeld, countBeastsWithBlocksHeld } = useGameTokens();

  const [activeTab, setActiveTab] = useState<'players' | 'beasts'>('players');

  // Players tab state
  const [playersPage, setPlayersPage] = useState(1);
  const playersPageSize = 25;
  const [addressNames, setAddressNames] = useState<Record<string, string | null>>({});

  // Beasts tab state
  const [beastsPage, setBeastsPage] = useState(1);
  const beastsPageSize = 25;
  const [beasts, setBeasts] = useState<Array<{ token_id: number; blocks_held: number; bonus_xp: number; last_death_timestamp: number }>>([]);
  const [beastsLoading, setBeastsLoading] = useState(false);
  const [beastsTotal, setBeastsTotal] = useState<number | null>(null);

  const playersTotalPages = Math.max(1, Math.ceil(leaderboard.length / playersPageSize));

  const playerPagedItems = useMemo(() => {
    const start = (playersPage - 1) * playersPageSize;
    return leaderboard.slice(start, start + playersPageSize);
  }, [leaderboard, playersPage]);

  const beastsTotalPages = useMemo(() => {
    if (!beastsTotal || beastsTotal === 0) return 1;
    return Math.max(1, Math.ceil(beastsTotal / beastsPageSize));
  }, [beastsTotal, beastsPageSize]);

  useEffect(() => {
    const fetchNamesForPage = async () => {
      if (playerPagedItems.length === 0) return;

      const addressesToLookup = playerPagedItems
        .map((p) => p.owner)
        .filter((addr) => addressNames[addr] === undefined);

      if (addressesToLookup.length === 0) return;

      try {
        const addressMap = await lookupAddressNames(addressesToLookup);

        setAddressNames((prev) => {
          const updated = { ...prev };
          for (const addr of addressesToLookup) {
            const normalized = addr.replace(/^0x0+/, '0x').toLowerCase();
            updated[addr] = addressMap.get(normalized) || null;
          }
          return updated;
        });
      } catch (error) {
        console.error('Error fetching controller names for leaderboard page:', error);
      }
    };

    fetchNamesForPage();
  }, [playerPagedItems, addressNames]);

  useEffect(() => {
    const fetchBeastsTotal = async () => {
      const total = await countBeastsWithBlocksHeld();
      setBeastsTotal(total);
    };

    fetchBeastsTotal();
  }, []);

  // Fetch beasts leaderboard for current page
  useEffect(() => {
    const fetchBeastsPage = async () => {
      if (activeTab !== 'beasts') return;

      setBeastsLoading(true);
      try {
        const offset = (beastsPage - 1) * beastsPageSize;
        const data = await getTopBeastsByBlocksHeld(beastsPageSize, offset);
        setBeasts(data || []);
      } catch (error) {
        console.error('Error fetching beasts leaderboard page:', error);
        setBeasts([]);
      } finally {
        setBeastsLoading(false);
      }
    };

    fetchBeastsPage();
  }, [activeTab, beastsPage]);

  const formatRewards = (rewards: number) =>
    rewards.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClose = () => {
    setPlayersPage(1);
    setBeastsPage(1);
    setActiveTab('players');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}95`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `,
            width: { xs: '95vw', sm: '90vw', md: 800 },
            maxWidth: 800,
            maxHeight: { xs: '90vh', sm: '85vh', md: '80vh' },
            position: 'relative',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          },
        },
      }}
    >
      <Box sx={styles.container}>
        <IconButton onClick={handleClose} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        <Box sx={styles.header}>
          <EmojiEventsIcon sx={styles.icon} />
          <Typography sx={styles.title}>LEADERBOARD</Typography>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={styles.tabs}
          >
            <Tab
              value="players"
              label="Players"
              sx={styles.tab}
            />
            <Tab
              value="beasts"
              label="Beasts"
              sx={styles.tab}
            />
          </Tabs>
        </Box>

        {activeTab === 'players' && (
          <>
            <Box sx={styles.tableContainer}>
              <Box sx={styles.tableHeader}>
                <Typography sx={[styles.headerCell, { flex: '0 0 60px', textAlign: 'left' }]}>
                  #
                </Typography>
                <Typography sx={[styles.headerCell, { flex: '1 1 auto' }]}>
                  PLAYER
                </Typography>
                <Typography sx={[styles.headerCell, { flex: '0 0 140px', textAlign: 'right' }]}>
                  REWARDS
                </Typography>
              </Box>

              <Box sx={styles.tableBody}>
                {leaderboard.length === 0 && (
                  <Box sx={styles.emptyState}>
                    <Typography sx={styles.emptyText}>
                      No player leaderboard data yet. Play a bit and check back soon.
                    </Typography>
                  </Box>
                )}

                {leaderboard.length > 0 &&
                  playerPagedItems.map((player, index) => {
                    const globalRank = (playersPage - 1) * playersPageSize + index + 1;
                    const name = addressNames[player.owner];
                    return (
                      <Box
                        key={player.owner}
                        sx={styles.row}
                      >
                        <Typography sx={styles.rankCell}>
                          {globalRank}.
                        </Typography>
                        <Box sx={styles.playerCell}>
                          {name ? (
                            <>
                              <Typography sx={styles.playerName}>
                                {name}
                              </Typography>
                              <Typography
                                sx={styles.playerAddress}
                                component="a"
                                href={`https://voyager.online/contract/${player.owner}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {formatAddress(player.owner)}
                              </Typography>
                            </>
                          ) : (
                            <Typography
                              sx={styles.playerAddress}
                              component="a"
                              href={`https://voyager.online/contract/${player.owner}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {formatAddress(player.owner)}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={styles.rewardsCell}>
                          {formatRewards(player.amount)}
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            </Box>

            {leaderboard.length > 0 && (
              <Box sx={styles.footer}>
                <Typography sx={styles.paginationInfo}>
                  Showing{' '}
                  {Math.min((playersPage - 1) * playersPageSize + 1, leaderboard.length)}-
                  {Math.min(playersPage * playersPageSize, leaderboard.length)} of {leaderboard.length}
                </Typography>
                <Pagination
                  count={playersTotalPages}
                  page={playersPage}
                  onChange={(_, value) => setPlayersPage(value)}
                  color="primary"
                  siblingCount={1}
                  boundaryCount={1}
                  sx={styles.pagination}
                />
              </Box>
            )}
          </>
        )}

        {activeTab === 'beasts' && (
          <>
            <Box sx={styles.tableContainer}>
              <Box sx={styles.tableHeader}>
                <Typography sx={[styles.headerCell, { flex: '0 0 60px', textAlign: 'left' }]}>
                  #
                </Typography>
                <Typography sx={[styles.headerCell, { flex: '1 1 auto' }]}>
                  BEAST ID
                </Typography>
                <Typography sx={[styles.headerCell, { flex: '0 0 140px', textAlign: 'right' }]}>
                  BLOCKS HELD
                </Typography>
              </Box>

              <Box sx={styles.tableBody}>
                {beastsLoading && (
                  <Box sx={styles.emptyState}>
                    <Typography sx={styles.emptyText}>
                      Loading beasts leaderboard...
                    </Typography>
                  </Box>
                )}

                {!beastsLoading && beasts.length === 0 && (
                  <Box sx={styles.emptyState}>
                    <Typography sx={styles.emptyText}>
                      No beast leaderboard data yet.
                    </Typography>
                  </Box>
                )}

                {!beastsLoading &&
                  beasts.length > 0 &&
                  beasts.map((row, index) => {
                    const globalRank = (beastsPage - 1) * beastsPageSize + index + 1;
                    return (
                      <Box
                        key={`${row.token_id}-${index}`}
                        sx={styles.row}
                      >
                        <Typography sx={styles.rankCell}>
                          {globalRank}.
                        </Typography>
                        <Box sx={styles.beastCell}>
                          <Typography sx={styles.beastId}>
                            Beast #{row.token_id}
                          </Typography>
                        </Box>
                        <Typography sx={styles.blocksCell}>
                          {row.blocks_held?.toLocaleString() ?? '0'}
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            </Box>

            {beastsTotal !== null && beastsTotal > 0 && (
              <Box sx={styles.footer}>
                <Typography sx={styles.paginationInfo}>
                  Showing{' '}
                  {Math.min((beastsPage - 1) * beastsPageSize + 1, beastsTotal)}-
                  {Math.min(beastsPage * beastsPageSize, beastsTotal)} of {beastsTotal}
                </Typography>
                <Pagination
                  count={beastsTotalPages}
                  page={beastsPage}
                  onChange={(_, value) => setBeastsPage(value)}
                  color="primary"
                  siblingCount={1}
                  boundaryCount={1}
                  sx={styles.pagination}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    p: { xs: 1.5, sm: 2, md: 2.5 },
    pt: { xs: 1.5, sm: 2 },
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#999',
    zIndex: 10,
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    gap: 0.5,
    mb: 2,
  },
  icon: {
    fontSize: '40px',
    color: gameColors.yellow,
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.brightGreen}40
    `,
  },
  subtitle: {
    fontSize: '13px',
    color: '#ccc',
    maxWidth: '420px',
  },
  tabs: {
    mt: 1,
    minHeight: '32px',
    '& .MuiTabs-indicator': {
      backgroundColor: gameColors.yellow,
      height: '3px',
    },
  },
  tab: {
    minHeight: '32px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#999',
    '&.Mui-selected': {
      color: gameColors.yellow,
    },
  },
  tableContainer: {
    borderRadius: '10px',
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}60`,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: `${gameColors.darkGreen}90`,
    borderBottom: `1px solid ${gameColors.accentGreen}40`,
  },
  headerCell: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  tableBody: {
    maxHeight: { xs: '50vh', sm: '55vh', md: '60vh' },
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch',
    '&::-webkit-scrollbar': {
      width: { xs: 0, sm: '8px' },
    },
    '&::-webkit-scrollbar-track': {
      background: `${gameColors.darkGreen}40`,
    },
    '&::-webkit-scrollbar-thumb': {
      background: `${gameColors.accentGreen}60`,
      borderRadius: '4px',
      '&:hover': {
        background: `${gameColors.accentGreen}80`,
      },
    },
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderBottom: `1px solid ${gameColors.accentGreen}20`,
    transition: 'all 0.15s ease',
    '&:nth-of-type(odd)': {
      background: `${gameColors.darkGreen}40`,
    },
    '&:hover': {
      background: `${gameColors.darkGreen}80`,
    },
  },
  rankCell: {
    flex: '0 0 60px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
  },
  playerCell: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#ffedbb',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  playerAddress: {
    fontSize: '11px',
    color: '#bbb',
    fontFamily: 'monospace',
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline !important',
    },
  },
  rewardsCell: {
    flex: '0 0 140px',
    textAlign: 'right' as const,
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  beastCell: {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
  },
  beastId: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#ffedbb',
  },
  blocksCell: {
    flex: '0 0 140px',
    textAlign: 'right' as const,
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  xpCell: {
    flex: '0 0 120px',
    textAlign: 'right' as const,
    fontSize: '13px',
    fontWeight: 'bold',
    color: gameColors.yellow,
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '13px',
    color: '#bbb',
  },
  footer: {
    mt: 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  paginationInfo: {
    fontSize: '12px',
    color: '#bbb',
  },
  pagination: {
    '& .MuiPaginationItem-root': {
      color: '#fff',
    },
  },
};



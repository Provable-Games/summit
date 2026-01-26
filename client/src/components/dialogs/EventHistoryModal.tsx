import { useSummitApi, LogEntry } from '@/api/summitApi';
import { gameColors } from '@/utils/themes';
import { lookupAddressNames } from '@/utils/addressNameCache';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  FormControl,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useAccount } from '@starknet-react/core';
import { useCallback, useEffect, useState } from 'react';

interface EventHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 25;

// Category definitions with their sub-categories
const CATEGORIES: Record<string, string[]> = {
  'Battle': ['BattleEvent', 'Applied Poison', 'Summit Change', 'Applied Extra Life'],
  'Beast Upgrade': ['Spirit', 'Luck', 'Specials', 'Wisdom', 'Diplomacy', 'Bonus Health'],
  'Rewards': ['$SURVIVOR Earned', 'Claimed $SURVIVOR', 'Claimed Corpse', 'Claimed Skulls'],
  'Arriving to Summit': ['Claimed Potions'],
  'LS Events': ['EntityStats', 'CollectableEntity'],
};

const CATEGORY_COLORS: Record<string, string> = {
  'Battle': '#ff6b6b',
  'Beast Upgrade': '#4ecdc4',
  'Rewards': '#ffd93d',
  'Arriving to Summit': '#a8e6cf',
  'LS Events': '#c9b1ff',
};

export default function EventHistoryModal({ open, onClose }: EventHistoryModalProps) {
  const { address } = useAccount();
  const { getLogs } = useSummitApi();

  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [category, setCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addressNames, setAddressNames] = useState<Record<string, string | null>>({});

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params: Record<string, string | number | undefined> = {
        limit: PAGE_SIZE,
        offset,
      };

      if (category) params.category = category;
      if (subCategory) params.sub_category = subCategory;
      if (activeTab === 'mine' && address) params.player = address;

      const response = await getLogs(params);
      setEvents(response.data);
      setTotal(response.pagination.total);

      // Fetch player names for events
      const playerAddresses = response.data
        .map((event) => event.player)
        .filter((player): player is string => player !== null && addressNames[player] === undefined);

      const uniqueAddresses = [...new Set(playerAddresses)];
      if (uniqueAddresses.length > 0) {
        const addressMap = await lookupAddressNames(uniqueAddresses);
        setAddressNames((prev) => {
          const updated = { ...prev };
          for (const addr of uniqueAddresses) {
            const normalized = addr.replace(/^0x0+/, '0x').toLowerCase();
            updated[addr] = addressMap.get(normalized) || null;
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching event logs:', error);
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, category, subCategory, activeTab, address, addressNames]);

  // Fetch events when filters change
  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open, page, category, subCategory, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [category, subCategory, activeTab]);

  // Reset sub-category when category changes
  useEffect(() => {
    setSubCategory('');
  }, [category]);

  const handleClose = () => {
    setPage(1);
    setCategory('');
    setSubCategory('');
    setActiveTab('all');
    onClose();
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventSummary = (event: LogEntry): string => {
    const data = event.data;

    // Battle events
    if (event.category === 'Battle') {
      if (event.sub_category === 'BattleEvent') {
        const attackerName = data.attacker_name || `Beast #${data.attacker_token_id}`;
        const defenderName = data.defender_name || `Beast #${data.defender_token_id}`;
        const won = (data.attack_count as number || 0) + (data.critical_attack_count as number || 0) >
                   (data.counter_attack_count as number || 0) + (data.critical_counter_attack_count as number || 0);
        return `${attackerName} ${won ? 'defeated' : 'lost to'} ${defenderName}`;
      }
      if (event.sub_category === 'Applied Poison') {
        return `Applied ${data.count || 1} poison to Beast #${data.beast_token_id}`;
      }
      if (event.sub_category === 'Applied Extra Life') {
        return `Applied ${data.count || 1} extra life to Beast #${data.beast_token_id}`;
      }
      if (event.sub_category === 'Summit Change') {
        return `Summit changed to Beast #${data.token_id}`;
      }
    }

    // Beast Upgrade events
    if (event.category === 'Beast Upgrade') {
      const beastId = event.token_id || data.token_id;
      if (event.sub_category === 'Bonus Health') {
        return `Beast #${beastId} gained ${data.amount || data.bonus_health} bonus health`;
      }
      return `Beast #${beastId} upgraded ${event.sub_category}`;
    }

    // Rewards events
    if (event.category === 'Rewards') {
      if (event.sub_category === '$SURVIVOR Earned') {
        const amount = typeof data.amount === 'number' ? data.amount.toFixed(2) : data.amount;
        return `Earned ${amount} $SURVIVOR`;
      }
      if (event.sub_category === 'Claimed $SURVIVOR') {
        const amount = typeof data.amount === 'number' ? data.amount.toFixed(2) : data.amount;
        return `Claimed ${amount} $SURVIVOR`;
      }
      if (event.sub_category === 'Claimed Corpse') {
        return `Claimed ${data.count || 1} corpse token(s)`;
      }
      if (event.sub_category === 'Claimed Skulls') {
        return `Claimed ${data.count || 1} skull token(s)`;
      }
    }

    // Arriving to Summit events
    if (event.category === 'Arriving to Summit') {
      return `Beast #${event.token_id} claimed potions`;
    }

    // LS Events
    if (event.category === 'LS Events') {
      if (event.sub_category === 'EntityStats') {
        return `Beast stats updated`;
      }
      if (event.sub_category === 'CollectableEntity') {
        return `Collectable entity event`;
      }
    }

    return `${event.category}: ${event.sub_category}`;
  };

  const availableSubCategories = category ? CATEGORIES[category] || [] : [];

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
            height: { xs: '90vh', sm: '85vh', md: '80vh' },
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
        {/* Compact header toolbar */}
        <Box sx={styles.toolbar}>
          <Box sx={styles.toolbarLeft}>
            <HistoryIcon sx={styles.icon} />
            <Typography sx={styles.title}>EVENTS</Typography>
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              sx={styles.tabs}
            >
              <Tab value="all" label="All" sx={styles.tab} />
              <Tab
                value="mine"
                label="Mine"
                sx={styles.tab}
                disabled={!address}
              />
            </Tabs>
          </Box>

          <Box sx={styles.toolbarRight}>
            <FormControl size="small" sx={styles.filterControl}>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                displayEmpty
                sx={styles.select}
              >
                <MenuItem value="">All Categories</MenuItem>
                {Object.keys(CATEGORIES).map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {category && availableSubCategories.length > 0 && (
              <FormControl size="small" sx={styles.filterControl}>
                <Select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  displayEmpty
                  sx={styles.select}
                >
                  <MenuItem value="">All</MenuItem>
                  {availableSubCategories.map((sub) => (
                    <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <IconButton onClick={handleClose} sx={styles.closeButton}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={styles.tableContainer}>
          <Box sx={styles.tableHeader}>
            <Typography sx={[styles.headerCell, { flex: '0 0 100px' }]}>TIME</Typography>
            <Typography sx={[styles.headerCell, { flex: '0 0 120px' }]}>CATEGORY</Typography>
            <Typography sx={[styles.headerCell, { flex: '1 1 auto' }]}>EVENT</Typography>
            <Typography sx={[styles.headerCell, { flex: '0 0 120px', textAlign: 'right' }]}>PLAYER</Typography>
          </Box>

          <Box sx={styles.tableBody}>
            {loading ? (
              <Box sx={styles.loadingState}>
                <CircularProgress size={32} sx={{ color: gameColors.brightGreen }} />
              </Box>
            ) : events.length === 0 ? (
              <Box sx={styles.emptyState}>
                <Typography sx={styles.emptyText}>
                  {activeTab === 'mine' && !address
                    ? 'Connect your wallet to see your events'
                    : 'No events found matching your filters'}
                </Typography>
              </Box>
            ) : (
              events.map((event) => {
                const playerName = event.player ? addressNames[event.player] : null;
                const categoryColor = CATEGORY_COLORS[event.category] || gameColors.accentGreen;

                return (
                  <Box key={event.id} sx={styles.row}>
                    <Typography sx={styles.timeCell}>
                      {formatTimestamp(event.created_at)}
                    </Typography>
                    <Box sx={styles.categoryCell}>
                      <Chip
                        label={event.sub_category}
                        size="small"
                        sx={{
                          ...styles.categoryChip,
                          backgroundColor: `${categoryColor}30`,
                          borderColor: categoryColor,
                          color: categoryColor,
                        }}
                      />
                    </Box>
                    <Typography sx={styles.eventCell}>
                      {getEventSummary(event)}
                    </Typography>
                    <Box sx={styles.playerCell}>
                      {event.player && (
                        <Typography sx={styles.playerText}>
                          {playerName || formatAddress(event.player)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {total > 0 && (
          <Box sx={styles.footer}>
            <Typography sx={styles.paginationInfo}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}-
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              siblingCount={1}
              boundaryCount={1}
              sx={styles.pagination}
            />
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    p: { xs: 1.5, sm: 2 },
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    mb: 1.5,
    flexWrap: { xs: 'wrap', sm: 'nowrap' },
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    flexWrap: 'wrap',
  },
  closeButton: {
    color: '#999',
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  icon: {
    fontSize: '26px',
    color: gameColors.yellow,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
  },
  tabs: {
    minHeight: '36px',
    ml: 1,
    '& .MuiTabs-indicator': {
      backgroundColor: gameColors.yellow,
      height: '2px',
    },
  },
  tab: {
    minHeight: '36px',
    minWidth: 'auto',
    px: 2,
    py: 1,
    fontSize: '13px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#999',
    '&.Mui-selected': {
      color: gameColors.yellow,
    },
    '&.Mui-disabled': {
      color: '#555',
    },
  },
  filterControl: {
    minWidth: { xs: 120, sm: 150 },
  },
  select: {
    color: '#fff',
    fontSize: '13px',
    '& .MuiSelect-select': {
      py: 0.75,
      px: 1.5,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}60`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: gameColors.accentGreen,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: gameColors.brightGreen,
    },
    '& .MuiSelect-icon': {
      color: gameColors.accentGreen,
    },
  },
  tableContainer: {
    borderRadius: '10px',
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}60`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
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
    flex: 1,
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
    padding: '8px 12px',
    borderBottom: `1px solid ${gameColors.accentGreen}20`,
    transition: 'all 0.15s ease',
    '&:nth-of-type(odd)': {
      background: `${gameColors.darkGreen}40`,
    },
    '&:hover': {
      background: `${gameColors.darkGreen}80`,
    },
  },
  timeCell: {
    flex: '0 0 100px',
    fontSize: '11px',
    color: '#999',
    fontFamily: 'monospace',
  },
  categoryCell: {
    flex: '0 0 120px',
    display: 'flex',
    alignItems: 'center',
  },
  categoryChip: {
    fontSize: '10px',
    height: '22px',
    border: '1px solid',
    '& .MuiChip-label': {
      px: 1,
    },
  },
  eventCell: {
    flex: '1 1 auto',
    fontSize: '12px',
    color: '#ddd',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    px: 1,
  },
  playerCell: {
    flex: '0 0 120px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  playerText: {
    fontSize: '11px',
    color: '#bbb',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  loadingState: {
    padding: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: '32px',
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

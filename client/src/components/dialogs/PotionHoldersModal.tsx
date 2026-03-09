import type { ConsumablesHolder } from '@/api/summitApi';
import { useSummitApi } from '@/api/summitApi';
import { lookupAddressNames } from '@/utils/addressNameCache';
import { gameColors } from '@/utils/themes';
import attackPotionImg from '@/assets/images/attack-potion.png';
import lifePotionImg from '@/assets/images/life-potion.png';
import poisonPotionImg from '@/assets/images/poison-potion.png';
import revivePotionImg from '@/assets/images/revive-potion.png';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, IconButton, Pagination, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

export type PotionType = 'attack' | 'revive' | 'xlife' | 'poison';

interface PotionHoldersModalProps {
  open: boolean;
  onClose: () => void;
  potionType: PotionType | null;
}

const PAGE_SIZE = 25;

const POTION_CONFIG: Record<PotionType, { label: string; icon: string; field: keyof ConsumablesHolder }> = {
  attack: { label: 'ATTACK POTION', icon: attackPotionImg, field: 'attack_count' },
  revive: { label: 'REVIVE POTION', icon: revivePotionImg, field: 'revive_count' },
  xlife: { label: 'EXTRA LIFE POTION', icon: lifePotionImg, field: 'xlife_count' },
  poison: { label: 'POISON POTION', icon: poisonPotionImg, field: 'poison_count' },
};

export default function PotionHoldersModal({ open, onClose, potionType }: PotionHoldersModalProps) {
  const { getConsumablesHolders } = useSummitApi();

  const [holders, setHolders] = useState<ConsumablesHolder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [addressNames, setAddressNames] = useState<Record<string, string | null>>({});

  // Fetch holders once on first open
  useEffect(() => {
    if (open && holders === null && !loading) {
      setLoading(true);
      getConsumablesHolders()
        .then(setHolders)
        .catch((err) => {
          console.error('Error fetching consumables holders:', err);
          setHolders([]);
        })
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset page when potion type changes
  useEffect(() => {
    setPage(1);
  }, [potionType]);

  const config = potionType ? POTION_CONFIG[potionType] : null;

  // Filter and sort by selected potion type
  const sorted = useMemo(() => {
    if (!holders || !config) return [];
    return holders
      .filter((h) => (h[config.field] as number) > 0)
      .sort((a, b) => (b[config.field] as number) - (a[config.field] as number));
  }, [holders, config]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  // Resolve address names for current page
  useEffect(() => {
    if (pagedItems.length === 0) return;

    const addressesToLookup = pagedItems
      .map((h) => h.owner)
      .filter((addr) => addressNames[addr] === undefined);

    if (addressesToLookup.length === 0) return;

    lookupAddressNames(addressesToLookup)
      .then((addressMap) => {
        setAddressNames((prev) => {
          const updated = { ...prev };
          for (const addr of addressesToLookup) {
            const normalized = addr.replace(/^0x0+/, '0x').toLowerCase();
            updated[addr] = addressMap.get(normalized) || null;
          }
          return updated;
        });
      })
      .catch((error) => {
        console.error('Error fetching controller names:', error);
      });
  }, [pagedItems, addressNames]);

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClose = () => {
    setPage(1);
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
            width: { xs: '95vw', sm: '90vw', md: 500 },
            maxWidth: 500,
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
        <IconButton onClick={handleClose} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        <Box sx={styles.header}>
          {config && (
            <Box component="img" src={config.icon} sx={{ width: 36, height: 36, objectFit: 'contain' }} alt="" />
          )}
          <Typography sx={styles.title}>{config?.label ?? 'POTION'} HOLDERS</Typography>
        </Box>

        <Box sx={styles.tableContainer}>
          <Box sx={styles.tableHeader}>
            <Typography sx={[styles.headerCell, { flex: '0 0 50px', textAlign: 'left' }]}>#</Typography>
            <Typography sx={[styles.headerCell, { flex: '1 1 auto' }]}>PLAYER</Typography>
            <Typography sx={[styles.headerCell, { flex: '0 0 80px', textAlign: 'right' }]}>COUNT</Typography>
          </Box>

          <Box sx={styles.tableBody}>
            {loading ? (
              <Box sx={styles.emptyState}>
                <Typography sx={styles.emptyText}>Loading holders...</Typography>
              </Box>
            ) : sorted.length === 0 ? (
              <Box sx={styles.emptyState}>
                <Typography sx={styles.emptyText}>No holders found.</Typography>
              </Box>
            ) : (
              pagedItems.map((holder, index) => {
                const globalRank = (page - 1) * PAGE_SIZE + index + 1;
                const name = addressNames[holder.owner];
                const count = config ? (holder[config.field] as number) : 0;
                return (
                  <Box key={holder.owner} sx={styles.row}>
                    <Typography sx={styles.rankCell}>{globalRank}.</Typography>
                    <Box sx={styles.playerCell}>
                      {name ? (
                        <Typography sx={styles.playerName}>{name}</Typography>
                      ) : (
                        <Typography sx={styles.playerAddress}>{formatAddress(holder.owner)}</Typography>
                      )}
                    </Box>
                    <Typography sx={styles.countCell}>{count.toLocaleString()}</Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {sorted.length > 0 && (
          <Box sx={styles.footer}>
            <Typography sx={styles.paginationInfo}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}-
              {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
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
    position: 'relative' as const,
    color: '#fff',
    p: { xs: 1.5, sm: 2, md: 2.5 },
    pt: { xs: 1.5, sm: 2 },
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute' as const,
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
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.brightGreen}40
    `,
  },
  tableContainer: {
    borderRadius: '10px',
    border: `1px solid ${gameColors.accentGreen}40`,
    background: `${gameColors.darkGreen}60`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
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
    flex: '0 0 50px',
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
  },
  countCell: {
    flex: '0 0 80px',
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

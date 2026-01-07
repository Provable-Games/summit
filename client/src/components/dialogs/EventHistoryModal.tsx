import EventItem from '@/components/events/EventItems';
import { useEventHistory } from '@/dojo/useEventHistory';
import { gameColors } from '@/utils/themes';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, IconButton, Pagination, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

interface EventHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

type ActiveTab = 'battle' | 'other';

export default function EventHistoryModal({ open, onClose }: EventHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('other');

  const pageSize = 40; // Increased since events are very compact single-row items

  const queryParams = useMemo(() => {
    const offset = (page - 1) * pageSize;
    const eventTypes = activeTab === 'battle'
      ? ['battle'] as ("battle" | "poison" | "diplomacy" | "summit" | "reward")[]
      : ['poison', 'diplomacy', 'summit', 'reward'] as ("battle" | "poison" | "diplomacy" | "summit" | "reward")[];

    return {
      limit: pageSize,
      offset,
      eventTypes,
      enabled: open, // Only fetch when modal is open
    };
  }, [page, pageSize, activeTab, open]);

  const { events, playerNames, loading, hasMore, error } = useEventHistory(queryParams);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handleClose = () => {
    setPage(1);
    setActiveTab('other');
    onClose();
  };

  // Just use events directly since we're filtering by tab
  const filteredEvents = events;

  const totalPages = hasMore || page > 1 ? page + 1 : page;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            background: `${gameColors.darkGreen}`,
            backdropFilter: 'blur(12px) saturate(1.2)',
            border: `2px solid ${gameColors.accentGreen}60`,
            borderRadius: '12px',
            boxShadow: `
              0 8px 24px rgba(0, 0, 0, 0.6),
              0 0 16px ${gameColors.accentGreen}30
            `,
            width: { xs: '95vw', sm: '90vw', md: 700 },
            maxWidth: 700,
            maxHeight: { xs: '90vh', sm: '85vh', md: '80vh' },
            position: 'relative',
          },
        },
      }}
    >
      <Box sx={styles.container}>
        <IconButton onClick={handleClose} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        <Box sx={styles.header}>
          <Typography sx={styles.title}>EVENT LOG</Typography>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={styles.tabs}
          >
            <Tab
              value="other"
              label="Events"
              sx={styles.tab}
            />
            <Tab
              value="battle"
              label="Battle"
              sx={styles.tab}
            />
          </Tabs>
        </Box>

        {/* Events List */}
        <Box sx={styles.eventsContainer}>
          {loading && open && (
            <Box sx={styles.emptyState}>
              <Typography sx={styles.emptyText}>
                Loading events...
              </Typography>
            </Box>
          )}

          {error && !loading && (
            <Box sx={styles.emptyState}>
              <Typography sx={[styles.emptyText, { color: gameColors.red }]}>
                {error}
              </Typography>
            </Box>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <Box sx={styles.emptyState}>
              <Typography sx={styles.emptyText}>
                No events found matching your filters.
              </Typography>
            </Box>
          )}

          {!loading && filteredEvents.length > 0 && (
            <Box sx={styles.eventsList}>
              {filteredEvents.map((event, index) => {
                return <EventItem key={index} event={event} playerNames={playerNames} />;
              })}
            </Box>
          )}
        </Box>

        {/* Pagination */}
        {!loading && (
          <Box sx={styles.footer}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              siblingCount={1}
              boundaryCount={1}
              sx={styles.pagination}
              showFirstButton
              showLastButton={false}
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
    p: { xs: 1.5, sm: 2, md: 2.5 },
    pt: { xs: 1.5, sm: 2 },
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#999',
    zIndex: 10,
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
  eventsContainer: {
    maxHeight: { xs: '55vh', sm: '60vh', md: '65vh' },
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch',
    pr: 0.5,
    '&::-webkit-scrollbar': {
      width: { xs: 0, sm: '6px' },
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 3,
    },
  },
  eventsList: {
    // Render all items in DOM - no virtualization
    width: '100%',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '13px',
    color: '#bbb',
  },
  footer: {
    mt: 1.5,
    display: 'flex',
    justifyContent: 'center',
  },
  pagination: {
    '& .MuiPaginationItem-root': {
      color: '#fff',
    },
  },
};
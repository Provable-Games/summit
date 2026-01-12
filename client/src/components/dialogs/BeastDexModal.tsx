import { useGameStore } from '@/stores/gameStore';
import { Beast } from '@/types/game';
import { fetchBeastImage } from '@/utils/beasts';
import { gameColors } from '@/utils/themes';
import BarChartIcon from '@mui/icons-material/BarChart';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import EnergyIcon from '@mui/icons-material/ElectricBolt';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import StarIcon from '@mui/icons-material/Star';
import { Box, Dialog, FormControl, IconButton, InputBase, InputLabel, MenuItem, Pagination, Select, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import BeastUpgradeModal from './BeastUpgradeModal';

interface BeastDexModalProps {
  open: boolean;
  close: () => void;
}

type SortKey = 'power' | 'level' | 'health' | 'name';
type TypeKey = 'all' | 'Brute' | 'Hunter' | 'Magic';

export default function BeastDexModal(props: BeastDexModalProps) {
  const { open, close } = props;
  const { collection, summit } = useGameStore();

  const [prefixQuery, setPrefixQuery] = useState('');
  const [suffixQuery, setSuffixQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('power');
  const [typeFilter, setTypeFilter] = useState<TypeKey>('all');
  const [selectedBeast, setSelectedBeast] = useState<Beast | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const filtered = useMemo(() => {
    let list = collection.slice();

    if (prefixQuery.trim().length > 0) {
      const q = prefixQuery.trim().toLowerCase();
      list = list.filter(b => (b.prefix || '').toLowerCase().includes(q));
    }
    if (suffixQuery.trim().length > 0) {
      const q = suffixQuery.trim().toLowerCase();
      list = list.filter(b => (b.suffix || '').toLowerCase().includes(q));
    }
    if (nameQuery.trim().length > 0) {
      const q = nameQuery.trim().toLowerCase();
      list = list.filter(b =>
        (b.name || '').toLowerCase().includes(q)
        || (b.type || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(b => (b.type || '') === typeFilter);
    }
    switch (sortBy) {
      case 'power':
        list.sort((a, b) => b.power - a.power);
        break;
      case 'level':
        list.sort((a, b) => (b.current_level || 0) - (a.current_level || 0));
        break;
      case 'health':
        list.sort((a, b) => (b.health + b.bonus_health) - (a.health + a.bonus_health));
        break;
      case 'name':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      default:
        list.sort((a, b) => b.power - a.power);
        break;
    }
    // Always keep summit beast at the top if it's in the list
    if (summit?.beast?.token_id != null) {
      const summitTokenId = summit.beast.token_id;
      const index = list.findIndex(b => b.token_id === summitTokenId);
      if (index > 0) {
        const [summitBeast] = list.splice(index, 1);
        list.unshift(summitBeast);
      }
    }

    return list;
  }, [collection, prefixQuery, suffixQuery, nameQuery, sortBy, typeFilter, summit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [prefixQuery, suffixQuery, nameQuery, sortBy, typeFilter, collection.length]);

  const handleSelect = (beast: Beast) => {
    setSelectedBeast(beast);
  };

  const handleCloseUpgrade = () => {
    setSelectedBeast(null);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
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
            width: '900px',
            maxWidth: '96vw',
            maxHeight: '90vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }
        }
      }}
    >
      <Box sx={styles.container}>
        <IconButton onClick={close} sx={styles.closeButton}>
          <CloseIcon />
        </IconButton>

        <Box sx={styles.header}>
          <Typography sx={styles.title}>SELECT BEAST TO UPGRADE</Typography>
          <Box sx={styles.controlsRow}>
            <FormControl size="small" sx={styles.selectControl}>
              <InputLabel id="sort-select-label" sx={styles.inputLabel}>Sort by</InputLabel>
              <Select
                labelId="sort-select-label"
                id="sort-select"
                label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                sx={styles.sortSelect}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: `${gameColors.darkGreen}`,
                      border: `1px solid ${gameColors.accentGreen}40`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                      '& .MuiMenuItem-root': { color: '#fff' },
                    }
                  }
                }}
              >
                <MenuItem value="power">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FlashOnIcon sx={{ fontSize: '16px', color: gameColors.yellow, mr: 1 }} />
                    Power
                  </Box>
                </MenuItem>
                <MenuItem value="level">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon sx={{ fontSize: '16px', color: gameColors.accentGreen, mr: 1 }} />
                    Level
                  </Box>
                </MenuItem>
                <MenuItem value="health">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FavoriteIcon sx={{ fontSize: '16px', color: gameColors.red, mr: 1 }} />
                    Health
                  </Box>
                </MenuItem>
                <MenuItem value="name">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SortByAlphaIcon sx={{ fontSize: '16px', color: '#bbb', mr: 1 }} />
                    Name
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={styles.selectControl}>
              <InputLabel id="type-select-label" sx={styles.inputLabel}>Type</InputLabel>
              <Select
                labelId="type-select-label"
                id="type-select"
                label="Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeKey)}
                sx={styles.sortSelect}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: `${gameColors.darkGreen}`,
                      border: `1px solid ${gameColors.accentGreen}40`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.6)`,
                      '& .MuiMenuItem-root': { color: '#fff' },
                    }
                  }
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Brute">Brute</MenuItem>
                <MenuItem value="Hunter">Hunter</MenuItem>
                <MenuItem value="Magic">Magic</MenuItem>
              </Select>
            </FormControl>
            <Box sx={styles.input}>
              <SearchIcon sx={styles.inputIcon} />
              <InputBase
                placeholder="Name"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                sx={styles.inputField}
              />
            </Box>
            <Box sx={styles.input}>
              <SearchIcon sx={styles.inputIcon} />
              <InputBase
                placeholder="Prefix"
                value={prefixQuery}
                onChange={(e) => setPrefixQuery(e.target.value)}
                sx={styles.inputField}
              />
            </Box>
            <Box sx={styles.input}>
              <SearchIcon sx={styles.inputIcon} />
              <InputBase
                placeholder="Suffix"
                value={suffixQuery}
                onChange={(e) => setSuffixQuery(e.target.value)}
                sx={styles.inputField}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={styles.grid}>
          {pagedItems.map((beast) => {
            const MAX_BONUS_HEALTH = 1023;
            const bonusPctOnly = Math.min(100, Math.max(0, Math.round((beast.bonus_health * 100) / MAX_BONUS_HEALTH)));
            return (
              <Box
                key={beast.token_id}
                sx={styles.card}
                onClick={() => handleSelect(beast)}
              >
                <Box sx={styles.cardTop}>
                  <Box sx={styles.imageHolder}>
                    {summit?.beast?.token_id === beast.token_id && (
                      <Box sx={styles.ribbon}>
                        <Typography sx={styles.ribbonText}>SUMMIT</Typography>
                      </Box>
                    )}
                    <img src={fetchBeastImage(beast)} alt={beast.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                  </Box>
                  <Box sx={styles.nameArea}>
                    <Typography sx={styles.specialName}>"{beast.prefix} {beast.suffix}"</Typography>
                    <Typography sx={styles.beastName}>{beast.name}</Typography>

                    <Box sx={styles.badgesRow}>
                      <Box sx={[styles.abilityIcon, beast.stats?.specials ? styles.abilityIconOn : styles.abilityIconOff]}>
                        <StarIcon sx={{ fontSize: '18px', color: beast.stats?.specials ? '#ffd700' : '#888'}} />
                      </Box>
                      <Box sx={[styles.abilityIcon, beast.stats?.diplomacy ? styles.abilityIconOn : styles.abilityIconOff]}>
                        <HandshakeIcon sx={{ fontSize: '18px', color: beast.stats?.diplomacy ? '#a78bfa' : '#888'}} />
                      </Box>
                      <Box sx={[styles.abilityIcon, beast.stats?.wisdom ? styles.abilityIconOn : styles.abilityIconOff]}>
                        <PsychologyIcon sx={{ fontSize: '18px', color: beast.stats?.wisdom ? '#60a5fa' : '#888'}} />
                      </Box>
                    </Box>

                    <Box sx={styles.badgesRow}>
                      <Box sx={styles.pointChip}>
                        <CasinoIcon sx={{ fontSize: '18px', color: '#ff69b4' }} />
                        <Typography sx={styles.pointText}>{beast.stats?.luck || 0}</Typography>
                      </Box>
                      <Box sx={styles.pointChip}>
                        <EnergyIcon sx={{ fontSize: '18px', color: '#00ffff' }} />
                        <Typography sx={styles.pointText}>{beast.stats?.spirit || 0}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box sx={styles.statsRow}>
                  <Box sx={styles.statChip}>
                    <Typography sx={styles.statLabel}>Lvl</Typography>
                    <Typography sx={styles.statValue}>{beast.current_level}</Typography>
                  </Box>
                  <Box sx={styles.statChip}>
                    <FlashOnIcon sx={{ fontSize: '14px', color: gameColors.yellow }} />
                    <Typography sx={styles.statValue}>{beast.power}</Typography>
                  </Box>
                  <Box sx={styles.statChip}>
                    <FavoriteIcon sx={{ fontSize: '14px', color: gameColors.red }} />
                    <Typography sx={styles.statValue}>
                      {beast.health + beast.bonus_health}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={styles.bonusBarLabel}>Bonus Health</Typography>
                  <Box sx={styles.bonusBarContainer}>
                    <Box sx={styles.bonusBarTrack}>
                      <Box sx={[styles.bonusBarFill, { width: `${bonusPctOnly}%` }]} />
                      <Typography sx={styles.bonusBarOverlay}>{beast.bonus_health}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={styles.emptyBox}>
              <Typography sx={styles.emptyText}>No beasts match your filters</Typography>
            </Box>
          )}
        </Box>

        {/* Pagination Controls */}
        {
          filtered.length > 0 && (
            <Box sx={styles.paginationRow}>
              <Typography sx={styles.paginationInfo}>
                {Math.min((page - 1) * pageSize + 1, filtered.length)}-
                {Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </Typography>
              <Box sx={styles.paginationControls}>
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
            </Box>
          )
        }
      </Box>

      {selectedBeast && (
        <BeastUpgradeModal
          open={!!selectedBeast}
          beast={selectedBeast}
          close={handleCloseUpgrade}
        />
      )}
    </Dialog>
  );
}

const styles = {
  container: {
    position: 'relative',
    color: '#fff',
    p: 1.5,
    pt: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    color: '#999',
    zIndex: 10,
    '&:hover': {
      color: gameColors.red,
      background: 'rgba(255, 0, 0, 0.1)',
    },
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    mb: 1,
  },
  title: {
    fontSize: '18px',
    lineHeight: '24px',
    fontWeight: 'bold',
    color: gameColors.brightGreen,
    letterSpacing: '1.5px',
    textAlign: 'center',
    textShadow: `
      0 2px 4px rgba(0, 0, 0, 0.8),
      0 0 12px ${gameColors.brightGreen}40
    `,
  },
  controlsRow: {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '4px',
    px: 0.75,
    py: 0.25,
  },
  inputIcon: {
    fontSize: '16px',
    color: gameColors.accentGreen,
  },
  inputField: {
    color: '#fff',
    fontSize: '12px',
    width: '120px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 1,
    py: 0.5,
    borderRadius: '4px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}40`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}60`,
    },
  },
  toggleActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    border: `1px solid ${gameColors.brightGreen}80`,
  },
  toggleText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  sortSelect: {
    height: '30px',
    color: '#fff',
    background: `${gameColors.darkGreen}`,
    '& .MuiSelect-icon': {
      color: '#fff',
    },
    '& .MuiSelect-select': {
      padding: '4px 8px',
      fontSize: '12px',
      background: `${gameColors.darkGreen}`,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}40`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}60`,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: gameColors.brightGreen,
    },
  },
  selectControl: {
    minWidth: '150px',
  },
  inputLabel: {
    color: `${gameColors.accentGreen} !important`,
    '&.Mui-focused': {
      color: `${gameColors.brightGreen} !important`,
    },
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  selectLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    ml: '2px',
  },
  sortGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}70`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '6px',
    padding: '3px',
  },
  sortOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.25,
    padding: '4px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#ddd',
    '&:hover': {
      background: `${gameColors.darkGreen}90`,
    },
  },
  sortOptionActive: {
    background: `linear-gradient(135deg, ${gameColors.lightGreen} 0%, ${gameColors.mediumGreen} 100%)`,
    color: '#fff',
    boxShadow: `
      0 0 10px ${gameColors.brightGreen}40,
      inset 0 0 6px ${gameColors.brightGreen}30
    `,
  },
  sortOptionIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOptionText: {
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.3px',
    textTransform: 'capitalize',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 1,
    flex: 1,
    overflowY: 'auto',
    p: 0.5,
    minHeight: 0,
  },
  card: {
    position: 'relative',
    background: `${gameColors.darkGreen}60`,
    border: `1px solid ${gameColors.accentGreen}40`,
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0.75,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: `
      0 2px 6px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 ${gameColors.accentGreen}20
    `,
    '&:hover': {
      border: `1px solid ${gameColors.accentGreen}`,
      background: `${gameColors.darkGreen}80`,
      transform: 'translateY(-2px)',
      boxShadow: `
        0 6px 16px rgba(0,0,0,0.45),
        inset 0 1px 0 ${gameColors.accentGreen}30
      `,
    },
  },
  cardTop: {
    display: 'flex',
    gap: 0.75,
  },
  imageHolder: {
    width: '110px',
    height: '110px',
    borderRadius: '8px',
    background: '#000',
    border: `1px solid ${gameColors.accentGreen}30`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  },
  ribbon: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    background: gameColors.yellow,
    color: gameColors.darkGreen,
    borderRadius: '3px',
    padding: '0 6px',
    lineHeight: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  ribbonText: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.darkGreen,
    letterSpacing: '0.6px',
  },
  nameArea: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0.25,
    minWidth: 0,
  },
  badgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    marginTop: 0.5,
    flexWrap: 'wrap',
  },
  specialName: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    lineHeight: '1.1',
  },
  abilityIcon: {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}30`,
    background: `${gameColors.darkGreen}60`,
    color: '#bbb',
  },
  abilityIconOn: {
    border: `1px solid ${gameColors.brightGreen}80`,
  },
  abilityIconOff: {
    background: `${gameColors.darkGreen}60`,
    color: '#888',
  },
  pointChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    padding: '2px 4px',
    borderRadius: '4px',
    border: `1px solid ${gameColors.accentGreen}30`,
    background: `${gameColors.darkGreen}70`,
  },
  pointText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: '12px',
  },
  beastName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFD700',
    textTransform: 'capitalize',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 0.5,
  },
  statChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    borderRadius: '6px',
    minHeight: '26px',
    px: 0.5,
  },
  statLabel: {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  typeChip: {
    justifyContent: 'center',
  },
  bonusBarLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: gameColors.accentGreen,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  bonusBarContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  bonusBarTrack: {
    flex: 1,
    height: '8px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    position: 'relative',
  },
  bonusBarFill: {
    height: '100%',
    background: '#58b000',
  },
  bonusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    pointerEvents: 'none',
  },
  bonusBarText: {
    fontSize: '10px',
    color: '#ddd',
    letterSpacing: '0.4px',
  },
  abilityRow: {
    display: 'flex',
    gap: 0.5,
    flexWrap: 'wrap',
  },
  abilityPill: {
    fontSize: '10px',
    textAlign: 'center',
    borderRadius: '12px',
    padding: '2px 4px',
    border: `1px solid ${gameColors.accentGreen}30`,
    textTransform: 'uppercase',
  },
  abilityOn: {
    background: `${gameColors.mediumGreen}80`,
    color: '#fff',
    border: `1px solid ${gameColors.brightGreen}60`,
  },
  abilityOff: {
    background: `${gameColors.darkGreen}60`,
    color: '#bbb',
  },
  pointsPill: {
    fontSize: '10px',
    textAlign: 'center',
    borderRadius: '12px',
    padding: '2px 4px',
    background: `${gameColors.darkGreen}80`,
    border: `1px solid ${gameColors.accentGreen}30`,
    color: '#fff',
  },
  emptyBox: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    py: 4,
  },
  emptyText: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#bbb',
  },
  paginationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mt: 1,
    px: 0.5,
  },
  paginationInfo: {
    fontSize: '11px',
    color: '#bbb',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  pageSizeSelect: {
    height: '30px',
    color: '#fff',
    '& .MuiSelect-select': {
      padding: '4px 8px',
      fontSize: '12px',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}40`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: `${gameColors.accentGreen}60`,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: gameColors.brightGreen,
    },
  },
  pagination: {
    '& .MuiPaginationItem-root': {
      color: '#fff',
    },
  },
};


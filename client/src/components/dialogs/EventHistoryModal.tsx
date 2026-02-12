import { useSummitApi, LogEntry } from '@/api/summitApi';
import attackPotionIcon from '@/assets/images/attack-potion.png';
import corpseTokenIcon from '@/assets/images/corpse-token.png';
import killTokenIcon from '@/assets/images/kill-token.png';
import lifePotionIcon from '@/assets/images/life-potion.png';
import poisonPotionIcon from '@/assets/images/poison-potion.png';
import revivePotionIcon from '@/assets/images/revive-potion.png';
import swordIcon from '@/assets/images/sword.png';
import { gameColors } from '@/utils/themes';
import { lookupAddressNames } from '@/utils/addressNameCache';
import { BEAST_NAMES, ITEM_NAME_PREFIXES, ITEM_NAME_SUFFIXES } from '@/utils/BeastData';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HandshakeIcon from '@mui/icons-material/Handshake';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import HistoryIcon from '@mui/icons-material/History';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StarIcon from '@mui/icons-material/Star';

// Public images
const survivorTokenIcon = '/images/survivor_token.png';
import {
  Box,
  Checkbox,
  CircularProgress,
  Dialog,
  FormControl,
  IconButton,
  Link,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { useAccount } from '@starknet-react/core';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { REWARD_NAME } from '@/contexts/GameDirector';

interface EventHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 25;

// Category definitions with their sub-categories (order matters for display)
const CATEGORIES: Record<string, string[]> = {
  'Battle': ['BattleEvent', 'Applied Poison', 'Summit Change', 'Applied Extra Life'],
  'Beast Upgrade': ['Spirit', 'Luck', 'Specials', 'Wisdom', 'Diplomacy', 'Bonus Health'],
  'Rewards': ['$SURVIVOR Earned', 'Claimed $SURVIVOR', 'Claimed Corpses', 'Claimed Skulls'],
  'LS Events': ['EntityStats', 'CollectableEntity'],
};

const CATEGORY_COLORS: Record<string, string> = {
  'Battle': '#e07a5f',
  'Beast Upgrade': '#81b29a',
  'Rewards': '#f2cc8f',
  'LS Events': '#a8a4ce',
};

// Display names for sub-categories (API value -> Display name)
const SUB_CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'EntityStats': 'Adventurer Killed',
  'CollectableEntity': 'Beast Killed',
  '$SURVIVOR Earned': `${REWARD_NAME} Earned`,
  'Claimed $SURVIVOR': `Claimed ${REWARD_NAME}`,
};

// Sub-category specific icons
const getEventIcon = (category: string, subCategory: string): React.ReactNode => {
  const imgStyle = { width: 18, height: 18, objectFit: 'contain' as const };

  // Battle events
  if (category === 'Battle') {
    if (subCategory === 'BattleEvent') return <img src={swordIcon} alt="battle" style={imgStyle} />;
    if (subCategory === 'Applied Poison') return <img src={poisonPotionIcon} alt="poison" style={imgStyle} />;
    if (subCategory === 'Applied Extra Life') return <img src={lifePotionIcon} alt="life" style={imgStyle} />;
    if (subCategory === 'Summit Change') return <MilitaryTechIcon sx={{ fontSize: 18 }} />;
  }

  // Beast Upgrade events
  if (category === 'Beast Upgrade') {
    if (subCategory === 'Bonus Health') return <FavoriteIcon sx={{ fontSize: 18, color: '#e05050' }} />;
    if (subCategory === 'Luck') return <CasinoIcon sx={{ fontSize: 18, color: '#ff69b4' }} />;
    if (subCategory === 'Spirit') return <ElectricBoltIcon sx={{ fontSize: 18, color: '#00ffff' }} />;
    if (subCategory === 'Specials') return <StarIcon sx={{ fontSize: 18, color: '#ffd700' }} />;
    if (subCategory === 'Diplomacy') return <HandshakeIcon sx={{ fontSize: 18, color: '#a78bfa' }} />;
    if (subCategory === 'Wisdom') return <PsychologyIcon sx={{ fontSize: 18, color: '#60a5fa' }} />;
    return <img src={killTokenIcon} alt="upgrade" style={imgStyle} />;
  }

  // Rewards events
  if (category === 'Rewards') {
    if (subCategory === '$SURVIVOR Earned' || subCategory === 'Claimed $SURVIVOR') {
      return <img src={survivorTokenIcon} alt="survivor" style={imgStyle} />;
    }
    if (subCategory === 'Claimed Corpses') return <img src={corpseTokenIcon} alt="corpse" style={imgStyle} />;
    if (subCategory === 'Claimed Skulls') return <img src={killTokenIcon} alt="skull" style={imgStyle} />;
  }

  // LS Events
  if (category === 'LS Events') {
    if (subCategory === 'EntityStats') return <EmojiEventsIcon sx={{ fontSize: 18, color: '#ffd700' }} />;
    if (subCategory === 'CollectableEntity') return <HeartBrokenIcon sx={{ fontSize: 18, color: '#e05050' }} />;
  }

  return null;
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  let date: Date;

  // Handle Unix timestamps (numeric strings) - could be seconds or milliseconds
  const numericTimestamp = Number(timestamp);
  if (!isNaN(numericTimestamp) && /^\d+$/.test(timestamp)) {
    // If timestamp is small (< year 2100 in seconds), treat as seconds
    // Otherwise treat as milliseconds
    if (numericTimestamp < 4102444800) {
      date = new Date(numericTimestamp * 1000);
    } else {
      date = new Date(numericTimestamp);
    }
  } else {
    // ISO string - if no timezone indicator, assume UTC by appending 'Z'
    let normalizedTimestamp = timestamp;
    if (timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+') && !timestamp.includes('-', 10)) {
      normalizedTimestamp = timestamp + 'Z';
    }
    date = new Date(normalizedTimestamp);
  }

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'unknown';
  }

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return 'just now'; // Future dates show as just now
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

// Get all sub-categories as a flat array
const ALL_SUB_CATEGORIES = Object.values(CATEGORIES).flat();

// Map sub-category to its parent category
const SUB_CATEGORY_TO_CATEGORY: Record<string, string> = {};
for (const [cat, subs] of Object.entries(CATEGORIES)) {
  for (const sub of subs) {
    SUB_CATEGORY_TO_CATEGORY[sub] = cat;
  }
}

// Check if an event has a defined sub-category
const isDefinedEvent = (event: LogEntry): boolean => {
  return ALL_SUB_CATEGORIES.includes(event.sub_category);
};

const STORAGE_KEY = 'summit-event-filters';

// Load saved filters from localStorage
const loadSavedFilters = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that all saved values are still valid sub-categories
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => ALL_SUB_CATEGORIES.includes(s));
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

export default function EventHistoryModal({ open, onClose }: EventHistoryModalProps) {
  const { address } = useAccount();
  const { getLogs } = useSummitApi();
  const { liveEvents, clearLiveEvents } = useGameStore();

  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(loadSavedFilters);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addressNames, setAddressNames] = useState<Record<string, string | null>>({});
  const [seenLiveEventIds, setSeenLiveEventIds] = useState<Set<string>>(new Set());
  const prevLiveEventsLengthRef = useRef(0);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSubCategories));
  }, [selectedSubCategories]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filter live events based on current filters
  const filteredLiveEvents = useMemo(() => {
    // Only show live events on page 1
    if (page !== 1) return [];

    return liveEvents.filter((event) => {
      // Only show events with defined sub-categories
      if (!isDefinedEvent(event)) {
        return false;
      }
      // Filter by sub-category if any are selected
      if (selectedSubCategories.length > 0 && !selectedSubCategories.includes(event.sub_category)) {
        return false;
      }
      // Filter by player if "mine" tab is active
      if (activeTab === 'mine' && address) {
        const normalizedEventPlayer = event.player?.toLowerCase().replace(/^0x0+/, '0x');
        const normalizedAddress = address.toLowerCase().replace(/^0x0+/, '0x');
        if (normalizedEventPlayer !== normalizedAddress) {
          return false;
        }
      }
      return true;
    });
  }, [liveEvents, selectedSubCategories, activeTab, address, page]);

  // Merge live events with fetched events, deduplicating by ID and filtering undefined events
  const displayEvents = useMemo(() => {
    // Filter fetched events to only show defined sub-categories
    const filteredEvents = events.filter(isDefinedEvent);

    if (page !== 1 || filteredLiveEvents.length === 0) {
      return filteredEvents;
    }

    const fetchedIds = new Set(filteredEvents.map((e) => e.id));
    const newLiveEvents = filteredLiveEvents.filter((e) => !fetchedIds.has(e.id));

    return [...newLiveEvents, ...filteredEvents];
  }, [events, filteredLiveEvents, page]);

  // Track which events are "new" (arrived via WebSocket after modal opened)
  const newEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of filteredLiveEvents) {
      if (!seenLiveEventIds.has(event.id)) {
        ids.add(event.id);
      }
    }
    return ids;
  }, [filteredLiveEvents, seenLiveEventIds]);

  // Mark live events as seen after a short delay for animation
  useEffect(() => {
    if (newEventIds.size > 0 && open) {
      const timer = setTimeout(() => {
        setSeenLiveEventIds((prev) => {
          const updated = new Set(prev);
          newEventIds.forEach((id) => updated.add(id));
          return updated;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newEventIds, open]);

  // Fetch player names for live events
  useEffect(() => {
    if (!open || filteredLiveEvents.length === 0) return;

    const playerAddresses = filteredLiveEvents
      .map((event) => event.player)
      .filter((player): player is string => player !== null && addressNames[player] === undefined);

    const uniqueAddresses = [...new Set(playerAddresses)];
    if (uniqueAddresses.length > 0) {
      lookupAddressNames(uniqueAddresses).then((addressMap) => {
        setAddressNames((prev) => {
          const updated = { ...prev };
          for (const addr of uniqueAddresses) {
            const normalized = addr.replace(/^0x0+/, '0x').toLowerCase();
            updated[addr] = addressMap.get(normalized) || null;
          }
          return updated;
        });
      });
    }
  }, [filteredLiveEvents, addressNames, open]);

  // Reset seen events when modal closes
  useEffect(() => {
    if (!open) {
      setSeenLiveEventIds(new Set());
      prevLiveEventsLengthRef.current = liveEvents.length;
    }
  }, [open, liveEvents.length]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params: {
        limit: number;
        offset: number;
        sub_category?: string[];
        player?: string;
      } = {
        limit: PAGE_SIZE,
        offset,
      };

      if (selectedSubCategories.length > 0) {
        params.sub_category = selectedSubCategories;
      }
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
  }, [page, selectedSubCategories, activeTab, address, addressNames]);

  // Fetch events when filters change
  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open, page, selectedSubCategories, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedSubCategories, activeTab]);

  const handleClose = () => {
    setPage(1);
    // Keep filters - they're persisted in localStorage
    setActiveTab('all');
    onClose();
  };

  // Handle toggling a sub-category
  const handleSubCategoryToggle = (subCategory: string) => {
    setSelectedSubCategories((prev) => {
      if (prev.includes(subCategory)) {
        return prev.filter((s) => s !== subCategory);
      }
      return [...prev, subCategory];
    });
  };

  // Handle toggling all sub-categories in a category
  const handleCategoryToggle = (category: string) => {
    const categorySubs = CATEGORIES[category] || [];
    const allSelected = categorySubs.every((sub) => selectedSubCategories.includes(sub));

    setSelectedSubCategories((prev) => {
      if (allSelected) {
        // Deselect all in this category
        return prev.filter((sub) => !categorySubs.includes(sub));
      }
      // Select all in this category
      const newSubs = new Set([...prev, ...categorySubs]);
      return Array.from(newSubs);
    });
  };

  // Get checkbox state for a category (checked, unchecked, or indeterminate)
  const getCategoryCheckState = (category: string): 'checked' | 'unchecked' | 'indeterminate' => {
    const categorySubs = CATEGORIES[category] || [];
    const selectedCount = categorySubs.filter((sub) => selectedSubCategories.includes(sub)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === categorySubs.length) return 'checked';
    return 'indeterminate';
  };

  // Render the filter dropdown display value
  const renderFilterValue = () => {
    if (selectedSubCategories.length === 0) {
      return 'Filter Events';
    }
    // Count unique parent categories
    const uniqueCategories = new Set(
      selectedSubCategories.map((sub) => SUB_CATEGORY_TO_CATEGORY[sub])
    );
    const categoryCount = uniqueCategories.size;
    return `${categoryCount} ${categoryCount === 1 ? 'category' : 'categories'}`;
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getPlayerDisplay = (event: LogEntry): string => {
    if (!event.player) return '';
    const name = addressNames[event.player];
    const display = name || formatAddress(event.player);
    return display.toUpperCase();
  };

  const getEventSummary = (event: LogEntry): React.ReactNode => {
    const data = event.data;
    const player = getPlayerDisplay(event);

    // Battle events
    if (event.category === 'Battle') {
      if (event.sub_category === 'BattleEvent') {
        const damage = data.total_damage as number | undefined;
        const xpGained = data.xp_gained as number | undefined;
        const attackPotions = data.attack_potions as number | undefined;
        const revivePotions = data.revive_potions as number | undefined;
        const hasDetails = !!xpGained || !!attackPotions || !!revivePotions;
        const displayName = player || 'Unknown';
        const beastCount = data.beast_count as number | undefined;

        return (
          <Box>
            <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
              <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
              {beastCount && beastCount > 1 ? (
                <>
                  {' attacked summit with '}
                  <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{beastCount}</Box>
                  {' beasts for '}
                </>
              ) : (
                ' attacked summit for '
              )}
              <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{damage}</Box>
              {' damage'}
            </Typography>
            {hasDetails && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {!!xpGained && (
                  <Typography sx={{ fontSize: '10px', color: '#9e9e9e', fontWeight: 500 }}>
                    +{xpGained} XP
                  </Typography>
                )}
                {!!attackPotions && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '10px', color: '#9e9e9e' }}>{attackPotions}</Typography>
                    <img src={attackPotionIcon} alt="attack" style={{ width: 12, height: 12 }} />
                  </Box>
                )}
                {!!revivePotions && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '10px', color: '#9e9e9e' }}>{revivePotions}</Typography>
                    <img src={revivePotionIcon} alt="revive" style={{ width: 12, height: 12 }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      }
      if (event.sub_category === 'Applied Poison') {
        const displayName = player || 'Unknown';
        const count = (data.count as number) || 1;
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' applied '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{count}</Box>
            {' poison'}
          </Typography>
        );
      }
      if (event.sub_category === 'Applied Extra Life') {
        const displayName = player || 'Unknown';
        const count = (data.difference as number) || "";
        // Build full beast name
        const beastId = data.beast_id as number | undefined;
        const beastPrefix = data.prefix as number | undefined;
        const beastSuffix = data.suffix as number | undefined;
        const beastTypeName = beastId ? BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] : null;
        const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
        const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

        let beastName: string;
        if (prefixName && suffixName && beastTypeName) {
          beastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
        } else if (beastTypeName) {
          beastName = beastTypeName;
        } else {
          beastName = (data.beast_name as string) || (data.name as string) || `Beast #${data.token_id || event.token_id}`;
        }
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' applied '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{count}</Box>
            {' extra life to '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{beastName}</Box>
          </Typography>
        );
      }
      if (event.sub_category === 'Summit Change') {
        const displayName = player || 'Unknown';
        // Try to build full beast name from data
        const beastId = data.beast_id as number | undefined;
        const beastPrefix = data.prefix as number | undefined;
        const beastSuffix = data.suffix as number | undefined;
        const extraLives = data.extra_lives as number | undefined;
        const beastTypeName = beastId ? BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] : null;
        const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
        const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

        let beastName: string;
        if (prefixName && suffixName && beastTypeName) {
          beastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
        } else if (beastTypeName) {
          beastName = beastTypeName;
        } else {
          beastName = (data.beast_name as string) || (data.name as string) || `Beast #${data.token_id || event.token_id}`;
        }
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' took summit with '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{beastName}</Box>
            {!!extraLives && (
              <>
                {' with '}
                <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{extraLives}</Box>
                {' extra '}{extraLives === 1 ? 'life' : 'lives'}
              </>
            )}
          </Typography>
        );
      }
    }

    // Beast Upgrade events
    if (event.category === 'Beast Upgrade') {
      const displayName = player || 'Unknown';

      // Build full beast name
      const beastId = data.beast_id as number | undefined;
      const beastPrefix = data.prefix as number | undefined;
      const beastSuffix = data.suffix as number | undefined;
      const beastTypeName = beastId ? BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] : null;
      const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
      const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

      let fullBeastName: string;
      if (prefixName && suffixName && beastTypeName) {
        fullBeastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
      } else if (beastTypeName) {
        fullBeastName = beastTypeName;
      } else {
        fullBeastName = `Beast #${data.token_id || event.token_id}`;
      }

      // Get old and new values for showing difference
      const oldValue = data.old_value as number | undefined;
      const newValue = data.new_value as number | undefined;
      const hasDiff = oldValue !== undefined && newValue !== undefined;
      const diff = hasDiff ? newValue - oldValue : null;

      if (event.sub_category === 'Bonus Health') {
        const amount = (data.amount as number) || (data.bonus_health as number) || diff;
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' upgraded '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{fullBeastName}</Box>
            {' with '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>+{amount}</Box>
            {' bonus health'}
            {hasDiff && (
              <Box component="span" sx={{ color: '#888' }}>{` (${oldValue} → ${newValue})`}</Box>
            )}
          </Typography>
        );
      }
      // Boolean upgrades don't show numbers
      const isBooleanUpgrade = ['Wisdom', 'Specials', 'Diplomacy'].includes(event.sub_category);
      // Numeric upgrades like Luck and Spirit show +diff
      const isNumericUpgrade = ['Luck', 'Spirit'].includes(event.sub_category);

      // Special format for boolean upgrades
      if (isBooleanUpgrade) {
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' Unlocked '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{event.sub_category}</Box>
            {' ability for '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{fullBeastName}</Box>
          </Typography>
        );
      }

      return (
        <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
          <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
          {' upgraded '}
          <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{fullBeastName}</Box>
          {' with '}
          {isNumericUpgrade && diff !== null && (
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>+{Math.min(100, diff)} </Box>
          )}
          <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{event.sub_category}</Box>
          {hasDiff && !isBooleanUpgrade && (
            <Box component="span" sx={{ color: '#888' }}>{` (${Math.min(100, oldValue)} → ${Math.min(100, newValue)})`}</Box>
          )}
        </Typography>
      );
    }

    // Rewards events
    if (event.category === 'Rewards') {
      const displayName = player || 'Unknown';
      if (event.sub_category === '$SURVIVOR Earned') {
        const rawAmount = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)) || 0;
        const amount = parseFloat((rawAmount / 100000).toFixed(3));
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' earned '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{amount}</Box>
            {` ${REWARD_NAME}`}
          </Typography>
        );
      }
      if (event.sub_category === 'Claimed $SURVIVOR') {
        const rawAmount = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)) || 0;
        const amount = parseFloat((rawAmount / 100000).toFixed(3));
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' claimed '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{amount}</Box>
            {` ${REWARD_NAME}`}
          </Typography>
        );
      }
      if (event.sub_category === 'Claimed Corpses') {
        const corpseAmount = (data.corpse_amount as number) || 1;
        const adventurerCount = (data.adventurer_count as number) || 1;
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' claimed '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{corpseAmount}</Box>
            {' CORPSE from '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{adventurerCount}</Box>
            {adventurerCount === 1 ? ' adventurer' : ' adventurers'}
          </Typography>
        );
      }
      if (event.sub_category === 'Claimed Skulls') {
        const skullsClaimed = data.skulls_claimed
          ? (typeof data.skulls_claimed === 'string' ? parseInt(data.skulls_claimed, 10) : (data.skulls_claimed as number))
          : 1;
        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}</Box>
            {' claimed '}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{skullsClaimed}</Box>
            {skullsClaimed === 1 ? ' skull token' : ' skull tokens'}
          </Typography>
        );
      }
    }

    // LS Events
    if (event.category === 'LS Events') {
      if (event.sub_category === 'EntityStats') {
        const displayName = player || 'Unknown';
        // Build full beast name
        const beastId = data.beast_id as number | undefined;
        const beastPrefix = data.prefix as number | undefined;
        const beastSuffix = data.suffix as number | undefined;
        const beastTypeName = beastId ? BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] : null;
        const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
        const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

        let beastName: string;
        if (prefixName && suffixName && beastTypeName) {
          beastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
        } else if (beastTypeName) {
          beastName = beastTypeName;
        } else {
          beastName = (data.beast_name as string) || (data.name as string) || `Beast #${data.token_id || event.token_id}`;
        }

        return (
          <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
            <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}'s</Box>
            {" "}
            <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{beastName}</Box>
            {' killed an adventurer'}
          </Typography>
        );
      }
      if (event.sub_category === 'CollectableEntity') {
        const displayName = player || 'Unknown';
        // Build full beast name
        const beastId = data.beast_id as number | undefined;
        const beastPrefix = data.prefix as number | undefined;
        const beastSuffix = data.suffix as number | undefined;
        const killedBy = data.last_killed_by as number | undefined;
        const beastTypeName = beastId ? BEAST_NAMES[beastId as keyof typeof BEAST_NAMES] : null;
        const prefixName = beastPrefix ? ITEM_NAME_PREFIXES[beastPrefix as keyof typeof ITEM_NAME_PREFIXES] : null;
        const suffixName = beastSuffix ? ITEM_NAME_SUFFIXES[beastSuffix as keyof typeof ITEM_NAME_SUFFIXES] : null;

        let beastName: string;
        if (prefixName && suffixName && beastTypeName) {
          beastName = `"${prefixName} ${suffixName}" ${beastTypeName}`;
        } else if (beastTypeName) {
          beastName = beastTypeName;
        } else {
          beastName = (data.beast_name as string) || (data.name as string) || `Beast #${data.token_id || event.token_id}`;
        }

        const watchUrl = killedBy && prefixName && suffixName && beastTypeName
          ? `https://lootsurvivor.io/survivor/watch?id=${killedBy}&beast=${encodeURIComponent(`${prefixName}_${suffixName}_${beastTypeName}`)}`
          : null;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
              <Box component="span" sx={{ color: gameColors.brightGreen }}>{displayName}'s</Box>
              {" "}
              <Box component="span" sx={{ color: gameColors.yellow, fontWeight: 600 }}>{beastName}</Box>
              {' has been killed in LS2'}
            </Typography>
            {watchUrl && (
              <Link
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  px: '6px',
                  py: '1px',
                  borderRadius: '999px',
                  border: `1px solid ${gameColors.brightGreen}`,
                  fontSize: '10px',
                  color: gameColors.brightGreen,
                  textDecoration: 'none',
                  '&:hover': {
                    background: `${gameColors.brightGreen}20`,
                  },
                }}
              >
                Watch
              </Link>
            )}
          </Box>
        );
      }
    }

    return (
      <Typography sx={{ fontSize: '12px', color: '#e0e0e0', fontWeight: 500 }}>
        {event.category}: {SUB_CATEGORY_DISPLAY_NAMES[event.sub_category] || event.sub_category}
      </Typography>
    );
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
                multiple
                value={selectedSubCategories}
                onChange={() => { }}
                displayEmpty
                renderValue={renderFilterValue}
                sx={styles.select}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                      background: `${gameColors.darkGreen}f5`,
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${gameColors.accentGreen}60`,
                      '& .MuiMenuItem-root': {
                        py: 0.5,
                        px: 1,
                      },
                    },
                  },
                }}
              >
                {Object.entries(CATEGORIES).map(([cat, subs]) => {
                  const checkState = getCategoryCheckState(cat);
                  const categoryColor = CATEGORY_COLORS[cat] || gameColors.accentGreen;
                  const isSingleItem = subs.length === 1;

                  return [
                    <MenuItem
                      key={cat}
                      onClick={(e) => {
                        e.preventDefault();
                        handleCategoryToggle(cat);
                      }}
                      sx={{
                        '&:hover': { background: `${gameColors.accentGreen}20` },
                      }}
                    >
                      <Checkbox
                        checked={checkState === 'checked'}
                        indeterminate={checkState === 'indeterminate'}
                        icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />}
                        checkedIcon={<CheckBoxIcon sx={{ fontSize: 18 }} />}
                        indeterminateIcon={<IndeterminateCheckBoxIcon sx={{ fontSize: 18 }} />}
                        sx={{
                          color: categoryColor,
                          '&.Mui-checked': { color: categoryColor },
                          '&.MuiCheckbox-indeterminate': { color: categoryColor },
                          p: 0.5,
                          mr: 1,
                        }}
                      />
                      <ListItemText
                        primary={cat}
                        primaryTypographyProps={{
                          sx: {
                            fontWeight: 'bold',
                            fontSize: '13px',
                            color: categoryColor,
                          },
                        }}
                      />
                      {!isSingleItem && (
                        <Typography
                          sx={{
                            fontSize: '11px',
                            color: '#888',
                            ml: 1,
                          }}
                        >
                          ({subs.filter((s) => selectedSubCategories.includes(s)).length}/{subs.length})
                        </Typography>
                      )}
                    </MenuItem>,
                    // Only show sub-categories if there's more than one
                    ...(isSingleItem ? [] : subs.map((sub) => {
                      const isSelected = selectedSubCategories.includes(sub);
                      const icon = getEventIcon(cat, sub);

                      return (
                        <MenuItem
                          key={sub}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSubCategoryToggle(sub);
                          }}
                          sx={{
                            pl: 4,
                            '&:hover': { background: `${gameColors.accentGreen}20` },
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 16 }} />}
                            checkedIcon={<CheckBoxIcon sx={{ fontSize: 16 }} />}
                            sx={{
                              color: '#888',
                              '&.Mui-checked': { color: gameColors.brightGreen },
                              p: 0.5,
                              mr: 1,
                            }}
                          />
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: categoryColor,
                              mr: 1,
                              opacity: 0.8,
                            }}
                          >
                            {icon}
                          </Box>
                          <ListItemText
                            primary={SUB_CATEGORY_DISPLAY_NAMES[sub] || sub}
                            primaryTypographyProps={{
                              sx: {
                                fontSize: '12px',
                                color: isSelected ? '#fff' : '#bbb',
                              },
                            }}
                          />
                        </MenuItem>
                      );
                    })),
                  ];
                })}
              </Select>
            </FormControl>

            <IconButton onClick={handleClose} sx={styles.closeButton}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={styles.tableContainer}>
          <Box sx={styles.tableHeader}>
            <Typography sx={[styles.headerCell, { flex: '0 0 70px' }]}>TIME</Typography>
            <Typography sx={[styles.headerCell, { flex: '0 0 40px', textAlign: 'center' }]}></Typography>
            <Typography sx={[styles.headerCell, { flex: '1 1 auto' }]}>EVENT</Typography>
          </Box>

          <Box sx={styles.tableBody}>
            {loading ? (
              <Box sx={styles.loadingState}>
                <CircularProgress size={32} sx={{ color: gameColors.brightGreen }} />
              </Box>
            ) : displayEvents.length === 0 ? (
              <Box sx={styles.emptyState}>
                <Typography sx={styles.emptyText}>
                  {activeTab === 'mine' && !address
                    ? 'Connect your wallet to see your events'
                    : 'No events found matching your filters'}
                </Typography>
              </Box>
            ) : (
              displayEvents.map((event) => {
                const categoryColor = CATEGORY_COLORS[event.category] || gameColors.accentGreen;
                const eventIcon = getEventIcon(event.category, event.sub_category);
                const isNew = newEventIds.has(event.id);

                return (
                  <Box
                    key={event.id}
                    sx={[
                      styles.row,
                      isNew && styles.newRow,
                    ]}
                  >
                    <Typography sx={styles.timeCell}>
                      {formatTimeAgo(event.created_at)}
                    </Typography>
                    <Box sx={styles.categoryCell}>
                      <Tooltip title={SUB_CATEGORY_DISPLAY_NAMES[event.sub_category] || event.sub_category} placement="top" arrow>
                        <Box sx={{ color: categoryColor, display: 'flex', alignItems: 'center' }}>
                          {eventIcon}
                        </Box>
                      </Tooltip>
                    </Box>
                    <Box sx={styles.eventCell}>
                      {getEventSummary(event)}
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
    minWidth: { xs: 140, sm: 180 },
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
  newRow: {
    animation: 'pulse-highlight 2s ease-out',
    '@keyframes pulse-highlight': {
      '0%': {
        background: `${gameColors.brightGreen}30`,
        boxShadow: `inset 0 0 8px ${gameColors.brightGreen}40`,
      },
      '100%': {
        background: 'transparent',
        boxShadow: 'none',
      },
    },
  },
  timeCell: {
    flex: '0 0 70px',
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace',
  },
  categoryCell: {
    flex: '0 0 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCell: {
    flex: '1 1 auto',
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    pl: 1,
    minWidth: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontWeight: 500,
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

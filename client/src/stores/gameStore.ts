import { create } from 'zustand';
import { Summit, Beast, Adventurer, BattleEvent, SpectatorBattleEvent, Leaderboard, PoisonEvent, selection } from '@/types/game';
import { LogEntry } from '@/api/summitApi';

export type SortMethod = 'recommended' | 'power' | 'attack' | 'health' | 'seconds held';
export type BeastTypeFilter = 'all' | 'strong';

const MAX_LIVE_EVENTS = 100;

export type NotificationType =
  // Battle events
  | 'battle' | 'poison' | 'summit_change' | 'extra_life'
  // Beast upgrades
  | 'specials' | 'wisdom' | 'diplomacy' | 'spirit' | 'luck' | 'bonus_health'
  // Rewards
  | 'survivor_earned' | 'claimed_survivor' | 'claimed_corpses' | 'claimed_skulls'
  // LS Events
  | 'kill' | 'locked';

export interface GameNotification {
  id: string;
  type: NotificationType;
  value?: number | string;
  playerName?: string;
  beastName?: string;
  beastImageSrc?: string;
}

interface GameState {
  summit: Summit | null;
  summitEnded: boolean;
  leaderboard: Leaderboard[];
  battleEvents: BattleEvent[];
  spectatorBattleEvents: SpectatorBattleEvent[];
  poisonEvent: PoisonEvent | null;
  killedByAdventurers: number[];
  collection: Beast[];
  collectionSyncing: boolean;
  loadingCollection: boolean;
  attackInProgress: boolean;
  applyingPotions: boolean;
  selectedBeasts: selection;
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPoisonCount: number;
  appliedExtraLifePotions: number;
  attackMode: 'safe' | 'unsafe' | 'autopilot';
  autopilotEnabled: boolean;
  autopilotLog: string;
  liveEvents: LogEntry[];
  gameNotifications: GameNotification[];

  // Beast Collection Filters
  hideDeadBeasts: boolean;
  hideTop5000: boolean;
  sortMethod: SortMethod;
  typeFilter: BeastTypeFilter;
  nameMatchFilter: boolean;

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) => void;
  setSummitEnded: (summitEnded: boolean) => void;
  setLeaderboard: (leaderboard: Leaderboard[]) => void;
  setBattleEvents: (battleEvents: BattleEvent[]) => void;
  setSpectatorBattleEvents: (spectatorBattleEvents: SpectatorBattleEvent[] | ((prev: SpectatorBattleEvent[]) => SpectatorBattleEvent[])) => void;
  setPoisonEvent: (poisonEvent: PoisonEvent | null) => void;
  setKilledByAdventurers: (killedByAdventurers: number[]) => void;
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => void;
  setLoadingCollection: (loadingCollection: boolean) => void;
  setCollectionSyncing: (collectionSyncing: boolean) => void;
  setAttackInProgress: (attackInProgress: boolean) => void;
  setApplyingPotions: (applyingPotions: boolean) => void;
  setSelectedBeasts: (selectedBeasts: selection | ((prev: selection) => selection)) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPoisonCount: (appliedPoisonCount: number) => void;
  setAppliedExtraLifePotions: (appliedExtraLifePotions: number) => void;
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'autopilot') => void;
  setAutopilotEnabled: (autopilotEnabled: boolean) => void;
  setAutopilotLog: (autopilotLog: string) => void;
  addLiveEvent: (event: LogEntry) => void;
  clearLiveEvents: () => void;
  addGameNotification: (notification: Omit<GameNotification, 'id'>) => void;
  removeGameNotification: (id: string) => void;

  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => void;
  setHideTop5000: (hideTop5000: boolean) => void;
  setSortMethod: (sortMethod: SortMethod) => void;
  setTypeFilter: (typeFilter: BeastTypeFilter) => void;
  setNameMatchFilter: (nameMatchFilter: boolean) => void;

  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  summitEnded: false,
  leaderboard: [],
  battleEvents: [],
  spectatorBattleEvents: [],
  poisonEvent: null,
  killedByAdventurers: [],
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  collectionSyncing: false,
  attackInProgress: false,
  applyingPotions: false,
  selectedBeasts: [],
  selectedAdventurers: [],
  appliedPoisonCount: 0,
  appliedExtraLifePotions: 0,
  attackMode: 'unsafe',
  autopilotEnabled: false,
  autopilotLog: '',
  liveEvents: [],
  gameNotifications: [],

  // Beast Collection Filters - Default Values
  hideDeadBeasts: false,
  hideTop5000: false,
  sortMethod: (() => {
    const saved = localStorage.getItem('beastSortMethod');
    return (saved as SortMethod) || 'recommended';
  })(),
  typeFilter: 'all',
  nameMatchFilter: false,

  disconnect: () => {
    set({
      battleEvents: [],
      spectatorBattleEvents: [],
      poisonEvent: null,
      killedByAdventurers: [],
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      collectionSyncing: false,
      attackInProgress: false,
      applyingPotions: false,
      selectedBeasts: [],
      selectedAdventurers: [],
      appliedExtraLifePotions: 0,
      appliedPoisonCount: 0,
      attackMode: 'unsafe',
      autopilotEnabled: false,
      liveEvents: [],
      gameNotifications: [],
      // Reset filters to defaults
      hideDeadBeasts: false,
      typeFilter: 'all',
      nameMatchFilter: false,
      autopilotLog: ''
    });
  },

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) =>
    set(state => ({ summit: typeof summit === 'function' ? summit(state.summit) : summit })),
  setSummitEnded: (summitEnded: boolean) => set({ summitEnded }),
  setLeaderboard: (leaderboard: Leaderboard[]) => set({ leaderboard }),
  setBattleEvents: (battleEvents: BattleEvent[]) => set({ battleEvents }),
  setSpectatorBattleEvents: (spectatorBattleEvents: SpectatorBattleEvent[] | ((prev: SpectatorBattleEvent[]) => SpectatorBattleEvent[])) =>
    set(state => ({ spectatorBattleEvents: typeof spectatorBattleEvents === 'function' ? spectatorBattleEvents(state.spectatorBattleEvents) : spectatorBattleEvents })),
  setPoisonEvent: (poisonEvent: PoisonEvent | null) => set({ poisonEvent }),
  setKilledByAdventurers: (killedByAdventurers: number[]) => set({ killedByAdventurers }),
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ collection: typeof collection === 'function' ? collection(state.collection) : collection })),
  setLoadingCollection: (loadingCollection: boolean) => set({ loadingCollection }),
  setCollectionSyncing: (collectionSyncing: boolean) => set({ collectionSyncing }),
  setAttackInProgress: (attackInProgress: boolean) => set({ attackInProgress }),
  setApplyingPotions: (applyingPotions: boolean) => set({ applyingPotions }),
  setSelectedBeasts: (selectedBeasts: selection | ((prev: selection) => selection)) =>
    set(state => ({ selectedBeasts: typeof selectedBeasts === 'function' ? selectedBeasts(state.selectedBeasts) : selectedBeasts })),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPoisonCount: (appliedPoisonCount: number) => set({ appliedPoisonCount }),
  setAppliedExtraLifePotions: (appliedExtraLifePotions: number) => set({ appliedExtraLifePotions }),
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'autopilot') => set({ attackMode }),
  setAutopilotEnabled: (autopilotEnabled: boolean) => set({ autopilotEnabled }),
  setAutopilotLog: (autopilotLog: string) => set({ autopilotLog }),
  addLiveEvent: (event: LogEntry) =>
    set(state => ({
      liveEvents: [event, ...state.liveEvents].slice(0, MAX_LIVE_EVENTS),
    })),
  clearLiveEvents: () => set({ liveEvents: [] }),
  addGameNotification: (notification: Omit<GameNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    set(state => ({
      gameNotifications: [...state.gameNotifications, { ...notification, id }],
    }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set(state => ({
        gameNotifications: state.gameNotifications.filter(n => n.id !== id),
      }));
    }, 3000);
  },
  removeGameNotification: (id: string) =>
    set(state => ({
      gameNotifications: state.gameNotifications.filter(n => n.id !== id),
    })),

  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => set({ hideDeadBeasts }),
  setHideTop5000: (hideTop5000: boolean) => set({ hideTop5000 }),
  setSortMethod: (sortMethod: SortMethod) => {
    localStorage.setItem('beastSortMethod', sortMethod);
    set({ sortMethod });
  },
  setTypeFilter: (typeFilter: BeastTypeFilter) => set({ typeFilter }),
  setNameMatchFilter: (nameMatchFilter: boolean) => set({ nameMatchFilter }),
}));
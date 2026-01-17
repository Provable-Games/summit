import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { Summit, Beast, Adventurer, BattleEvent, Leaderboard, PoisonEvent, selection } from '@/types/game';

export type SortMethod = 'recommended' | 'power' | 'attack' | 'health' | 'blocks held';
export type BeastTypeFilter = 'all' | 'strong';

interface GameState {
  summit: Summit | null;
  summitEnded: boolean;
  onboarding: boolean;
  leaderboard: Leaderboard[];
  battleEvents: BattleEvent[];
  spectatorBattleEvents: BattleEvent[];
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

  // Beast Collection Filters
  hideDeadBeasts: boolean;
  hideTop5000: boolean;
  sortMethod: SortMethod;
  typeFilter: BeastTypeFilter;
  nameMatchFilter: boolean;

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) => void;
  setSummitEnded: (summitEnded: boolean) => void;
  setOnboarding: (onboarding: boolean) => void;
  setLeaderboard: (leaderboard: Leaderboard[]) => void;
  setBattleEvents: (battleEvents: BattleEvent[]) => void;
  setSpectatorBattleEvents: (spectatorBattleEvents: BattleEvent[] | ((prev: BattleEvent[]) => BattleEvent[])) => void;
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
  onboarding: false,
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
  attackMode: 'safe',
  autopilotEnabled: false,
  autopilotLog: '',

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
      onboarding: false,
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
      attackMode: 'safe',
      autopilotEnabled: false,
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
  setOnboarding: (onboarding: boolean) => set({ onboarding }),
  setLeaderboard: (leaderboard: Leaderboard[]) => set({ leaderboard }),
  setBattleEvents: (battleEvents: BattleEvent[]) => set({ battleEvents }),
  setSpectatorBattleEvents: (spectatorBattleEvents: BattleEvent[] | ((prev: BattleEvent[]) => BattleEvent[])) =>
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

// ============================================================================
// Selectors for optimized re-renders
// ============================================================================

// Individual state selectors
export const selectSummit = (state: GameState) => state.summit;
export const selectSummitEnded = (state: GameState) => state.summitEnded;
export const selectOnboarding = (state: GameState) => state.onboarding;
export const selectLeaderboard = (state: GameState) => state.leaderboard;
export const selectBattleEvents = (state: GameState) => state.battleEvents;
export const selectSpectatorBattleEvents = (state: GameState) => state.spectatorBattleEvents;
export const selectPoisonEvent = (state: GameState) => state.poisonEvent;
export const selectKilledByAdventurers = (state: GameState) => state.killedByAdventurers;
export const selectCollection = (state: GameState) => state.collection;
export const selectCollectionSyncing = (state: GameState) => state.collectionSyncing;
export const selectLoadingCollection = (state: GameState) => state.loadingCollection;
export const selectAttackInProgress = (state: GameState) => state.attackInProgress;
export const selectApplyingPotions = (state: GameState) => state.applyingPotions;
export const selectSelectedBeasts = (state: GameState) => state.selectedBeasts;
export const selectAdventurerCollection = (state: GameState) => state.adventurerCollection;
export const selectSelectedAdventurers = (state: GameState) => state.selectedAdventurers;
export const selectAppliedPoisonCount = (state: GameState) => state.appliedPoisonCount;
export const selectAppliedExtraLifePotions = (state: GameState) => state.appliedExtraLifePotions;
export const selectAttackMode = (state: GameState) => state.attackMode;
export const selectAutopilotEnabled = (state: GameState) => state.autopilotEnabled;
export const selectAutopilotLog = (state: GameState) => state.autopilotLog;

// Filter selectors
export const selectHideDeadBeasts = (state: GameState) => state.hideDeadBeasts;
export const selectHideTop5000 = (state: GameState) => state.hideTop5000;
export const selectSortMethod = (state: GameState) => state.sortMethod;
export const selectTypeFilter = (state: GameState) => state.typeFilter;
export const selectNameMatchFilter = (state: GameState) => state.nameMatchFilter;

// Setter selectors
export const selectSetSummit = (state: GameState) => state.setSummit;
export const selectSetBattleEvents = (state: GameState) => state.setBattleEvents;
export const selectSetCollection = (state: GameState) => state.setCollection;
export const selectSetSelectedBeasts = (state: GameState) => state.setSelectedBeasts;
export const selectSetAttackInProgress = (state: GameState) => state.setAttackInProgress;
export const selectSetApplyingPotions = (state: GameState) => state.setApplyingPotions;

// Composite selectors for common combinations
export const selectGameState = (state: GameState) => ({
  summit: state.summit,
  attackInProgress: state.attackInProgress,
  selectedBeasts: state.selectedBeasts,
  attackMode: state.attackMode,
});

export const selectCollectionState = (state: GameState) => ({
  collection: state.collection,
  loadingCollection: state.loadingCollection,
  collectionSyncing: state.collectionSyncing,
});

export const selectFilterState = (state: GameState) => ({
  hideDeadBeasts: state.hideDeadBeasts,
  hideTop5000: state.hideTop5000,
  sortMethod: state.sortMethod,
  typeFilter: state.typeFilter,
  nameMatchFilter: state.nameMatchFilter,
});

// Hook helpers with shallow comparison for multi-value selects
export const useGameStateShallow = () => useGameStore(selectGameState, shallow);
export const useCollectionStateShallow = () => useGameStore(selectCollectionState, shallow);
export const useFilterStateShallow = () => useGameStore(selectFilterState, shallow);
import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions, BattleEvent, Leaderboard, PoisonEvent } from '@/types/game';

export type SortMethod = 'recommended' | 'power' | 'attack' | 'health' | 'rewards earned';
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
  selectedBeasts: Beast[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPotions: AppliedPotions;
  appliedPoisonCount: number;
  attackMode: 'safe' | 'unsafe' | 'capture' | 'autopilot';
  autopilotEnabled: boolean;

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
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  setAppliedPoisonCount: (appliedPoisonCount: number) => void;
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture' | 'autopilot') => void;
  setAutopilotEnabled: (autopilotEnabled: boolean) => void;

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
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
  },
  appliedPoisonCount: 0,
  attackMode: 'safe',
  autopilotEnabled: false,

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
      appliedPotions: {
        revive: 0,
        attack: 0,
        extraLife: 0,
      },
      appliedPoisonCount: 0,
      attackMode: 'safe',
      autopilotEnabled: false,
      // Reset filters to defaults
      hideDeadBeasts: false,
      typeFilter: 'all',
      nameMatchFilter: false,
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
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ selectedBeasts: typeof selectedBeasts === 'function' ? selectedBeasts(state.selectedBeasts) : selectedBeasts })),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
  setAppliedPoisonCount: (appliedPoisonCount: number) => set({ appliedPoisonCount }),
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture' | 'autopilot') => set({ attackMode }),
  setAutopilotEnabled: (autopilotEnabled: boolean) => set({ autopilotEnabled }),

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
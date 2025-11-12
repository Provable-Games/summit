import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions, BattleEvent, Leaderboard } from '@/types/game';

export type SortMethod = 'recommended' | 'power' | 'attack' | 'health';
export type BeastTypeFilter = 'all' | 'strong';

interface GameState {
  summit: Summit | null;
  onboarding: boolean;
  leaderboard: Leaderboard[];
  battleEvents: BattleEvent[];
  spectatorBattleEvents: BattleEvent[];
  killedByAdventurers: number[];
  collection: Beast[];
  loadingCollection: boolean;
  attackInProgress: boolean;
  applyingPotions: boolean;
  selectedBeasts: Beast[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPotions: AppliedPotions;
  attackMode: 'safe' | 'unsafe' | 'capture';
  waitingForBeastUpgradeSelection: boolean;
  
  // Beast Collection Filters
  hideDeadBeasts: boolean;
  sortMethod: SortMethod;
  typeFilter: BeastTypeFilter;
  nameMatchFilter: boolean;

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) => void;
  setOnboarding: (onboarding: boolean) => void;
  setLeaderboard: (leaderboard: Leaderboard[]) => void;
  setBattleEvents: (battleEvents: BattleEvent[]) => void;
  setSpectatorBattleEvents: (spectatorBattleEvents: BattleEvent[] | ((prev: BattleEvent[]) => BattleEvent[])) => void;
  setKilledByAdventurers: (killedByAdventurers: number[]) => void;
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => void;
  setLoadingCollection: (loadingCollection: boolean) => void;
  setAttackInProgress: (attackInProgress: boolean) => void;
  setApplyingPotions: (applyingPotions: boolean) => void;
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture') => void;
  setWaitingForBeastUpgradeSelection: (waiting: boolean) => void;
  
  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => void;
  setSortMethod: (sortMethod: SortMethod) => void;
  setTypeFilter: (typeFilter: BeastTypeFilter) => void;
  setNameMatchFilter: (nameMatchFilter: boolean) => void;
  
  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  onboarding: false,
  leaderboard: [],
  battleEvents: [],
  spectatorBattleEvents: [],
  killedByAdventurers: [],
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  attackInProgress: false,
  applyingPotions: false,
  selectedBeasts: [],
  selectedAdventurers: [],
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
    poison: 0,
  },
  attackMode: 'safe',
  waitingForBeastUpgradeSelection: false,
  
  // Beast Collection Filters - Default Values
  hideDeadBeasts: false,
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
      killedByAdventurers: [],
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      attackInProgress: false,
      applyingPotions: false,
      selectedBeasts: [],
      selectedAdventurers: [],
      appliedPotions: {
        revive: 0,
        attack: 0,
        extraLife: 0,
        poison: 0,
      },
      waitingForBeastUpgradeSelection: false,
      // Reset filters to defaults
      hideDeadBeasts: false,
      typeFilter: 'all',
      nameMatchFilter: false,
    });
  },

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) =>
    set(state => ({ summit: typeof summit === 'function' ? summit(state.summit) : summit })),
  setOnboarding: (onboarding: boolean) => set({ onboarding }),
  setLeaderboard: (leaderboard: Leaderboard[]) => set({ leaderboard }),
  setBattleEvents: (battleEvents: BattleEvent[]) => set({ battleEvents }),
  setSpectatorBattleEvents: (spectatorBattleEvents: BattleEvent[] | ((prev: BattleEvent[]) => BattleEvent[])) =>
    set(state => ({ spectatorBattleEvents: typeof spectatorBattleEvents === 'function' ? spectatorBattleEvents(state.spectatorBattleEvents) : spectatorBattleEvents })),
  setKilledByAdventurers: (killedByAdventurers: number[]) => set({ killedByAdventurers }),
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ collection: typeof collection === 'function' ? collection(state.collection) : collection })),
  setLoadingCollection: (loadingCollection: boolean) => set({ loadingCollection }),
  setAttackInProgress: (attackInProgress: boolean) => set({ attackInProgress }),
  setApplyingPotions: (applyingPotions: boolean) => set({ applyingPotions }),
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ selectedBeasts: typeof selectedBeasts === 'function' ? selectedBeasts(state.selectedBeasts) : selectedBeasts })),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture') => set({ attackMode }),
  setWaitingForBeastUpgradeSelection: (waiting: boolean) => set({ waitingForBeastUpgradeSelection: waiting }),
  
  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => set({ hideDeadBeasts }),
  setSortMethod: (sortMethod: SortMethod) => {
    localStorage.setItem('beastSortMethod', sortMethod);
    set({ sortMethod });
  },
  setTypeFilter: (typeFilter: BeastTypeFilter) => set({ typeFilter }),
  setNameMatchFilter: (nameMatchFilter: boolean) => set({ nameMatchFilter }),
}));
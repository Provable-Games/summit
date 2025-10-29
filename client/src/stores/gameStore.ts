import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions, BattleEvent, Leaderboard } from '@/types/game';

export type SortMethod = 'recommended' | 'power' | 'attack' | 'health';
export type BeastTypeFilter = 'all' | 'strong';

interface GameState {
  summit: Summit | null;
  leaderboard: Leaderboard[];
  battleEvents: BattleEvent[];
  showFeedingGround: boolean;
  killedByAdventurers: number[];
  collection: Beast[];
  loadingCollection: boolean;
  attackInProgress: boolean;
  feedingInProgress: boolean;
  applyingPotions: boolean;
  selectedBeasts: Beast[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPotions: AppliedPotions;
  attackMode: 'safe' | 'unsafe' | 'capture';
  
  // Beast Collection Filters
  hideDeadBeasts: boolean;
  sortMethod: SortMethod;
  typeFilter: BeastTypeFilter;
  nameMatchFilter: boolean;

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) => void;
  setLeaderboard: (leaderboard: Leaderboard[]) => void;
  setBattleEvents: (battleEvents: BattleEvent[]) => void;
  setShowFeedingGround: (showFeedingGround: boolean) => void;
  setKilledByAdventurers: (killedByAdventurers: number[]) => void;
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => void;
  setLoadingCollection: (loadingCollection: boolean) => void;
  setAttackInProgress: (attackInProgress: boolean) => void;
  setFeedingInProgress: (feedingInProgress: boolean) => void;
  setApplyingPotions: (applyingPotions: boolean) => void;
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture') => void;
  
  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => void;
  setSortMethod: (sortMethod: SortMethod) => void;
  setTypeFilter: (typeFilter: BeastTypeFilter) => void;
  setNameMatchFilter: (nameMatchFilter: boolean) => void;
  
  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  leaderboard: [],
  battleEvents: [],
  showFeedingGround: false,
  killedByAdventurers: [],
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  attackInProgress: false,
  feedingInProgress: false,
  applyingPotions: false,
  selectedBeasts: [],
  selectedAdventurers: [],
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
  },
  attackMode: 'safe',
  
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
      battleEvents: [],
      showFeedingGround: false,
      killedByAdventurers: [],
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      attackInProgress: false,
      feedingInProgress: false,
      applyingPotions: false,
      selectedBeasts: [],
      selectedAdventurers: [],
      appliedPotions: {
        revive: 0,
        attack: 0,
        extraLife: 0,
      },
      // Reset filters to defaults
      hideDeadBeasts: false,
      typeFilter: 'all',
      nameMatchFilter: false,
    });
  },

  setSummit: (summit: Summit | null | ((prev: Summit | null) => Summit | null)) =>
    set(state => ({ summit: typeof summit === 'function' ? summit(state.summit) : summit })),
  setLeaderboard: (leaderboard: Leaderboard[]) => set({ leaderboard }),
  setBattleEvents: (battleEvents: BattleEvent[]) => set({ battleEvents }),
  setShowFeedingGround: (showFeedingGround: boolean) => set({ showFeedingGround }),
  setKilledByAdventurers: (killedByAdventurers: number[]) => set({ killedByAdventurers }),
  setCollection: (collection: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ collection: typeof collection === 'function' ? collection(state.collection) : collection })),
  setLoadingCollection: (loadingCollection: boolean) => set({ loadingCollection }),
  setAttackInProgress: (attackInProgress: boolean) => set({ attackInProgress }),
  setFeedingInProgress: (feedingInProgress: boolean) => set({ feedingInProgress }),
  setApplyingPotions: (applyingPotions: boolean) => set({ applyingPotions }),
  setSelectedBeasts: (selectedBeasts: Beast[] | ((prev: Beast[]) => Beast[])) =>
    set(state => ({ selectedBeasts: typeof selectedBeasts === 'function' ? selectedBeasts(state.selectedBeasts) : selectedBeasts })),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
  setAttackMode: (attackMode: 'safe' | 'unsafe' | 'capture') => set({ attackMode }),
  
  // Beast Collection Filter Setters
  setHideDeadBeasts: (hideDeadBeasts: boolean) => set({ hideDeadBeasts }),
  setSortMethod: (sortMethod: SortMethod) => {
    localStorage.setItem('beastSortMethod', sortMethod);
    set({ sortMethod });
  },
  setTypeFilter: (typeFilter: BeastTypeFilter) => set({ typeFilter }),
  setNameMatchFilter: (nameMatchFilter: boolean) => set({ nameMatchFilter }),
}));
import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions, BattleEvent, Leaderboard } from '@/types/game';

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
  totalDamage: number;
  appliedPotions: AppliedPotions;

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
  setSelectedBeasts: (selectedBeasts: Beast[]) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  setTotalDamage: (totalDamage: number) => void;
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
  totalDamage: 0,
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
  },

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
      totalDamage: 0,
      appliedPotions: {
        revive: 0,
        attack: 0,
        extraLife: 0,
      },
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
  setSelectedBeasts: (selectedBeasts: Beast[]) => set({ selectedBeasts }),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
  setTotalDamage: (totalDamage: number) => set({ totalDamage }),
}));
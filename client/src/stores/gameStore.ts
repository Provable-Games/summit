import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions } from '@/types/game';

interface GameState {
  summit: Summit | null;
  showFeedingGround: boolean;
  collection: Beast[];
  loadingCollection: boolean;
  attackInProgress: boolean;
  feedingInProgress: boolean;
  totalDamage: number;
  selectedBeasts: number[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPotions: AppliedPotions;

  setSummit: (summit: Summit | null) => void;
  setShowFeedingGround: (showFeedingGround: boolean) => void;
  setCollection: (collection: Beast[]) => void;
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => void;
  setLoadingCollection: (loadingCollection: boolean) => void;
  setAttackInProgress: (attackInProgress: boolean) => void;
  setFeedingInProgress: (feedingInProgress: boolean) => void;
  setTotalDamage: (totalDamage: number) => void;
  setSelectedBeasts: (selectedBeasts: number[]) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  showFeedingGround: false,
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  attackInProgress: false,
  feedingInProgress: false,
  totalDamage: 0,
  selectedBeasts: [],
  selectedAdventurers: [],
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
  },

  disconnect: () => {
    set({
      showFeedingGround: false,
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      attackInProgress: false,
      feedingInProgress: false,
      totalDamage: 0,
      selectedBeasts: [],
      selectedAdventurers: [],
      appliedPotions: {
        revive: 0,
        attack: 0,
        extraLife: 0,
      },
    });
  },

  setSummit: (summit: Summit | null) => set({ summit }),
  setShowFeedingGround: (showFeedingGround: boolean) => set({ showFeedingGround }),
  setCollection: (collection: Beast[]) => set({ collection }),
  setLoadingCollection: (loadingCollection: boolean) => set({ loadingCollection }),
  setAttackInProgress: (attackInProgress: boolean) => set({ attackInProgress }),
  setFeedingInProgress: (feedingInProgress: boolean) => set({ feedingInProgress }),
  setTotalDamage: (totalDamage: number) => set({ totalDamage }),
  setSelectedBeasts: (selectedBeasts: number[]) => set({ selectedBeasts }),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
}));
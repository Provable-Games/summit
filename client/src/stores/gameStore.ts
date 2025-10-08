import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions } from '@/types/game';

interface GameState {
  summit: Summit | null;
  lastAttack: number | null;
  showFeedingGround: boolean;
  collection: Beast[];
  loadingCollection: boolean;
  attackInProgress: boolean;
  feedingInProgress: boolean;
  selectedBeasts: Beast[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  totalDamage: number;
  appliedPotions: AppliedPotions;

  setSummit: (summit: Summit | null) => void;
  setLastAttack: (lastAttack: number | null) => void;
  setShowFeedingGround: (showFeedingGround: boolean) => void;
  setCollection: (collection: Beast[]) => void;
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => void;
  setLoadingCollection: (loadingCollection: boolean) => void;
  setAttackInProgress: (attackInProgress: boolean) => void;
  setFeedingInProgress: (feedingInProgress: boolean) => void;
  setSelectedBeasts: (selectedBeasts: Beast[]) => void;
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => void;
  setAppliedPotions: (appliedPotions: AppliedPotions) => void;
  setTotalDamage: (totalDamage: number) => void;
  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  lastAttack: null,
  showFeedingGround: false,
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  attackInProgress: false,
  feedingInProgress: false,
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
      lastAttack: null,
      showFeedingGround: false,
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      attackInProgress: false,
      feedingInProgress: false,
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

  setSummit: (summit: Summit | null) => set({ summit }),
  setLastAttack: (lastAttack: number | null) => set({ lastAttack }),
  setShowFeedingGround: (showFeedingGround: boolean) => set({ showFeedingGround }),
  setCollection: (collection: Beast[]) => set({ collection }),
  setLoadingCollection: (loadingCollection: boolean) => set({ loadingCollection }),
  setAttackInProgress: (attackInProgress: boolean) => set({ attackInProgress }),
  setFeedingInProgress: (feedingInProgress: boolean) => set({ feedingInProgress }),
  setSelectedBeasts: (selectedBeasts: Beast[]) => set({ selectedBeasts }),
  setSelectedAdventurers: (selectedAdventurers: Adventurer[]) => set({ selectedAdventurers }),
  setAdventurerCollection: (adventurerCollection: Adventurer[]) => set({ adventurerCollection }),
  setAppliedPotions: (appliedPotions: AppliedPotions) => set({ appliedPotions }),
  setTotalDamage: (totalDamage: number) => set({ totalDamage }),
}));
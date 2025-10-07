import { create } from 'zustand';
import { Summit, Beast, Adventurer, AppliedPotions } from '@/types/game';

interface GameState {
  summit: Summit | null;
  newSummit: Summit | null;
  lastAttack: number | null;
  showFeedingGround: boolean;
  collection: Beast[];
  loadingCollection: boolean;
  attackInProgress: boolean;
  feedingInProgress: boolean;
  selectedBeasts: Beast[];
  adventurerCollection: Adventurer[];
  selectedAdventurers: Adventurer[];
  appliedPotions: AppliedPotions;

  setSummit: (summit: Summit | null) => void;
  setNewSummit: (newSummit: Summit | null) => void;
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
  disconnect: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  summit: null,
  newSummit: null,
  lastAttack: null,
  showFeedingGround: false,
  collection: [],
  adventurerCollection: [],
  loadingCollection: false,
  attackInProgress: false,
  feedingInProgress: false,
  selectedBeasts: [],
  selectedAdventurers: [],
  appliedPotions: {
    revive: 0,
    attack: 0,
    extraLife: 0,
  },

  disconnect: () => {
    set({
      newSummit: null,
      lastAttack: null,
      showFeedingGround: false,
      collection: [],
      adventurerCollection: [],
      loadingCollection: false,
      attackInProgress: false,
      feedingInProgress: false,
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
  setNewSummit: (newSummit: Summit | null) => set({ newSummit }),
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
}));
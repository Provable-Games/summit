import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const mockGameStoreState = {
  loadingCollection: false,
  collection: [],
  selectedBeasts: [],
  setSelectedBeasts: vi.fn(),
  attackInProgress: false,
  summit: null,
  attackMode: "safe",
  hideDeadBeasts: false,
  setHideDeadBeasts: vi.fn(),
  sortMethod: "recommended",
  setSortMethod: vi.fn(),
  typeFilter: "all",
  setTypeFilter: vi.fn(),
  nameMatchFilter: false,
  setNameMatchFilter: vi.fn(),
  questFilter: {
    firstBlood: false,
    consistencyIsKey: false,
    levelUp1: false,
    levelUp3: false,
    levelUp5: false,
    levelUp10: false,
    summitConqueror: false,
    ironGrip: false,
    secondWind: false,
    vitalBoost: false,
  },
  toggleQuestFilter: vi.fn(),
};

vi.mock("@/stores/gameStore", () => ({
  useGameStore: () => mockGameStoreState,
}));

vi.mock("@/contexts/controller", () => ({
  useController: () => ({
    tokenBalances: {},
  }),
}));

vi.mock("@/contexts/QuestGuide", () => ({
  useQuestGuide: () => ({
    notifyTargetClicked: vi.fn(),
    isStepTarget: vi.fn(() => false),
  }),
}));

vi.mock("@starknet-react/core", () => ({
  useAccount: () => ({
    address: undefined,
  }),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
  }),
}));

vi.mock("./BeastCard", () => ({
  default: () => null,
}));

vi.mock("./BeastProfile", () => ({
  default: () => null,
}));

import BeastCollection from "./BeastCollection";

describe("BeastCollection", () => {
  it("renders with empty collection state", async () => {
    let renderer: ReturnType<typeof create> | null = null;

    await act(async () => {
      renderer = create(<BeastCollection />);
    });

    expect(renderer).not.toBeNull();
  });
});

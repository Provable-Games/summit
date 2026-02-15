import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const executeGameActionMock = vi.fn();
const notifyTargetClickedMock = vi.fn();
const initializeMaxCapsFromBalancesMock = vi.fn();

const mockControllerState = {
  tokenBalances: {} as Record<string, number>,
};

const mockGameStoreState = {
  selectedBeasts: [] as Array<[unknown, number, number]>,
  summit: null as unknown,
  attackInProgress: false,
  applyingPotions: false,
  setApplyingPotions: vi.fn(),
  appliedPoisonCount: 0,
  setAppliedPoisonCount: vi.fn(),
  setBattleEvents: vi.fn(),
  setAttackInProgress: vi.fn(),
  collection: [] as unknown[],
  collectionSyncing: false,
  setSelectedBeasts: vi.fn(),
  attackMode: "safe",
  setAttackMode: vi.fn(),
  autopilotLog: "",
  setAutopilotLog: vi.fn(),
  autopilotEnabled: false,
  setAutopilotEnabled: vi.fn(),
  appliedExtraLifePotions: 0,
  setAppliedExtraLifePotions: vi.fn(),
};

const mockAutopilotState = {
  attackStrategy: "never",
  extraLifeStrategy: "disabled",
  extraLifeMax: 0,
  extraLifeTotalMax: 0,
  extraLifeReplenishTo: 0,
  extraLifePotionsUsed: 0,
  useRevivePotions: false,
  revivePotionMax: 0,
  revivePotionMaxPerBeast: 0,
  useAttackPotions: false,
  attackPotionMax: 0,
  revivePotionsUsed: 0,
  attackPotionsUsed: 0,
  setRevivePotionsUsed: vi.fn(),
  setAttackPotionsUsed: vi.fn(),
  setExtraLifePotionsUsed: vi.fn(),
  setPoisonPotionsUsed: vi.fn(),
  poisonStrategy: "disabled",
  poisonTotalMax: 0,
  poisonPotionsUsed: 0,
  poisonConservativeExtraLivesTrigger: 0,
  poisonConservativeAmount: 0,
  poisonAggressiveAmount: 0,
  initializeMaxCapsFromBalances: initializeMaxCapsFromBalancesMock,
};

vi.mock("@/contexts/controller", () => ({
  useController: () => mockControllerState,
}));

vi.mock("@/contexts/GameDirector", () => ({
  MAX_BEASTS_PER_ATTACK: 10,
  useGameDirector: () => ({
    executeGameAction: executeGameActionMock,
  }),
}));

vi.mock("@/contexts/QuestGuide", () => ({
  useQuestGuide: () => ({
    notifyTargetClicked: notifyTargetClickedMock,
  }),
}));

vi.mock("@/stores/gameStore", () => ({
  useGameStore: () => mockGameStoreState,
}));

vi.mock("@/stores/autopilotStore", () => ({
  useAutopilotStore: () => mockAutopilotState,
}));

vi.mock("../utils/beasts", () => ({
  calculateBattleResult: vi.fn(() => ({ score: 0, estimatedDamage: 0, attackPotions: 0 })),
  calculateOptimalAttackPotions: vi.fn(() => 0),
  calculateRevivalRequired: vi.fn(() => 0),
  getBeastCurrentHealth: vi.fn(() => 0),
  getBeastRevivalTime: vi.fn(() => 0),
  isBeastLocked: vi.fn(() => false),
}));

vi.mock("./dialogs/AutopilotConfigModal", () => ({
  default: () => null,
}));

vi.mock("./dialogs/BeastDexModal", () => ({
  default: () => null,
}));

vi.mock("./dialogs/BeastUpgradeModal", () => ({
  default: () => null,
}));

vi.mock("react-device-detect", () => ({
  isBrowser: false,
}));

vi.mock("../assets/images/attack-potion.png", () => ({ default: "attack.png" }));
vi.mock("../assets/images/heart.png", () => ({ default: "heart.png" }));
vi.mock("../assets/images/life-potion.png", () => ({ default: "life.png" }));
vi.mock("../assets/images/poison-potion.png", () => ({ default: "poison.png" }));
vi.mock("../assets/images/revive-potion.png", () => ({ default: "revive.png" }));

import ActionBar from "./ActionBar";

describe("ActionBar token balance coercion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockControllerState.tokenBalances = {};
    mockGameStoreState.collection = [];
  });

  it("renders with missing balance keys and initializes max caps", async () => {
    await act(async () => {
      create(<ActionBar />);
    });

    expect(initializeMaxCapsFromBalancesMock).toHaveBeenCalledWith({});
  });

  it("renders with populated balances and initializes max caps", async () => {
    mockControllerState.tokenBalances = {
      REVIVE: 5,
      ATTACK: 7,
      "EXTRA LIFE": 11,
      POISON: 13,
    };

    await act(async () => {
      create(<ActionBar />);
    });

    expect(initializeMaxCapsFromBalancesMock).toHaveBeenCalledWith(mockControllerState.tokenBalances);
  });

  it("handles invalid balance values without crashing", async () => {
    mockControllerState.tokenBalances = {
      REVIVE: Number.NaN,
      ATTACK: Number.POSITIVE_INFINITY,
      "EXTRA LIFE": "11" as unknown as number,
      POISON: undefined as unknown as number,
    };

    await act(async () => {
      create(<ActionBar />);
    });

    expect(initializeMaxCapsFromBalancesMock).toHaveBeenCalledWith(mockControllerState.tokenBalances);
  });
});

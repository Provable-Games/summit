import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameAction, selection } from "@/types/game";

const hoisted = vi.hoisted(() => ({
  getSummitDataMock: vi.fn(async () => null),
  getDiplomacyMock: vi.fn(async () => []),
  executeActionMock: vi.fn(async () => []),
  attackMock: vi.fn(() => []),
  feedMock: vi.fn(() => []),
  claimCorpsesMock: vi.fn(() => ({ contractAddress: "0x1", entrypoint: "claim_corpses", calldata: [] })),
  claimSkullsMock: vi.fn(() => ({ contractAddress: "0x1", entrypoint: "claim_skulls", calldata: [] })),
  claimQuestRewardsMock: vi.fn(() => ({ contractAddress: "0x1", entrypoint: "claim_quest_rewards", calldata: [] })),
  claimRewardsMock: vi.fn(() => ({ contractAddress: "0x1", entrypoint: "claim_rewards", calldata: [] })),
  addExtraLifeMock: vi.fn(() => []),
  applyStatPointsMock: vi.fn(() => []),
  applyPoisonMock: vi.fn(() => []),
  setSummitMock: vi.fn(),
  setAttackInProgressMock: vi.fn(),
  setCollectionMock: vi.fn(),
  setBattleEventsMock: vi.fn(),
  setSpectatorBattleEventsMock: vi.fn(),
  setApplyingPotionsMock: vi.fn(),
  setAppliedExtraLifePotionsMock: vi.fn(),
  setSelectedBeastsMock: vi.fn(),
  setPoisonEventMock: vi.fn(),
  addLiveEventMock: vi.fn(),
  addGameNotificationMock: vi.fn(),
  setRevivePotionsUsedMock: vi.fn(),
  setAttackPotionsUsedMock: vi.fn(),
  setExtraLifePotionsUsedMock: vi.fn(),
  setPoisonPotionsUsedMock: vi.fn(),
  setTokenBalancesMock: vi.fn(),
  playMock: vi.fn(),
}));

vi.mock("@starknet-react/core", () => ({
  useAccount: () => ({
    account: undefined,
  }),
}));

vi.mock("./starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: {
      wsUrl: "wss://example.invalid",
    },
  }),
}));

vi.mock("@/hooks/useWebSocket", () => ({
  useWebSocket: vi.fn(),
}));

vi.mock("@/api/starknet", () => ({
  useStarknetApi: () => ({
    getSummitData: hoisted.getSummitDataMock,
  }),
}));

vi.mock("@/api/summitApi", () => ({
  useSummitApi: () => ({
    getDiplomacy: hoisted.getDiplomacyMock,
  }),
}));

vi.mock("@/dojo/useSystemCalls", () => ({
  useSystemCalls: () => ({
    executeAction: hoisted.executeActionMock,
    attack: hoisted.attackMock,
    feed: hoisted.feedMock,
    claimCorpses: hoisted.claimCorpsesMock,
    claimSkulls: hoisted.claimSkullsMock,
    claimQuestRewards: hoisted.claimQuestRewardsMock,
    claimRewards: hoisted.claimRewardsMock,
    addExtraLife: hoisted.addExtraLifeMock,
    applyStatPoints: hoisted.applyStatPointsMock,
    applyPoison: hoisted.applyPoisonMock,
  }),
}));

vi.mock("@/stores/gameStore", () => ({
  useGameStore: () => ({
    summit: null,
    setSummit: hoisted.setSummitMock,
    setAttackInProgress: hoisted.setAttackInProgressMock,
    collection: [],
    setCollection: hoisted.setCollectionMock,
    setBattleEvents: hoisted.setBattleEventsMock,
    setSpectatorBattleEvents: hoisted.setSpectatorBattleEventsMock,
    setApplyingPotions: hoisted.setApplyingPotionsMock,
    setAppliedExtraLifePotions: hoisted.setAppliedExtraLifePotionsMock,
    setSelectedBeasts: hoisted.setSelectedBeastsMock,
    poisonEvent: null,
    setPoisonEvent: hoisted.setPoisonEventMock,
    addLiveEvent: hoisted.addLiveEventMock,
    addGameNotification: hoisted.addGameNotificationMock,
  }),
}));

vi.mock("@/stores/autopilotStore", () => ({
  useAutopilotStore: () => ({
    setRevivePotionsUsed: hoisted.setRevivePotionsUsedMock,
    setAttackPotionsUsed: hoisted.setAttackPotionsUsedMock,
    setExtraLifePotionsUsed: hoisted.setExtraLifePotionsUsedMock,
    setPoisonPotionsUsed: hoisted.setPoisonPotionsUsedMock,
  }),
}));

vi.mock("./controller", () => ({
  useController: () => ({
    tokenBalances: {},
    setTokenBalances: hoisted.setTokenBalancesMock,
  }),
}));

vi.mock("@/contexts/sound", () => ({
  useSound: () => ({
    play: hoisted.playMock,
  }),
}));

import { GameDirector, useGameDirector } from "./GameDirector";

let capturedDirector: ReturnType<typeof useGameDirector>;

function Probe() {
  capturedDirector = useGameDirector();
  return null;
}

async function renderProvider() {
  await act(async () => {
    create(
      <GameDirector>
        <Probe />
      </GameDirector>,
    );
  });
}

describe("GameDirector executeGameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getSummitDataMock.mockResolvedValue(null);
    hoisted.attackMock.mockReturnValue([]);
  });

  it("does not leave updates paused when safe attack cannot build calls", async () => {
    await renderProvider();

    const beasts: selection = [];
    const action: GameAction = {
      type: "attack",
      beasts,
      safeAttack: true,
      vrf: false,
      extraLifePotions: 0,
      pauseUpdates: true,
    };

    let result = true;
    await act(async () => {
      result = await capturedDirector.executeGameAction(action);
    });

    expect(result).toBe(false);
    expect(hoisted.attackMock).toHaveBeenCalledWith(beasts, true, false, 0);
    expect(hoisted.executeActionMock).not.toHaveBeenCalled();
    expect(capturedDirector.pauseUpdates).toBe(false);
  });
});

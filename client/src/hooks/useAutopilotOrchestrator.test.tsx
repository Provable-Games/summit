import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beast, GameAction, Summit } from "@/types/game";

const hoisted = vi.hoisted(() => ({
  executeGameActionMock: vi.fn(),
  tokenBalances: {
    current: {} as Record<string, number>,
  },
}));

vi.mock("@/contexts/GameDirector", () => ({
  MAX_BEASTS_PER_ATTACK: 295,
  useGameDirector: () => ({
    executeGameAction: hoisted.executeGameActionMock,
  }),
}));

vi.mock("@/contexts/controller", () => ({
  useController: () => ({
    tokenBalances: hoisted.tokenBalances.current,
  }),
}));

import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";
import { useAutopilotOrchestrator } from "./useAutopilotOrchestrator";

function makeBeast(overrides: Partial<Beast> = {}): Beast {
  return {
    id: 1,
    name: "Warlock",
    prefix: "Agony",
    suffix: "Bane",
    power: 50,
    tier: 1,
    type: "Magic",
    level: 10,
    health: 100,
    shiny: 0,
    animated: 0,
    token_id: 1001,
    current_health: 100,
    bonus_health: 0,
    current_level: 10,
    bonus_xp: 0,
    attack_streak: 0,
    last_death_timestamp: 0,
    revival_count: 0,
    revival_time: 86400000,
    extra_lives: 0,
    captured_summit: false,
    used_revival_potion: false,
    used_attack_potion: false,
    max_attack_streak: false,
    summit_held_seconds: 0,
    spirit: 0,
    luck: 0,
    specials: false,
    wisdom: false,
    diplomacy: false,
    kills_claimed: 0,
    rewards_earned: 0,
    rewards_claimed: 0,
    ...overrides,
  };
}

function makeSummit(
  beastOverrides: Partial<Beast> = {},
  summitOverrides: Partial<Summit> = {},
): Summit {
  return {
    beast: makeBeast({
      token_id: 2001,
      power: 75,
      current_health: 100,
      extra_lives: 2,
      ...beastOverrides,
    }),
    block_timestamp: 0,
    owner: "0xabc",
    poison_count: 0,
    poison_timestamp: 0,
    ...summitOverrides,
  };
}

function Probe() {
  useAutopilotOrchestrator();
  return null;
}

const initialGameState = useGameStore.getState();
const initialAutopilotState = useAutopilotStore.getState();
let renderer: ReactTestRenderer | null = null;

function configureAutopilot(overrides: {
  summit?: Summit;
  applyingPotions?: boolean;
  poisonStrategy?: "conservative" | "aggressive";
} = {}) {
  const attacker = makeBeast({
    token_id: 3001,
    power: 500,
    current_health: 100,
    health: 100,
    extra_lives: 0,
  });

  useGameStore.setState({
    ...initialGameState,
    summit: overrides.summit ?? makeSummit(),
    collection: [attacker],
    attackMode: "autopilot",
    autopilotEnabled: true,
    attackInProgress: false,
    applyingPotions: overrides.applyingPotions ?? false,
    selectedBeasts: [],
    autopilotLog: "",
  }, true);

  useAutopilotStore.setState({
    ...initialAutopilotState,
    attackStrategy: "never",
    poisonStrategy: overrides.poisonStrategy ?? "conservative",
    poisonTotalMax: 10,
    poisonPotionsUsed: 0,
    poisonConservativeExtraLivesTrigger: 1,
    poisonConservativeAmount: 1,
    poisonAggressiveAmount: 1,
    poisonMinPower: 0,
    poisonMinHealth: 0,
    targetedPoisonPlayers: [],
    targetedPoisonBeasts: [],
    ignoredPlayers: [],
    skipSharedDiplomacy: false,
    maxBeastsPerAttack: 295,
  }, true);
}

async function renderHook() {
  await act(async () => {
    renderer = create(<Probe />);
  });
}

async function rerenderHook() {
  await act(async () => {
    renderer?.update(<Probe />);
  });
}

function poisonActions(): GameAction[] {
  return hoisted.executeGameActionMock.mock.calls
    .map(([action]) => action as GameAction)
    .filter((action) => action.type === "apply_poison");
}

describe("useAutopilotOrchestrator poison triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.executeGameActionMock.mockResolvedValue(true);
    hoisted.tokenBalances.current = {
      POISON: 10,
      REVIVE: 0,
    };
  });

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer?.unmount();
      });
      renderer = null;
    }

    useGameStore.setState(initialGameState, true);
    useAutopilotStore.setState(initialAutopilotState, true);
  });

  it("applies conservative poison after an in-progress potion action clears", async () => {
    configureAutopilot({ applyingPotions: true });

    await renderHook();

    expect(poisonActions()).toHaveLength(0);

    await act(async () => {
      useGameStore.getState().setApplyingPotions(false);
    });

    expect(poisonActions()).toMatchObject([
      { type: "apply_poison", beastId: 2001, count: 1 },
    ]);
  });

  it("applies aggressive poison when poison balance arrives after the summit update", async () => {
    hoisted.tokenBalances.current = {
      POISON: 0,
      REVIVE: 0,
    };
    configureAutopilot({ poisonStrategy: "aggressive" });

    await renderHook();

    expect(poisonActions()).toHaveLength(0);

    hoisted.tokenBalances.current = {
      POISON: 10,
      REVIVE: 0,
    };
    await rerenderHook();

    expect(poisonActions()).toMatchObject([
      { type: "apply_poison", beastId: 2001, count: 1 },
    ]);
  });
});

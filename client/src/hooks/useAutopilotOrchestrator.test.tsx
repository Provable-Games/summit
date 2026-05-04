import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beast, Summit } from "@/types/game";

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

import { useAutopilotOrchestrator } from "./useAutopilotOrchestrator";
import { useAutopilotStore } from "@/stores/autopilotStore";
import { useGameStore } from "@/stores/gameStore";

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
      power: 10,
      current_health: 100,
      extra_lives: 1,
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

function configureAutopilot(summit: Summit) {
  const attacker = makeBeast({
    token_id: 3001,
    power: 500,
    current_health: 100,
    health: 100,
    extra_lives: 0,
  });

  useGameStore.setState({
    ...initialGameState,
    summit,
    collection: [attacker],
    attackMode: "autopilot",
    autopilotEnabled: true,
    attackInProgress: false,
    applyingPotions: false,
    selectedBeasts: [],
    autopilotLog: "",
  }, true);

  useAutopilotStore.setState({
    ...initialAutopilotState,
    attackStrategy: "guaranteed",
    poisonStrategy: "conservative",
    poisonTotalMax: 10,
    poisonPotionsUsed: 0,
    poisonConservativeExtraLivesTrigger: 1,
    poisonConservativeAmount: 1,
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

async function settlePoisonTransaction() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    useGameStore.getState().setApplyingPotions(false);
  });
}

function actionTypes(): string[] {
  return hoisted.executeGameActionMock.mock.calls.map(([action]) => action.type);
}

describe("useAutopilotOrchestrator smart poison", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
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
    vi.useRealTimers();
  });

  it("does not immediately attack after Autopilot applies poison", async () => {
    configureAutopilot(makeSummit());

    await renderHook();
    await settlePoisonTransaction();

    expect(actionTypes()).toEqual(["apply_poison"]);
    expect(useGameStore.getState().autopilotLog).toMatch(/^Waiting for poison:/);
  });

  it("attacks when projected poison damage reaches 1 HP and 0 extra lives", async () => {
    configureAutopilot(makeSummit({ current_health: 3, extra_lives: 1 }));

    await renderHook();
    await settlePoisonTransaction();

    expect(actionTypes()).toEqual(["apply_poison"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(102_000);
    });

    expect(actionTypes()).toContain("attack");
  });

  it("clears the poison wait when the summit beast changes and evaluates the new summit", async () => {
    configureAutopilot(makeSummit());

    await renderHook();
    await settlePoisonTransaction();

    expect(actionTypes()).toEqual(["apply_poison"]);

    await act(async () => {
      useGameStore.getState().setSummit(makeSummit({
        token_id: 2002,
        current_health: 1,
        extra_lives: 0,
      }));
    });

    expect(actionTypes()).toContain("attack");
  });
});

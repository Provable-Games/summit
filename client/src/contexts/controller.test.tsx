import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  accountAddress: undefined as string | undefined,
  connector: null as unknown,
  connectors: [] as Array<{ id: string }>,
};

const connectMock = vi.fn();
const disconnectMock = vi.fn();
const setCollectionMock = vi.fn();
const setAdventurerCollectionMock = vi.fn();
const setLoadingCollectionMock = vi.fn();
const setCollectionSyncingMock = vi.fn();
const getTokenBalancesMock = vi.fn(async () => ({}));
const getBeastsByOwnerMock = vi.fn(async () => []);
type ValidAdventurer = { token_id: number; score: number };
const getValidAdventurersMock = vi.fn<(owner?: string) => Promise<ValidAdventurer[]>>(async () => []);
const identifyAddressMock = vi.fn();

vi.mock("@starknet-react/core", () => ({
  useAccount: () => ({
    account: mockState.accountAddress
      ? { address: mockState.accountAddress }
      : undefined,
    isConnecting: false,
  }),
  useConnect: () => ({
    connector: mockState.connector,
    connectors: mockState.connectors,
    connect: connectMock,
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: disconnectMock,
  }),
}));

vi.mock("@/stores/gameStore", () => ({
  useGameStore: () => ({
    setCollection: setCollectionMock,
    setAdventurerCollection: setAdventurerCollectionMock,
    setLoadingCollection: setLoadingCollectionMock,
    setCollectionSyncing: setCollectionSyncingMock,
  }),
}));

vi.mock("@/api/starknet", () => ({
  useStarknetApi: () => ({
    getTokenBalances: getTokenBalancesMock,
  }),
}));

vi.mock("@/api/summitApi", () => ({
  useSummitApi: () => ({
    getBeastsByOwner: getBeastsByOwnerMock,
  }),
}));

vi.mock("@/dojo/useGameTokens", () => ({
  useGameTokens: () => ({
    getValidAdventurers: getValidAdventurersMock,
  }),
}));

vi.mock("@/utils/analytics", () => ({
  useAnalytics: () => ({
    identifyAddress: identifyAddressMock,
  }),
}));

vi.mock("./starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: {
      tokens: {
        erc20: [],
      },
      paymentTokens: [],
    },
  }),
}));

import { ControllerProvider, useController } from "./controller";

let capturedController: ReturnType<typeof useController>;

function Probe() {
  capturedController = useController();
  return null;
}

async function renderProvider() {
  await act(async () => {
    create(
      <ControllerProvider>
        <Probe />
      </ControllerProvider>,
    );
  });
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("ControllerProvider.filterValidAdventurers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.accountAddress = undefined;
    mockState.connector = null;
    mockState.connectors = [];
  });

  it("guards when no account address is present", async () => {
    await renderProvider();

    await act(async () => {
      await capturedController.filterValidAdventurers();
    });

    expect(getValidAdventurersMock).not.toHaveBeenCalled();
    expect(setAdventurerCollectionMock).toHaveBeenCalledWith([]);
  });

  it("maps valid adventurers into full Adventurer shape", async () => {
    mockState.accountAddress = "0xabc";
    getValidAdventurersMock.mockResolvedValue([
      { token_id: 81, score: 100 },
    ]);

    await renderProvider();

    // Clear calls from mount effects to assert the explicit method invocation.
    getValidAdventurersMock.mockClear();
    setAdventurerCollectionMock.mockClear();
    getValidAdventurersMock.mockResolvedValue([
      { token_id: 81, score: 100 },
    ]);

    await act(async () => {
      await capturedController.filterValidAdventurers();
    });

    expect(getValidAdventurersMock).toHaveBeenCalledWith("0xabc");
    expect(setAdventurerCollectionMock).toHaveBeenCalledWith([
      {
        id: 81,
        name: "Adventurer #81",
        level: 10,
        metadata: null,
        soulbound: false,
      },
    ]);
  });

  it("sets username when connector provides username()", async () => {
    const usernameMock = vi.fn(async () => "Savage");
    mockState.connector = { username: usernameMock };

    await renderProvider();
    await flushEffects();

    expect(usernameMock).toHaveBeenCalled();
    expect(capturedController.playerName).toBe("Savage");
  });

  it("clears username when connector does not provide username()", async () => {
    mockState.connector = {};

    await renderProvider();
    await flushEffects();

    expect(capturedController.playerName).toBeUndefined();
  });

  it("ignores non-function username fields", async () => {
    mockState.connector = { username: "Savage" };

    await renderProvider();
    await flushEffects();

    expect(capturedController.playerName).toBeUndefined();
  });

  it("handles username fetch failures without throwing", async () => {
    const error = new Error("username failed");
    const usernameMock = vi.fn(async () => {
      throw error;
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockState.connector = { username: usernameMock };

    await renderProvider();
    await flushEffects();

    expect(usernameMock).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error getting username:", error);
    consoleErrorSpy.mockRestore();
  });

  it("opens profile when connector exposes controller.openProfile()", async () => {
    const openProfileMock = vi.fn();
    mockState.connector = { controller: { openProfile: openProfileMock } };

    await renderProvider();
    await act(async () => {
      capturedController.openProfile();
    });

    expect(openProfileMock).toHaveBeenCalled();
  });

  it("no-ops openProfile when connector has no controller profile API", async () => {
    mockState.connector = {};

    await renderProvider();
    await act(async () => {
      capturedController.openProfile();
    });

    expect(connectMock).not.toHaveBeenCalled();
  });

  it("no-ops openProfile when controller.openProfile is not a function", async () => {
    mockState.connector = { controller: { openProfile: "noop" } };

    await renderProvider();
    await act(async () => {
      capturedController.openProfile();
    });

    expect(connectMock).not.toHaveBeenCalled();
  });
});

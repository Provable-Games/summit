import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = {
  accountAddress: undefined as string | undefined,
};

const connectMock = vi.fn();
const disconnectMock = vi.fn();
const setCollectionMock = vi.fn();
const setAdventurerCollectionMock = vi.fn();
const setLoadingCollectionMock = vi.fn();
const setCollectionSyncingMock = vi.fn();
const getTokenBalancesMock = vi.fn(async () => ({}));
const getBeastsByOwnerMock = vi.fn(async () => []);
const getValidAdventurersMock = vi.fn(async () => []);
const identifyAddressMock = vi.fn();

vi.mock("@starknet-react/core", () => ({
  useAccount: () => ({
    account: mockState.accountAddress
      ? { address: mockState.accountAddress }
      : undefined,
    isConnecting: false,
  }),
  useConnect: () => ({
    connector: null,
    connectors: [],
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

describe("ControllerProvider.filterValidAdventurers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.accountAddress = undefined;
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
});

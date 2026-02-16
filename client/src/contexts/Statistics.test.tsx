import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSwapQuoteMock, getBeastCountsMock, getQuestRewardsTotalMock, mockNetworkConfig } = vi.hoisted(() => ({
  getSwapQuoteMock: vi.fn(async () => ({ total: "-2000000000000000000", totalDisplay: -2e18 })),
  getBeastCountsMock: vi.fn(async () => ({ total: 12, alive: 5, dead: 7 })),
  getQuestRewardsTotalMock: vi.fn(async () => 25),
  mockNetworkConfig: {
    tokens: {
      erc20: [
        { name: "ATTACK", address: "0xattack" },
        { name: "SKULL", address: "0xskull" },
      ],
    },
  },
}));

vi.mock("@/api/ekubo", () => ({
  getSwapQuote: getSwapQuoteMock,
}));

vi.mock("@/api/summitApi", () => ({
  useSummitApi: () => ({
    getBeastCounts: getBeastCountsMock,
    getQuestRewardsTotal: getQuestRewardsTotalMock,
  }),
}));

vi.mock("./starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: mockNetworkConfig,
  }),
}));

import { StatisticsProvider, useStatistics } from "./Statistics";

let capturedStatistics: ReturnType<typeof useStatistics>;

function Probe() {
  capturedStatistics = useStatistics();
  return null;
}

async function renderProvider() {
  await act(async () => {
    create(
      <StatisticsProvider>
        <Probe />
      </StatisticsProvider>,
    );
  });
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("StatisticsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads beast counts and token prices on mount", async () => {
    await renderProvider();
    await flushEffects();

    expect(getBeastCountsMock).toHaveBeenCalledTimes(1);
    expect(getQuestRewardsTotalMock).toHaveBeenCalledTimes(1);
    expect(getSwapQuoteMock).toHaveBeenCalledTimes(2);
    const firstCall = getSwapQuoteMock.mock.calls[0] as unknown as [bigint, string, string];
    const secondCall = getSwapQuoteMock.mock.calls[1] as unknown as [bigint, string, string];
    expect(firstCall[0]).toBe(-1n * 10n ** 18n);
    expect(firstCall[1]).toBe("0xattack");
    expect(secondCall[0]).toBe(-1n * 10n ** 18n);
    expect(secondCall[1]).toBe("0xskull");
    expect(capturedStatistics.tokenPrices.ATTACK).toBe("2.0000");
    expect(capturedStatistics.tokenPrices.SKULL).toBe("2.0000");
    expect(capturedStatistics.questRewardsRemaining).toBe(75);
  });

  it("refreshTokenPrices scans supported token names safely", async () => {
    await renderProvider();
    getSwapQuoteMock.mockClear();

    await act(async () => {
      await capturedStatistics.refreshTokenPrices();
    });

    expect(getSwapQuoteMock).toHaveBeenCalledTimes(2);
  });
});

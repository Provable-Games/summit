import React, { forwardRef } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  fetchBeastCountsMock: vi.fn(),
  setLeaderboardMock: vi.fn(),
  getLeaderboardMock: vi.fn(),
  lookupAddressNamesMock: vi.fn(),
  state: {
    summit: null as unknown,
    leaderboard: [] as Array<{ owner: string; amount: number }>,
  },
}));

vi.mock("@/contexts/Statistics", () => ({
  useStatistics: () => ({
    beastsRegistered: 10,
    beastsAlive: 3,
    fetchBeastCounts: hoisted.fetchBeastCountsMock,
  }),
}));

vi.mock("@/stores/gameStore", () => ({
  useGameStore: () => ({
    summit: hoisted.state.summit,
    leaderboard: hoisted.state.leaderboard,
    setLeaderboard: hoisted.setLeaderboardMock,
  }),
}));

vi.mock("@/api/summitApi", () => ({
  useSummitApi: () => ({
    getLeaderboard: hoisted.getLeaderboardMock,
  }),
}));

vi.mock("@/utils/addressNameCache", () => ({
  lookupAddressNames: hoisted.lookupAddressNamesMock,
}));

vi.mock("./DiplomacyPopover", () => ({
  DiplomacyPopover: () => null,
}));

vi.mock("./RewardsRemainingBar", () => ({
  default: () => null,
}));

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");

  const IconButton = forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
    ({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    ),
  );
  IconButton.displayName = "MockIconButton";

  return {
    ...actual,
    IconButton,
  };
});

import Leaderboard from "./Leaderboard";

const apiLeaderboard = [
  { owner: "0x111", amount: 500 },
  { owner: "0x222", amount: 450 },
  { owner: "0x333", amount: 400 },
  { owner: "0x444", amount: 350 },
  { owner: "0x555", amount: 300 },
  { owner: "0x666", amount: 250 },
];

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-13T20:00:00Z"));

    hoisted.state.summit = {
      owner: "0x0abc",
      block_timestamp: Math.floor(Date.now() / 1000) - 60,
      beast: {
        token_id: 77,
        diplomacy: false,
      },
      diplomacy: {
        beasts: [
          { owner: "0x0d1", power: 11 },
          { owner: "0x0d2", power: 22 },
        ],
      },
    };

    hoisted.state.leaderboard = [
      { owner: "0x0abc", amount: 100 },
      { owner: "0x999", amount: 200 },
    ];

    hoisted.getLeaderboardMock.mockResolvedValue(apiLeaderboard);
    hoisted.lookupAddressNamesMock.mockImplementation(async (addresses: string[]) => {
      const mapped = addresses.map(
        (address): [string, string] => [
          address.replace(/^0x0+/, "0x").toLowerCase(),
          `name-${address}`,
        ],
      );
      return new Map(mapped);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads leaderboard data, resolves names, and computes summit owner rank path", async () => {
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<Leaderboard />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hoisted.getLeaderboardMock).toHaveBeenCalledTimes(1);
    expect(hoisted.setLeaderboardMock).toHaveBeenCalledWith(apiLeaderboard);

    const lookupArgs = hoisted.lookupAddressNamesMock.mock.calls[0]?.[0] ?? [];
    expect(lookupArgs).toEqual(
      expect.arrayContaining([
        "0x111",
        "0x222",
        "0x333",
        "0x444",
        "0x555",
        "0x0abc",
        "0x0d1",
        "0x0d2",
      ]),
    );

    const renderedText = JSON.stringify(renderer!.toJSON());
    expect(renderedText).toContain("SUMMIT");
    expect(renderedText).toContain("Diplomacy");
  });
});

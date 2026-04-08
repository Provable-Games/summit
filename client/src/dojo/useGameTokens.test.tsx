import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNetworkConfig = {
  apiUrl: "https://api.test",
  toriiUrl: "https://torii.test",
  dungeon: "0x1234",
};

vi.mock("@/contexts/starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: mockNetworkConfig,
  }),
}));

import { useGameTokens } from "./useGameTokens";

let hookApi: ReturnType<typeof useGameTokens>;

function HookHarness() {
  hookApi = useGameTokens();
  return null;
}

describe("useGameTokens:getValidAdventurers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    act(() => {
      create(<HookHarness />);
    });
  });

  it("returns empty list when owner is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(hookApi.getValidAdventurers(undefined)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queries torii SQL then checks claimed IDs via API", async () => {
    const fetchMock = vi
      .fn()
      // First call: Torii SQL returns 3 game-over tokens
      .mockResolvedValueOnce({
        json: async () => [
          { token_id: "0x10", score: "0x32" },
          { token_id: "0x12", score: "0x50" },
          { token_id: "0x13", score: "0x51" },
        ],
      })
      // Second call: claimed check says 16 and 18 are claimed
      .mockResolvedValueOnce({
        json: async () => ({
          claimed_ids: ["16", "18"],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    // Only token 0x13 (19) should survive filtering
    await expect(hookApi.getValidAdventurers("0xABCD")).resolves.toEqual([
      { token_id: 19, score: 81 },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // First call is Torii SQL
    const sqlUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(decodeURIComponent(sqlUrl)).toContain("https://torii.test/sql?query=");

    // Second call is POST to claimed check
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.test/adventurers/claimed");
    const postBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(postBody).toEqual({ ids: [16, 18, 19] });
  });

  it("skips claimed check when torii returns no tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => [] });

    vi.stubGlobal("fetch", fetchMock);

    await expect(hookApi.getValidAdventurers("0xABCD")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

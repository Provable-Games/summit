import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNetworkConfig = {
  apiUrl: "https://api.test",
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

  it("calls /adventurers/claimable and maps response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        adventurers: [
          { id: "1234567890", score: 88, player_name: "lordkb" },
          { id: "999999999999999999999", score: 234 },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(hookApi.getValidAdventurers("0xABCD")).resolves.toEqual([
      { token_id: "1234567890", score: 88, player_name: "lordkb" },
      { token_id: "999999999999999999999", score: 234, player_name: undefined },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("https://api.test/adventurers/claimable?owner=");
    expect(decodeURIComponent(url)).toContain("0x000000000000000000000000000000000000000000000000000000000000abcd");
  });

  it("returns empty when API responds non-OK", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(hookApi.getValidAdventurers("0xABCD")).resolves.toEqual([]);
  });
});

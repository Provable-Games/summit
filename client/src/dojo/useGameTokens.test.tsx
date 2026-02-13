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

  it("queries corpse API and torii SQL then maps rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          adventurer_ids: ["0x10", "0x12"],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [
          { token_id: "0x13", score: "0x51" },
          { token_id: "0x14", score: "0x64" },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(hookApi.getValidAdventurers("0xABCD")).resolves.toEqual([
      { token_id: 19, score: 81 },
      { token_id: 20, score: 100 },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/adventurers/0xABCD");

    const sqlUrl = String(fetchMock.mock.calls[1]?.[0] ?? "");
    const decodedSqlUrl = decodeURIComponent(sqlUrl);
    expect(decodedSqlUrl).toContain("https://torii.test/sql?query=");
    expect(decodedSqlUrl).toContain('AND tm.id > "0x0000000000000012"');
  });
});

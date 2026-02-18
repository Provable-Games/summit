import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: {
      apiUrl: "https://api.test",
    },
  }),
}));

import { useSummitApi } from "./summitApi";

describe("useSummitApi:getQuestRewardsTotal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns quest reward total without extra scaling", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ total: 95 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { getQuestRewardsTotal } = useSummitApi();
    const total = await getQuestRewardsTotal();

    expect(total).toBe(95);
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/quest-rewards/total");
  });

  it("throws when quest rewards request fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { getQuestRewardsTotal } = useSummitApi();

    await expect(getQuestRewardsTotal()).rejects.toThrow(
      "Failed to fetch quest rewards total: 503",
    );
  });
});

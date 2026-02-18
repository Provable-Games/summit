import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/starknet", () => ({
  useDynamicConnector: () => ({
    currentNetworkConfig: {
      rpcUrl: "https://rpc.test",
    },
  }),
}));

vi.mock("@starknet-react/core", () => ({
  useAccount: () => ({
    address: "0xabc",
  }),
}));

vi.mock("@/utils/beasts", () => ({
  getBeastCurrentLevel: vi.fn(() => 7),
  getBeastDetails: vi.fn(() => ({ beast_name: "Mock Beast" })),
}));

vi.mock("@/utils/utils", () => ({
  parseBalances: vi.fn(() => ({})),
}));

import { useStarknetApi } from "./starknet";

type RpcResult = Array<string | undefined>;

function baseResult(): RpcResult {
  const result: RpcResult = Array.from(
    { length: 31 },
    (_, index) => `0x${(index + 1).toString(16)}`,
  );
  result[28] = "0xowner";
  return result;
}

function mockSummitResponse(result: RpcResult) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      json: async () => ({ result }),
    })),
  );
}

describe("useStarknetApi:getSummitData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps all packed bool flags from hex", async () => {
    const result = baseResult();
    result[18] = "0x1";
    result[19] = "0x0";
    result[20] = "0x1";
    result[23] = "0x1";
    result[24] = "0x0";
    result[25] = "0x1";
    result[26] = "0x1";
    mockSummitResponse(result);

    const { getSummitData } = useStarknetApi();
    const summit = await getSummitData();

    expect(summit?.beast.specials).toBe(true);
    expect(summit?.beast.wisdom).toBe(false);
    expect(summit?.beast.diplomacy).toBe(true);
    expect(summit?.beast.captured_summit).toBe(true);
    expect(summit?.beast.used_revival_potion).toBe(false);
    expect(summit?.beast.used_attack_potion).toBe(true);
    expect(summit?.beast.max_attack_streak).toBe(true);
  });

  it("defaults undefined and non-1 flag values to false", async () => {
    const result = baseResult();
    result[18] = undefined;
    result[19] = "0x2";
    result[20] = undefined;
    result[23] = "0x0";
    result[24] = undefined;
    result[25] = "0x5";
    result[26] = undefined;
    mockSummitResponse(result);

    const { getSummitData } = useStarknetApi();
    const summit = await getSummitData();

    expect(summit?.beast.specials).toBe(false);
    expect(summit?.beast.wisdom).toBe(false);
    expect(summit?.beast.diplomacy).toBe(false);
    expect(summit?.beast.captured_summit).toBe(false);
    expect(summit?.beast.used_revival_potion).toBe(false);
    expect(summit?.beast.used_attack_potion).toBe(false);
    expect(summit?.beast.max_attack_streak).toBe(false);
  });
});

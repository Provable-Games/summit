import { describe, expect, it } from "vitest";
import type { NormalizedEvent } from "@apibara/starknet-rpc";
import { EVENT_SELECTORS, BEAST_EVENT_SELECTORS, GAME_EVENT_SELECTOR, feltToHex } from "./decoder.js";
import { buildSummitRpcEventFilter, adaptRpcEvent } from "./starknet-rpc-events.js";
import type { SummitConfig } from "./config.js";

const config: SummitConfig = {
  summitContractAddress: "0x1",
  beastsContractAddress: "0x2",
  collectableContractAddress: "0x3",
  corpseContractAddress: "0x4",
  skullContractAddress: "0x5",
  xlifeTokenAddress: "0x6",
  attackTokenAddress: "0x7",
  reviveTokenAddress: "0x8",
  poisonTokenAddress: "0x9",
  startingBlock: "10",
};

describe("starknet RPC event adapter", () => {
  it("builds one global first-key filter for the Summit event surface", () => {
    const filter = buildSummitRpcEventFilter(config);

    expect(filter.addresses).toEqual([
      "0x1",
      "0x2",
      "0x3",
      "0x4",
      "0x5",
      "0x6",
      "0x7",
      "0x8",
      "0x9",
    ].map(feltToHex));

    expect(filter.keys).toHaveLength(1);
    expect(filter.keys[0]).toEqual(expect.arrayContaining([
      EVENT_SELECTORS.BeastUpdatesEvent,
      EVENT_SELECTORS.LiveBeastStatsEvent,
      EVENT_SELECTORS.RewardsEarnedEvent,
      EVENT_SELECTORS.RewardsClaimedEvent,
      EVENT_SELECTORS.PoisonEvent,
      EVENT_SELECTORS.CorpseEvent,
      EVENT_SELECTORS.SkullEvent,
      EVENT_SELECTORS.BattleEvent,
      EVENT_SELECTORS.QuestRewardsClaimedEvent,
      BEAST_EVENT_SELECTORS.Transfer,
      GAME_EVENT_SELECTOR,
    ]));
  });

  it("adapts a NormalizedEvent to the existing decoder event shape", () => {
    const rpcEvent: NormalizedEvent = {
      cursor: {
        blockNumber: 123,
        transactionHash: "0xabc",
        eventIndex: 7,
      },
      fromAddress: "0x123",
      keys: ["0x1", "0x2"],
      data: ["0x3", "0x4"],
      blockHash: "0xbeef",
      blockNumber: 123,
      transactionHash: "0xabc",
      eventIndex: 7,
      raw: {
        from_address: "0x123",
        keys: ["0x1", "0x2"],
        data: ["0x3", "0x4"],
        block_hash: "0xbeef",
        block_number: 123,
        transaction_hash: "0xabc",
        event_index: 7,
      },
    };

    expect(adaptRpcEvent(rpcEvent)).toEqual({
      address: feltToHex("0x123"),
      keys: [feltToHex("0x1"), feltToHex("0x2")],
      data: [feltToHex("0x3"), feltToHex("0x4")],
      transactionHash: feltToHex("0xabc"),
      eventIndex: 7,
    });
  });
});

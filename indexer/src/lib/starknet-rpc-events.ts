import {
  BEAST_EVENT_SELECTORS,
  EVENT_SELECTORS,
  GAME_EVENT_SELECTOR,
  feltToHex,
} from "./decoder.js";
import type { SummitConfig } from "./config.js";
import type { NormalizedEvent } from "@apibara/starknet-rpc";

export interface SummitIndexedEvent {
  address: string;
  keys: string[];
  data: string[];
  transactionHash: string;
  eventIndex: number;
}

export interface SummitRpcEventFilter {
  addresses: string[];
  keys: string[][];
}

export const SUMMIT_RPC_FIRST_KEY_SELECTORS = [
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
] as const;

export function buildSummitRpcEventFilter(config: SummitConfig): SummitRpcEventFilter {
  return {
    addresses: [
      config.summitContractAddress,
      config.beastsContractAddress,
      config.collectableContractAddress,
      config.corpseContractAddress,
      config.skullContractAddress,
      config.xlifeTokenAddress,
      config.attackTokenAddress,
      config.reviveTokenAddress,
      config.poisonTokenAddress,
    ].map(feltToHex),
    keys: [[...new Set(SUMMIT_RPC_FIRST_KEY_SELECTORS)].map(feltToHex)],
  };
}

export function adaptRpcEvent(event: NormalizedEvent): SummitIndexedEvent {
  return {
    address: feltToHex(event.fromAddress),
    keys: event.keys.map(feltToHex),
    data: event.data.map(feltToHex),
    transactionHash: feltToHex(event.transactionHash),
    eventIndex: event.eventIndex,
  };
}

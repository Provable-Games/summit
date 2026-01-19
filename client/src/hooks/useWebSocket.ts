/**
 * WebSocket Subscription Hook
 * Manages WebSocket connection with automatic reconnection and channel subscriptions
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Channels supported by the Summit API
export type Channel = "beast_update" | "battle" | "summit" | "poison" | "reward";

// WebSocket message types
interface SubscribeMessage {
  type: "subscribe";
  channels: Channel[];
  beastTokenIds?: number[];
}

interface UnsubscribeMessage {
  type: "unsubscribe";
  channels: Channel[];
}

interface PingMessage {
  type: "ping";
}

type OutgoingMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

// Incoming message payloads - using snake_case to match existing client types
export interface BeastUpdateData {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: string;
  revival_count: number;
  extra_lives: number;
  has_claimed_potions: number;
  blocks_held: number;
  spirit: number;
  luck: number;
  specials: number;
  wisdom: number;
  diplomacy: number;
  rewards_earned: number;
  rewards_claimed: number;
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

export interface BattleData {
  attacking_beast_token_id: number;
  attack_index: number;
  defending_beast_token_id: number;
  attack_count: number;
  attack_damage: number;
  critical_attack_count: number;
  critical_attack_damage: number;
  counter_attack_count: number;
  counter_attack_damage: number;
  critical_counter_attack_count: number;
  critical_counter_attack_damage: number;
  attack_potions: number;
  xp_gained: number;
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

export interface SummitData {
  beast_token_id: number;
  beast_id: number;
  beast_prefix: number;
  beast_suffix: number;
  beast_level: number;
  beast_health: number;
  beast_shiny: number;
  beast_animated: number;
  current_health: number;
  bonus_health: number;
  blocks_held: number;
  owner: string;
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

export interface PoisonData {
  beast_token_id: number;
  block_timestamp: string;
  count: number;
  player: string;
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

export interface RewardData {
  reward_block_number: string;
  beast_token_id: number;
  owner: string;
  amount: number;
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

// Incoming message types
interface BeastUpdateMessage {
  type: "beast_update";
  data: BeastUpdateData;
}

interface BattleMessage {
  type: "battle";
  data: BattleData;
}

interface SummitMessage {
  type: "summit";
  data: SummitData;
}

interface PoisonMessage {
  type: "poison";
  data: PoisonData;
}

interface RewardMessage {
  type: "reward";
  data: RewardData;
}

interface SubscribedMessage {
  type: "subscribed";
  channels: Channel[];
}

interface UnsubscribedMessage {
  type: "unsubscribed";
  channels: Channel[];
}

interface PongMessage {
  type: "pong";
}

type IncomingMessage =
  | BeastUpdateMessage
  | BattleMessage
  | SummitMessage
  | PoisonMessage
  | RewardMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage;

// Connection state
export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

// Hook options
export interface UseWebSocketOptions {
  url: string;
  channels: Channel[];
  beastTokenIds?: number[];
  onBeastUpdate?: (data: BeastUpdateData) => void;
  onBattle?: (data: BattleData) => void;
  onSummit?: (data: SummitData) => void;
  onPoison?: (data: PoisonData) => void;
  onReward?: (data: RewardData) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  enabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  pingInterval?: number;
}

// Hook return type
export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  subscribe: (channels: Channel[], beastTokenIds?: number[]) => void;
  unsubscribe: (channels: Channel[]) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    channels,
    beastTokenIds,
    onBeastUpdate,
    onBattle,
    onSummit,
    onPoison,
    onReward,
    onConnectionChange,
    enabled = true,
    maxReconnectAttempts = 10,
    reconnectBaseDelay = 1000,
    pingInterval = 30000,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Store callbacks in refs to avoid stale closures
  const callbacksRef = useRef({
    onBeastUpdate,
    onBattle,
    onSummit,
    onPoison,
    onReward,
    onConnectionChange,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onBeastUpdate,
      onBattle,
      onSummit,
      onPoison,
      onReward,
      onConnectionChange,
    };
  }, [onBeastUpdate, onBattle, onSummit, onPoison, onReward, onConnectionChange]);

  // Update connection state and notify
  const updateConnectionState = useCallback((state: ConnectionState) => {
    if (!mountedRef.current) return;
    setConnectionState(state);
    callbacksRef.current.onConnectionChange?.(state);
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((message: OutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: IncomingMessage = JSON.parse(event.data);

      switch (message.type) {
        case "beast_update":
          callbacksRef.current.onBeastUpdate?.(message.data);
          break;
        case "battle":
          callbacksRef.current.onBattle?.(message.data);
          break;
        case "summit":
          callbacksRef.current.onSummit?.(message.data);
          break;
        case "poison":
          callbacksRef.current.onPoison?.(message.data);
          break;
        case "reward":
          callbacksRef.current.onReward?.(message.data);
          break;
        case "subscribed":
          console.log("[WebSocket] Subscribed to:", message.channels);
          break;
        case "unsubscribed":
          console.log("[WebSocket] Unsubscribed from:", message.channels);
          break;
        case "pong":
          // Heartbeat received
          break;
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateConnectionState(
      reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting"
    );

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log("[WebSocket] Connected to:", url);
        reconnectAttemptsRef.current = 0;
        updateConnectionState("connected");

        // Subscribe to channels
        if (channels.length > 0) {
          sendMessage({
            type: "subscribe",
            channels,
            beastTokenIds,
          });
        }

        // Start ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          sendMessage({ type: "ping" });
        }, pingInterval);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log("[WebSocket] Connection closed:", event.code, event.reason);
        updateConnectionState("disconnected");

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection
        if (
          enabled &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          event.code !== 1000 // Normal closure
        ) {
          const delay =
            reconnectBaseDelay * Math.pow(2, reconnectAttemptsRef.current);
          const cappedDelay = Math.min(delay, 30000); // Cap at 30 seconds

          console.log(
            `[WebSocket] Reconnecting in ${cappedDelay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, cappedDelay);
        }
      };
    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
      updateConnectionState("disconnected");
    }
  }, [
    url,
    enabled,
    channels,
    beastTokenIds,
    handleMessage,
    sendMessage,
    updateConnectionState,
    maxReconnectAttempts,
    reconnectBaseDelay,
    pingInterval,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    updateConnectionState("disconnected");
  }, [maxReconnectAttempts, updateConnectionState]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Subscribe to additional channels
  const subscribe = useCallback(
    (newChannels: Channel[], newBeastTokenIds?: number[]) => {
      sendMessage({
        type: "subscribe",
        channels: newChannels,
        beastTokenIds: newBeastTokenIds,
      });
    },
    [sendMessage]
  );

  // Unsubscribe from channels
  const unsubscribe = useCallback(
    (channelsToRemove: Channel[]) => {
      sendMessage({
        type: "unsubscribe",
        channels: channelsToRemove,
      });
    },
    [sendMessage]
  );

  // Initial connection
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [url, enabled]); // Only reconnect when URL or enabled changes

  // Re-subscribe when channels change
  useEffect(() => {
    if (connectionState === "connected" && channels.length > 0) {
      sendMessage({
        type: "subscribe",
        channels,
        beastTokenIds,
      });
    }
  }, [channels.join(","), beastTokenIds?.join(","), connectionState, sendMessage]);

  return {
    connectionState,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
  };
}

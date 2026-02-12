/**
 * WebSocket Subscription Hook
 * Manages WebSocket connection with automatic reconnection
 *
 * Channels:
 * - summit: Beast stats updates for summit beast
 * - event: Activity feed from summit_log
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type Channel = "summit" | "event";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface SummitData {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: number;
  revival_count: number;
  extra_lives: number;
  captured_summit: boolean;
  used_revival_potion: boolean;
  used_attack_potion: boolean;
  max_attack_streak: boolean;
  summit_held_seconds: number;
  spirit: number;
  luck: number;
  specials: boolean;
  wisdom: boolean;
  diplomacy: boolean;
  rewards_earned: number;
  rewards_claimed: number;
  block_number: number;
  block_timestamp: number;
  transaction_hash?: string;
  // Beast data from trigger join
  beast_id: number;
  prefix: number;
  suffix: number;
  level: number;
  health: number;
  shiny: number;
  animated: number;
  owner: string | null;
}

export interface EventData {
  id: string;
  block_number: string;
  event_index: number;
  category: string;
  sub_category: string;
  data: Record<string, unknown>;
  player: string | null;
  token_id: number | null;
  transaction_hash: string;
  created_at: string;
}

export interface UseWebSocketOptions {
  url: string;
  channels: Channel[];
  onSummit?: (data: SummitData) => void;
  onEvent?: (data: EventData) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  enabled?: boolean;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    channels,
    onSummit,
    onEvent,
    onConnectionChange,
    enabled = true,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const callbacksRef = useRef({ onSummit, onEvent, onConnectionChange });

  useEffect(() => {
    callbacksRef.current = { onSummit, onEvent, onConnectionChange };
  }, [onSummit, onEvent, onConnectionChange]);

  const updateConnectionState = useCallback((state: ConnectionState) => {
    if (!mountedRef.current) return;
    setConnectionState(state);
    callbacksRef.current.onConnectionChange?.(state);
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "summit":
          callbacksRef.current.onSummit?.(message.data);
          break;
        case "event":
          callbacksRef.current.onEvent?.(message.data);
          break;
        case "subscribed":
          console.log("[WebSocket] Subscribed to:", message.channels);
          break;
        case "pong":
          break;
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateConnectionState("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log("[WebSocket] Connected to:", url);
        reconnectAttemptsRef.current = 0;
        updateConnectionState("connected");

        if (channels.length > 0) {
          ws.send(JSON.stringify({ type: "subscribe", channels }));
        }

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log("[WebSocket] Connection closed:", event.code);
        updateConnectionState("disconnected");

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Reconnect unless intentionally closed
        // First 5 attempts: exponential backoff (1s, 2s, 4s, 8s, 16s)
        // After that: 30s interval forever
        if (enabled && event.code !== 1000) {
          const delay = reconnectAttemptsRef.current < 5
            ? 1000 * Math.pow(2, reconnectAttemptsRef.current)
            : 30000;

          console.log(`[WebSocket] Reconnecting in ${delay / 1000}s...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
      updateConnectionState("disconnected");
    }
  }, [url, enabled, channels, handleMessage, updateConnectionState]);

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

    updateConnectionState("disconnected");
  }, [updateConnectionState]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return { connectionState };
}

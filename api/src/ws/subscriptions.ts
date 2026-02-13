/**
 * WebSocket Subscription Hub
 * Uses PostgreSQL LISTEN/NOTIFY for real-time updates
 *
 * Channels:
 * - summit: Beast stats updates for summit beast
 * - event: Activity feed from summit_log
 */

import { pool } from "../db/client.js";
import type pg from "pg";

interface WebSocketLike {
  send(data: string): void;
  close(): void;
}

export type Channel = "summit" | "event";

interface ClientSubscription {
  ws: WebSocketLike;
  channels: Set<Channel>;
}

interface SummitPayload {
  token_id: number;
  current_health: number;
  bonus_health: number;
  bonus_xp: number;
  attack_streak: number;
  last_death_timestamp: string;
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
  block_number: string;
  transaction_hash: string;
  created_at: string;
}

interface EventPayload {
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

export class SubscriptionHub {
  private clients: Map<string, ClientSubscription> = new Map();
  private pgClient: pg.PoolClient | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Exponential backoff configuration (no max limit - retries forever)
  private reconnectAttempts = 0;
  private readonly baseReconnectDelay = 1000; // 1 second
  private readonly maxReconnectDelay = 30000; // 30 seconds (capped)

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.pgClient = await pool.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset on successful connection

      console.log("[SubscriptionHub] Connected to PostgreSQL for LISTEN");

      this.pgClient.on("notification", (msg) => {
        this.handleNotification(msg);
      });

      this.pgClient.on("error", (err) => {
        console.error("[SubscriptionHub] PostgreSQL client error:", err);
        this.reconnect();
      });

      this.pgClient.on("end", () => {
        console.log("[SubscriptionHub] PostgreSQL client disconnected");
        this.reconnect();
      });

      await this.pgClient.query("LISTEN summit_update");
      await this.pgClient.query("LISTEN summit_log_insert");

      console.log("[SubscriptionHub] Listening on: summit_update, summit_log_insert");
    } catch (error) {
      console.error("[SubscriptionHub] Failed to connect:", error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectTimer) return;

    this.isConnected = false;
    if (this.pgClient) {
      try {
        this.pgClient.release();
      } catch {
        // Ignore release errors
      }
      this.pgClient = null;
    }

    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped at 30s, retries forever)
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `[SubscriptionHub] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})...`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleNotification(msg: pg.Notification): void {
    if (!msg.payload) return;

    try {
      const payload = JSON.parse(msg.payload);

      switch (msg.channel) {
        case "summit_update":
          this.broadcast("summit", payload as SummitPayload);
          break;
        case "summit_log_insert":
          this.broadcast("event", payload as EventPayload);
          break;
      }
    } catch (error) {
      console.error("[SubscriptionHub] Failed to parse notification:", error);
    }
  }

  private broadcast(channel: Channel, data: SummitPayload | EventPayload): void {
    const message = JSON.stringify({ type: channel, data });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has(channel)) continue;
      this.send(client.ws, message);
      sentCount++;
    }

    console.log(`[SubscriptionHub] ${channel} broadcast to ${sentCount}/${this.clients.size} clients`);
  }

  private send(ws: WebSocketLike, message: string): void {
    try {
      ws.send(message);
    } catch (error) {
      console.error("[SubscriptionHub] Failed to send message:", error);
    }
  }

  addClient(id: string, ws: WebSocketLike): void {
    this.clients.set(id, { ws, channels: new Set() });
    console.log(`[SubscriptionHub] Client connected: ${id} (total: ${this.clients.size})`);
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[SubscriptionHub] Client disconnected: ${id} (total: ${this.clients.size})`);
  }

  subscribe(id: string, channels: Channel[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.add(channel);
    }

    console.log(`[SubscriptionHub] Client ${id} subscribed to: ${channels.join(", ")}`);
  }

  unsubscribe(id: string, channels: Channel[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.delete(channel);
    }

    console.log(`[SubscriptionHub] Client ${id} unsubscribed from: ${channels.join(", ")}`);
  }

  handleMessage(id: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(id);
      if (!client) return;

      switch (data.type) {
        case "subscribe":
          this.subscribe(id, data.channels || []);
          this.send(client.ws, JSON.stringify({ type: "subscribed", channels: data.channels }));
          break;

        case "unsubscribe":
          this.unsubscribe(id, data.channels || []);
          this.send(client.ws, JSON.stringify({ type: "unsubscribed", channels: data.channels }));
          break;

        case "ping":
          this.send(client.ws, JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (error) {
      console.error("[SubscriptionHub] Failed to handle message:", error);
    }
  }

  getStatus(): { connected: boolean; clientCount: number } {
    return {
      connected: this.isConnected,
      clientCount: this.clients.size,
    };
  }

  async shutdown(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.pgClient) {
      await this.pgClient.query("UNLISTEN *");
      this.pgClient.release();
    }

    for (const [, client] of this.clients) {
      try {
        client.ws.close();
      } catch {
        // Ignore close errors
      }
    }

    this.clients.clear();
    console.log("[SubscriptionHub] Shutdown complete");
  }
}

let hub: SubscriptionHub | null = null;

export function getSubscriptionHub(): SubscriptionHub {
  if (!hub) {
    hub = new SubscriptionHub();
  }
  return hub;
}

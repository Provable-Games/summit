/**
 * WebSocket Subscription Hub
 * Uses PostgreSQL LISTEN/NOTIFY for real-time updates
 *
 * Channels:
 * - summit_update: Beast stats updates (current_health > 0)
 * - summit_log: Activity feed (all summit_log inserts)
 */

import { pool } from "../db/client.js";
import type pg from "pg";

// WebSocket-like interface for compatibility with different WebSocket implementations
interface WebSocketLike {
  send(data: string): void;
  close(): void;
}

// Subscription channels
export type Channel = "summit_update" | "summit_log";

// Client subscription state
interface ClientSubscription {
  ws: WebSocketLike;
  channels: Set<Channel>;
  beastTokenIds?: Set<number>; // Optional filter for specific beasts
}

// Payload for summit updates (beast_stats with current_health > 0)
interface SummitUpdatePayload {
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
  indexed_at: string;
}

// Payload for summit_log inserts (activity feed)
interface SummitLogPayload {
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
  indexed_at: string;
}

// Subscription hub class
export class SubscriptionHub {
  private clients: Map<string, ClientSubscription> = new Map();
  private pgClient: pg.PoolClient | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connect();
  }

  /**
   * Connect to PostgreSQL and start listening
   */
  private async connect(): Promise<void> {
    try {
      // Get a dedicated client for LISTEN
      this.pgClient = await pool.connect();
      this.isConnected = true;

      console.log("[SubscriptionHub] Connected to PostgreSQL for LISTEN");

      // Set up notification handlers
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

      // Subscribe to channels
      await this.pgClient.query("LISTEN summit_update");
      await this.pgClient.query("LISTEN summit_log_insert");

      console.log("[SubscriptionHub] Listening on: summit_update, summit_log_insert");
    } catch (error) {
      console.error("[SubscriptionHub] Failed to connect:", error);
      this.reconnect();
    }
  }

  /**
   * Reconnect after connection loss
   */
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

    console.log("[SubscriptionHub] Reconnecting in 5 seconds...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  /**
   * Handle incoming PostgreSQL notification
   */
  private handleNotification(msg: pg.Notification): void {
    console.log(`[SubscriptionHub] Received NOTIFY on channel: ${msg.channel}`);

    if (!msg.payload) {
      console.log("[SubscriptionHub] Notification has no payload, ignoring");
      return;
    }

    try {
      const payload = JSON.parse(msg.payload);
      console.log(
        `[SubscriptionHub] Parsed payload for ${msg.channel}:`,
        JSON.stringify(payload).slice(0, 200)
      );
      console.log(
        `[SubscriptionHub] Broadcasting to ${this.clients.size} connected clients`
      );

      switch (msg.channel) {
        case "summit_update":
          this.broadcastSummitUpdate(payload as SummitUpdatePayload);
          break;
        case "summit_log_insert":
          this.broadcastSummitLog(payload as SummitLogPayload);
          break;
        default:
          console.log(`[SubscriptionHub] Unknown channel: ${msg.channel}`);
      }
    } catch (error) {
      console.error(
        "[SubscriptionHub] Failed to parse notification:",
        error,
        "payload:",
        msg.payload
      );
    }
  }

  /**
   * Broadcast summit update to subscribed clients
   * Triggered when beast_stats is updated with current_health > 0
   */
  private broadcastSummitUpdate(payload: SummitUpdatePayload): void {
    const message = JSON.stringify({
      type: "summit_update",
      data: {
        token_id: payload.token_id,
        current_health: payload.current_health,
        bonus_health: payload.bonus_health,
        bonus_xp: payload.bonus_xp,
        attack_streak: payload.attack_streak,
        last_death_timestamp: payload.last_death_timestamp,
        revival_count: payload.revival_count,
        extra_lives: payload.extra_lives,
        has_claimed_potions: payload.has_claimed_potions,
        blocks_held: payload.blocks_held,
        spirit: payload.spirit,
        luck: payload.luck,
        specials: payload.specials,
        wisdom: payload.wisdom,
        diplomacy: payload.diplomacy,
        rewards_earned: payload.rewards_earned,
        rewards_claimed: payload.rewards_claimed,
        block_number: payload.block_number,
        transaction_hash: payload.transaction_hash,
        created_at: payload.created_at,
        indexed_at: payload.indexed_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("summit_update")) continue;

      // Filter by beast token ID if specified
      if (client.beastTokenIds && !client.beastTokenIds.has(payload.token_id)) {
        continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Summit update broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Broadcast summit log entry to subscribed clients
   * Triggered on every summit_log insert for activity feed updates
   */
  private broadcastSummitLog(payload: SummitLogPayload): void {
    const message = JSON.stringify({
      type: "summit_log",
      data: {
        id: payload.id,
        block_number: payload.block_number,
        event_index: payload.event_index,
        category: payload.category,
        sub_category: payload.sub_category,
        data: payload.data,
        player: payload.player,
        token_id: payload.token_id,
        transaction_hash: payload.transaction_hash,
        created_at: payload.created_at,
        indexed_at: payload.indexed_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("summit_log")) continue;

      // Filter by beast token ID if specified
      if (client.beastTokenIds && payload.token_id !== null && !client.beastTokenIds.has(payload.token_id)) {
        continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Summit log broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Send message to WebSocket client
   */
  private send(ws: WebSocketLike, message: string): void {
    try {
      ws.send(message);
    } catch (error) {
      console.error("[SubscriptionHub] Failed to send message:", error);
    }
  }

  /**
   * Add a new WebSocket client
   */
  addClient(id: string, ws: WebSocketLike): void {
    this.clients.set(id, {
      ws,
      channels: new Set(),
    });
    console.log(
      `[SubscriptionHub] Client connected: ${id} (total: ${this.clients.size})`
    );
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(
      `[SubscriptionHub] Client disconnected: ${id} (total: ${this.clients.size})`
    );
  }

  /**
   * Subscribe client to channels
   */
  subscribe(id: string, channels: Channel[], beastTokenIds?: number[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.add(channel);
    }

    if (beastTokenIds) {
      client.beastTokenIds = new Set(beastTokenIds);
    }

    console.log(
      `[SubscriptionHub] Client ${id} subscribed to: ${channels.join(", ")}`
    );
  }

  /**
   * Unsubscribe client from channels
   */
  unsubscribe(id: string, channels: Channel[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.delete(channel);
    }

    console.log(
      `[SubscriptionHub] Client ${id} unsubscribed from: ${channels.join(", ")}`
    );
  }

  /**
   * Handle incoming message from client
   */
  handleMessage(id: string, message: string): void {
    try {
      const data = JSON.parse(message);

      // Get client (may have disconnected between message arrival and processing)
      const client = this.clients.get(id);
      if (!client) {
        console.warn(
          `[SubscriptionHub] Message from unknown/disconnected client: ${id}`
        );
        return;
      }

      switch (data.type) {
        case "subscribe":
          this.subscribe(id, data.channels || [], data.beastTokenIds);
          this.send(
            client.ws,
            JSON.stringify({ type: "subscribed", channels: data.channels })
          );
          break;

        case "unsubscribe":
          this.unsubscribe(id, data.channels || []);
          this.send(
            client.ws,
            JSON.stringify({ type: "unsubscribed", channels: data.channels })
          );
          break;

        case "ping":
          this.send(client.ws, JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (error) {
      console.error("[SubscriptionHub] Failed to handle message:", error);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; clientCount: number } {
    return {
      connected: this.isConnected,
      clientCount: this.clients.size,
    };
  }

  /**
   * Shutdown the hub
   */
  async shutdown(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.pgClient) {
      await this.pgClient.query("UNLISTEN *");
      this.pgClient.release();
    }

    // Close all client connections
    for (const [, client] of this.clients) {
      try {
        if ("close" in client.ws) {
          client.ws.close();
        }
      } catch {
        // Ignore close errors
      }
    }

    this.clients.clear();
    console.log("[SubscriptionHub] Shutdown complete");
  }
}

// Singleton instance
let hub: SubscriptionHub | null = null;

export function getSubscriptionHub(): SubscriptionHub {
  if (!hub) {
    hub = new SubscriptionHub();
  }
  return hub;
}

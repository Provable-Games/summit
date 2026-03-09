/**
 * WebSocket Subscription Hub
 * Uses PostgreSQL LISTEN/NOTIFY for real-time updates
 *
 * Channels:
 * - summit: Beast stats updates for summit beast
 * - event: Activity feed from summit_log
 */

import { pool } from "../db/client.js";
import { log, parsePositiveInt } from "../lib/logging.js";
import type pg from "pg";

interface WebSocketLike {
  send(data: string, cb?: (err?: Error) => void): void;
  close(): void;
  terminate?(): void;
  readyState?: number;
  OPEN?: number;
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

interface HubCounters {
  connections: number;
  disconnections: number;
  subscribes: number;
  unsubscribes: number;
  reconnects: number;
  parseErrors: number;
  messageErrors: number;
  sendErrors: number;
  broadcasts: Record<Channel, number>;
  delivered: Record<Channel, number>;
}

function createCounters(): HubCounters {
  return {
    connections: 0,
    disconnections: 0,
    subscribes: 0,
    unsubscribes: 0,
    reconnects: 0,
    parseErrors: 0,
    messageErrors: 0,
    sendErrors: 0,
    broadcasts: {
      summit: 0,
      event: 0,
    },
    delivered: {
      summit: 0,
      event: 0,
    },
  };
}

export class SubscriptionHub {
  private clients: Map<string, ClientSubscription> = new Map();
  private pgClient: pg.PoolClient | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private summaryTimer: ReturnType<typeof setInterval> | null = null;

  // Exponential backoff configuration (no max limit - retries forever)
  private reconnectAttempts = 0;
  private readonly baseReconnectDelay = 1000; // 1 second
  private readonly maxReconnectDelay = 30000; // 30 seconds (capped)

  private readonly verboseLogs =
    process.env.WS_VERBOSE_LOGS === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test");
  private readonly sendErrorSampleEvery = parsePositiveInt(
    process.env.WS_SEND_ERROR_SAMPLE_EVERY,
    100
  );
  private readonly summaryIntervalMs = parsePositiveInt(
    process.env.WS_LOG_SUMMARY_INTERVAL_MS,
    30_000
  );
  private counters = createCounters();
  private windowCounters = createCounters();

  constructor() {
    this.connect();
    this.startSummaryLogs();
  }

  private startSummaryLogs(): void {
    this.summaryTimer = setInterval(() => {
      const window = this.windowCounters;
      this.windowCounters = createCounters();

      log.info("ws_summary", {
        connected_to_pg: this.isConnected,
        active_clients: this.clients.size,
        reconnect_attempt: this.reconnectAttempts,
        window_connections: window.connections,
        window_disconnections: window.disconnections,
        window_subscribes: window.subscribes,
        window_unsubscribes: window.unsubscribes,
        window_reconnects: window.reconnects,
        window_parse_errors: window.parseErrors,
        window_message_errors: window.messageErrors,
        window_send_errors: window.sendErrors,
        window_broadcasts: window.broadcasts,
        window_delivered: window.delivered,
        total_connections: this.counters.connections,
        total_disconnections: this.counters.disconnections,
        total_send_errors: this.counters.sendErrors,
      });
    }, this.summaryIntervalMs);

    this.summaryTimer.unref?.();
  }

  private bumpCounter(key: keyof Pick<
    HubCounters,
    | "connections"
    | "disconnections"
    | "subscribes"
    | "unsubscribes"
    | "reconnects"
    | "parseErrors"
    | "messageErrors"
    | "sendErrors"
  >): void {
    this.counters[key] += 1;
    this.windowCounters[key] += 1;
  }

  private bumpBroadcast(channel: Channel, delivered: number): void {
    this.counters.broadcasts[channel] += 1;
    this.windowCounters.broadcasts[channel] += 1;
    this.counters.delivered[channel] += delivered;
    this.windowCounters.delivered[channel] += delivered;
  }

  private async connect(): Promise<void> {
    try {
      this.pgClient = await pool.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      log.info("ws_pg_listen_connected");

      this.pgClient.on("notification", (msg) => {
        this.handleNotification(msg);
      });

      this.pgClient.on("error", (err) => {
        log.error("ws_pg_client_error", {
          error: err,
        });
        this.reconnect();
      });

      this.pgClient.on("end", () => {
        log.warn("ws_pg_client_disconnected");
        this.reconnect();
      });

      await this.pgClient.query("LISTEN summit_update");
      await this.pgClient.query("LISTEN summit_log_insert");

      log.info("ws_pg_listening_channels", {
        channels: ["summit_update", "summit_log_insert"],
      });
    } catch (error) {
      log.error("ws_pg_connect_failed", {
        error,
      });
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

    this.reconnectAttempts += 1;
    this.bumpCounter("reconnects");

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    log.warn("ws_pg_reconnect_scheduled", {
      attempt: this.reconnectAttempts,
      delay_ms: delay,
    });

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
      this.bumpCounter("parseErrors");
      log.error("ws_notification_parse_failed", {
        channel: msg.channel,
        error,
      });
    }
  }

  private broadcast(channel: Channel, data: SummitPayload | EventPayload): void {
    const message = JSON.stringify({ type: channel, data });

    let delivered = 0;
    const deadClients: string[] = [];

    for (const [id, client] of this.clients) {
      if (!client.channels.has(channel)) continue;
      if (this.send(id, client.ws, message)) {
        delivered += 1;
      } else {
        deadClients.push(id);
      }
    }

    // Clean up clients that failed to receive the message
    for (const id of deadClients) {
      this.removeDeadClient(id);
    }

    this.bumpBroadcast(channel, delivered);
  }

  /** Returns true if send was attempted, false if the client is already dead. */
  private send(id: string, ws: WebSocketLike, message: string): boolean {
    if (!this.isSocketOpen(ws)) {
      return false;
    }

    try {
      ws.send(message, (error) => {
        if (!error) return;
        this.bumpCounter("sendErrors");
        this.removeDeadClient(id);
      });
      return true;
    } catch (error) {
      this.bumpCounter("sendErrors");
      if (this.windowCounters.sendErrors % this.sendErrorSampleEvery === 1) {
        log.warn("ws_send_failed_sampled", {
          error,
          window_send_errors: this.windowCounters.sendErrors,
          sample_every: this.sendErrorSampleEvery,
        });
      }
      return false;
    }
  }

  private isSocketOpen(ws: WebSocketLike): boolean {
    if (typeof ws.readyState !== "number") return true;

    // ws uses OPEN=1, but fallback keeps this check generic for WebSocket-like types.
    const openState = typeof ws.OPEN === "number" ? ws.OPEN : 1;
    return ws.readyState === openState;
  }

  private closeSocket(ws: WebSocketLike): void {
    try {
      if (typeof ws.terminate === "function") {
        ws.terminate();
        return;
      }
      ws.close();
    } catch {
      // Ignore close errors
    }
  }

  private removeDeadClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    this.clients.delete(id);
    this.closeSocket(client.ws);
    log.info("ws_removed_dead_client", {
      client_id: id,
      total_clients: this.clients.size,
    });
  }

  addClient(id: string, ws: WebSocketLike): void {
    this.clients.set(id, { ws, channels: new Set() });
    this.bumpCounter("connections");
    if (this.verboseLogs) {
      log.debug("ws_client_connected", {
        client_id: id,
        total_clients: this.clients.size,
      });
    }
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    this.bumpCounter("disconnections");
    if (this.verboseLogs) {
      log.debug("ws_client_disconnected", {
        client_id: id,
        total_clients: this.clients.size,
      });
    }
  }

  subscribe(id: string, channels: Channel[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.add(channel);
    }

    this.bumpCounter("subscribes");
    if (this.verboseLogs) {
      log.debug("ws_client_subscribed", {
        client_id: id,
        channels,
      });
    }
  }

  unsubscribe(id: string, channels: Channel[]): void {
    const client = this.clients.get(id);
    if (!client) return;

    for (const channel of channels) {
      client.channels.delete(channel);
    }

    this.bumpCounter("unsubscribes");
    if (this.verboseLogs) {
      log.debug("ws_client_unsubscribed", {
        client_id: id,
        channels,
      });
    }
  }

  handleMessage(id: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(id);
      if (!client) return;

      switch (data.type) {
        case "subscribe": {
          const subChannels = data.channels || [];
          this.subscribe(id, subChannels);
          if (!this.send(id, client.ws, JSON.stringify({ type: "subscribed", channels: subChannels }))) {
            this.removeDeadClient(id);
          }
          break;
        }

        case "unsubscribe": {
          const unsubChannels = data.channels || [];
          this.unsubscribe(id, unsubChannels);
          if (!this.send(id, client.ws, JSON.stringify({ type: "unsubscribed", channels: unsubChannels }))) {
            this.removeDeadClient(id);
          }
          break;
        }

        case "ping":
          if (!this.send(id, client.ws, JSON.stringify({ type: "pong" }))) {
            this.removeDeadClient(id);
          }
          break;
      }
    } catch (error) {
      this.bumpCounter("messageErrors");
      log.warn("ws_handle_message_failed", {
        error,
      });
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

    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
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
    log.info("ws_shutdown_complete");
  }
}

let hub: SubscriptionHub | null = null;

export function getSubscriptionHub(): SubscriptionHub {
  if (!hub) {
    hub = new SubscriptionHub();
  }
  return hub;
}

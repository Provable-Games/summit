/**
 * WebSocket Subscription Hub
 * Uses PostgreSQL LISTEN/NOTIFY for real-time updates
 *
 * Channels:
 * - beast_update: Beast stat changes (LiveBeastStatsEvent, BeastUpdatesEvent)
 * - battle: Combat events (BattleEvent)
 * - summit: Summit takeover events (SummitEvent)
 * - poison: Poison attack events (PoisonEvent)
 * - reward: Reward distribution events (RewardEvent)
 */

import { pool } from "../db/client.js";
import type pg from "pg";

// WebSocket-like interface for compatibility with different WebSocket implementations
interface WebSocketLike {
  send(data: string): void;
  close(): void;
}

// Subscription channels
export type Channel = "beast_update" | "battle" | "summit" | "poison" | "reward";

// Client subscription state
interface ClientSubscription {
  ws: WebSocketLike;
  channels: Set<Channel>;
  beastTokenIds?: Set<number>; // Optional filter for specific beasts
}

// Notification payload interfaces
interface BeastUpdatePayload {
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
  inserted_at: string;
}

interface BattlePayload {
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
  indexed_at: string;
  inserted_at: string;
}

interface SummitPayload {
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
  indexed_at: string;
  inserted_at: string;
}

interface PoisonPayload {
  beast_token_id: number;
  block_timestamp: string;
  count: number;
  player: string;
  block_number: string;
  transaction_hash: string;
  created_at: string;
  indexed_at: string;
  inserted_at: string;
}

interface RewardPayload {
  reward_block_number: string;
  beast_token_id: number;
  owner: string;
  amount: number;
  block_number: string;
  transaction_hash: string;
  created_at: string;
  indexed_at: string;
  inserted_at: string;
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
      await this.pgClient.query("LISTEN beast_update");
      await this.pgClient.query("LISTEN battle");
      await this.pgClient.query("LISTEN summit");
      await this.pgClient.query("LISTEN poison");
      await this.pgClient.query("LISTEN reward");

      console.log(
        "[SubscriptionHub] Listening on: beast_update, battle, summit, poison, reward"
      );
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
        case "beast_update":
          this.broadcastBeastUpdate(payload as BeastUpdatePayload);
          break;
        case "battle":
          this.broadcastBattle(payload as BattlePayload);
          break;
        case "summit":
          this.broadcastSummit(payload as SummitPayload);
          break;
        case "poison":
          this.broadcastPoison(payload as PoisonPayload);
          break;
        case "reward":
          this.broadcastReward(payload as RewardPayload);
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
   * Broadcast beast update to subscribed clients
   */
  private broadcastBeastUpdate(payload: BeastUpdatePayload): void {
    const message = JSON.stringify({
      type: "beast_update",
      data: {
        tokenId: payload.token_id,
        currentHealth: payload.current_health,
        bonusHealth: payload.bonus_health,
        bonusXp: payload.bonus_xp,
        attackStreak: payload.attack_streak,
        lastDeathTimestamp: payload.last_death_timestamp,
        revivalCount: payload.revival_count,
        extraLives: payload.extra_lives,
        hasClaimedPotions: payload.has_claimed_potions,
        blocksHeld: payload.blocks_held,
        spirit: payload.spirit,
        luck: payload.luck,
        specials: payload.specials,
        wisdom: payload.wisdom,
        diplomacy: payload.diplomacy,
        rewardsEarned: payload.rewards_earned,
        rewardsClaimed: payload.rewards_claimed,
        blockNumber: payload.block_number,
        transactionHash: payload.transaction_hash,
        createdAt: payload.created_at,
      },
      _timing: {
        createdAt: payload.created_at,
        indexedAt: payload.indexed_at,
        insertedAt: payload.inserted_at,
      },
    });

    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (!client.channels.has("beast_update")) {
        continue;
      }

      // Filter by beast token ID if specified
      if (client.beastTokenIds && !client.beastTokenIds.has(payload.token_id)) {
        continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Beast update broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Broadcast battle to subscribed clients
   */
  private broadcastBattle(payload: BattlePayload): void {
    const message = JSON.stringify({
      type: "battle",
      data: {
        attackingBeastTokenId: payload.attacking_beast_token_id,
        attackIndex: payload.attack_index,
        defendingBeastTokenId: payload.defending_beast_token_id,
        attackCount: payload.attack_count,
        attackDamage: payload.attack_damage,
        criticalAttackCount: payload.critical_attack_count,
        criticalAttackDamage: payload.critical_attack_damage,
        counterAttackCount: payload.counter_attack_count,
        counterAttackDamage: payload.counter_attack_damage,
        criticalCounterAttackCount: payload.critical_counter_attack_count,
        criticalCounterAttackDamage: payload.critical_counter_attack_damage,
        attackPotions: payload.attack_potions,
        xpGained: payload.xp_gained,
        blockNumber: payload.block_number,
        transactionHash: payload.transaction_hash,
        createdAt: payload.created_at,
      },
      _timing: {
        createdAt: payload.created_at,
        indexedAt: payload.indexed_at,
        insertedAt: payload.inserted_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("battle")) continue;

      // Filter by beast token ID if specified (either attacker or defender)
      if (client.beastTokenIds) {
        const hasMatch =
          client.beastTokenIds.has(payload.attacking_beast_token_id) ||
          client.beastTokenIds.has(payload.defending_beast_token_id);
        if (!hasMatch) continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Battle broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Broadcast summit takeover to subscribed clients
   */
  private broadcastSummit(payload: SummitPayload): void {
    const message = JSON.stringify({
      type: "summit",
      data: {
        beastTokenId: payload.beast_token_id,
        beastId: payload.beast_id,
        beastPrefix: payload.beast_prefix,
        beastSuffix: payload.beast_suffix,
        beastLevel: payload.beast_level,
        beastHealth: payload.beast_health,
        beastShiny: payload.beast_shiny,
        beastAnimated: payload.beast_animated,
        currentHealth: payload.current_health,
        bonusHealth: payload.bonus_health,
        blocksHeld: payload.blocks_held,
        owner: payload.owner,
        blockNumber: payload.block_number,
        transactionHash: payload.transaction_hash,
        createdAt: payload.created_at,
      },
      _timing: {
        createdAt: payload.created_at,
        indexedAt: payload.indexed_at,
        insertedAt: payload.inserted_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("summit")) continue;
      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Summit broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Broadcast poison attack to subscribed clients
   */
  private broadcastPoison(payload: PoisonPayload): void {
    const message = JSON.stringify({
      type: "poison",
      data: {
        beastTokenId: payload.beast_token_id,
        blockTimestamp: payload.block_timestamp,
        count: payload.count,
        player: payload.player,
        blockNumber: payload.block_number,
        transactionHash: payload.transaction_hash,
        createdAt: payload.created_at,
      },
      _timing: {
        createdAt: payload.created_at,
        indexedAt: payload.indexed_at,
        insertedAt: payload.inserted_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("poison")) continue;

      // Filter by beast token ID if specified
      if (client.beastTokenIds && !client.beastTokenIds.has(payload.beast_token_id)) {
        continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Poison broadcast to ${sentCount}/${this.clients.size} clients`
    );
  }

  /**
   * Broadcast reward to subscribed clients
   */
  private broadcastReward(payload: RewardPayload): void {
    const message = JSON.stringify({
      type: "reward",
      data: {
        rewardBlockNumber: payload.reward_block_number,
        beastTokenId: payload.beast_token_id,
        owner: payload.owner,
        amount: payload.amount,
        blockNumber: payload.block_number,
        transactionHash: payload.transaction_hash,
        createdAt: payload.created_at,
      },
      _timing: {
        createdAt: payload.created_at,
        indexedAt: payload.indexed_at,
        insertedAt: payload.inserted_at,
      },
    });

    let sentCount = 0;
    for (const [, client] of this.clients) {
      if (!client.channels.has("reward")) continue;

      // Filter by beast token ID if specified
      if (client.beastTokenIds && !client.beastTokenIds.has(payload.beast_token_id)) {
        continue;
      }

      this.send(client.ws, message);
      sentCount++;
    }
    console.log(
      `[SubscriptionHub] Reward broadcast to ${sentCount}/${this.clients.size} clients`
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

# Savage Summit API

REST and WebSocket backend serving the Savage Summit game frontend. This server provides read-only access to indexed on-chain game data and real-time updates via WebSocket subscriptions.

For the full system architecture and game mechanics, see the [top-level README](../README.md).

For AI agents: see [AGENTS.md](AGENTS.md) for implementation guidance.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

## Overview

The API layer sits between the React frontend and a PostgreSQL database populated by the [indexer](../indexer/). It exposes beast stats, combat logs, leaderboards, diplomacy data, and quest rewards through REST endpoints. Real-time updates flow from the indexer through PostgreSQL `LISTEN/NOTIFY` channels to connected WebSocket clients.

```
Starknet -> Indexer -> PostgreSQL -> API (REST + WS) -> Client
                         |                                |
                         +--- LISTEN/NOTIFY (summit_update, summit_log_insert)
```

**Key characteristics:**

- Public read-only API -- no authentication required
- Direct PostgreSQL queries with no intermediate cache layer
- Starknet address normalization (lowercase, zero-padded to 66 hex characters)
- Shared database schema mirroring the indexer's 12 tables
- Graceful shutdown with `SIGINT`/`SIGTERM` handling

**Technology stack:**

| Component   | Technology                         |
| ----------- | ---------------------------------- |
| Runtime     | Node.js 22                         |
| Language    | TypeScript 5.7 (strict mode)       |
| HTTP        | Hono 4.6                           |
| Database    | PostgreSQL via Drizzle ORM 0.38    |
| WebSocket   | ws 8.18 via @hono/node-ws          |
| Middleware  | Logger, Compress, CORS (credentials enabled) |

## Prerequisites

- **Node.js 22** (LTS recommended)
- **pnpm 10** -- package manager for all TypeScript projects in this monorepo
- **PostgreSQL** -- a running instance populated by the [indexer](../indexer/). The API reads from the same database the indexer writes to; it does not manage migrations or seed data.

## Getting Started

### 1. Install dependencies

```bash
cd api
pnpm install
```

### 2. Configure environment

Create a `.env` file in the `api/` directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/summit
PORT=3001
```

See [Environment Variables](#environment-variables) for the full list of options.

### 3. Start the development server

```bash
pnpm dev
```

This runs the server with `tsx watch`, which automatically reloads on file changes. The server starts at `http://localhost:3001` with the WebSocket endpoint at `ws://localhost:3001/ws`.

### 4. Verify the server is running

```bash
curl http://localhost:3001/health
```

A healthy response looks like:

```json
{
  "status": "healthy",
  "database": "connected",
  "websocket": { "connected": true, "clientCount": 0 },
  "timestamp": "2026-02-14T12:00:00.000Z"
}
```

### Available commands

| Command                    | Purpose                              |
| -------------------------- | ------------------------------------ |
| `pnpm dev`                 | Start with hot reload (tsx watch)    |
| `pnpm build`               | Compile TypeScript to `dist/`        |
| `pnpm start`               | Run compiled output (production)     |
| `pnpm exec tsc --noEmit`   | Type-check without emitting files    |

## API Reference

All data endpoints accept `GET` requests and return JSON. Paginated endpoints include a `pagination` object with `limit`, `offset`, `total`, and `has_more` fields. In development mode, two `POST` debug endpoints are also available (see [Debug Endpoints](#debug-endpoints)).

### Health and Discovery

#### `GET /`

Returns a directory of all available endpoints with example query parameters. In development mode (`NODE_ENV !== "production"`), debug endpoints are included.

#### `GET /health`

Returns server health status including database connectivity and WebSocket hub state.

### Debug Endpoints (Development Only)

These endpoints are available only when `NODE_ENV` is not `"production"`:

#### `POST /debug/test-summit-update`

Triggers a test WebSocket broadcast on the `summit` channel. Useful for verifying WebSocket connectivity during development.

#### `POST /debug/test-summit-log`

Triggers a test WebSocket broadcast on the `event` channel.

### Beasts

#### `GET /beasts/all`

Paginated list of all beasts with filtering and sorting.

| Parameter  | Type    | Default                | Description                          |
| ---------- | ------- | ---------------------- | ------------------------------------ |
| `limit`    | integer | 25 (max: 100)          | Number of results per page           |
| `offset`   | integer | 0                      | Pagination offset                    |
| `prefix`   | integer | --                     | Filter by name prefix ID             |
| `suffix`   | integer | --                     | Filter by name suffix ID             |
| `beast_id` | integer | --                     | Filter by beast type ID (1-75)       |
| `name`     | string  | --                     | Search by beast name (case-insensitive) |
| `owner`    | string  | --                     | Filter by owner address              |
| `sort`     | string  | `summit_held_seconds`  | Sort by `summit_held_seconds` or `level` |

Example:

```bash
curl "http://localhost:3001/beasts/all?limit=10&sort=level&name=dragon"
```

#### `GET /beasts/:owner`

Returns all beasts owned by the given address with full metadata, computed stats, game state, rewards, and Loot Survivor data. The response uses the `Beast` interface format compatible with the client's `getBeastCollection`.

The address is normalized automatically -- you can pass it with or without leading zeros.

```bash
curl "http://localhost:3001/beasts/0x1234...abcd"
```

#### `GET /beasts/stats/counts`

Returns aggregate counts of total beasts, alive beasts, and dead beasts. A beast is considered alive if its `last_death_timestamp` is more than 24 hours in the past (i.e., the revival window has elapsed) or if it has never died (`last_death_timestamp` is 0).

```json
{ "total": 1523, "alive": 1200, "dead": 323 }
```

#### `GET /beasts/stats/top`

Paginated list of top beasts ranked by summit hold time. Includes beast metadata, owner, and XP.

| Parameter | Type    | Default       | Description                |
| --------- | ------- | ------------- | -------------------------- |
| `limit`   | integer | 25 (max: 100) | Number of results per page |
| `offset`  | integer | 0             | Pagination offset          |

### Diplomacy

#### `GET /diplomacy`

Returns beasts with diplomacy unlocked that match a given prefix/suffix combination. Both parameters are required.

| Parameter | Type    | Required | Description      |
| --------- | ------- | -------- | ---------------- |
| `prefix`  | integer | Yes      | Name prefix ID   |
| `suffix`  | integer | Yes      | Name suffix ID   |

Returns `400` if either parameter is missing.

```bash
curl "http://localhost:3001/diplomacy?prefix=5&suffix=12"
```

#### `GET /diplomacy/all`

Returns all beasts with diplomacy unlocked. Used for building the diplomacy leaderboard grouped by prefix/suffix with power calculations.

### Activity and Rewards

#### `GET /logs`

Paginated activity feed from the summit log.

| Parameter      | Type    | Default       | Description                                    |
| -------------- | ------- | ------------- | ---------------------------------------------- |
| `limit`        | integer | 50 (max: 100) | Number of results per page                     |
| `offset`       | integer | 0             | Pagination offset                              |
| `category`     | string  | --            | Filter by category (comma-separated for multiple) |
| `sub_category` | string  | --            | Filter by sub-category (comma-separated for multiple) |
| `player`       | string  | --            | Filter by player address                       |

```bash
curl "http://localhost:3001/logs?limit=20&category=combat,poison"
```

#### `GET /leaderboard`

Returns the rewards leaderboard grouped by owner address, sorted by total rewards earned (descending). Amounts are divided by 100,000 for display.

This endpoint returns all results without pagination, unlike most other list endpoints.

#### `GET /quest-rewards/total`

Returns the total quest rewards claimed across all beasts.

```json
{ "total": 4250 }
```

#### `GET /adventurers/:player`

Returns all distinct adventurer IDs associated with a player address (from corpse events). Not paginated.

```bash
curl "http://localhost:3001/adventurers/0x1234...abcd"
```

```json
{ "player": "0x0000...1234abcd", "adventurer_ids": ["42", "108", "256"] }
```

## WebSocket Protocol

Connect to `ws://localhost:3001/ws` to receive real-time game updates.

### Connection

The WebSocket endpoint does not require authentication. Each client is assigned a unique ID on connection and can subscribe to one or more channels.

### Channels

| Channel   | PG Notification Channel | Description                           |
| --------- | ----------------------- | ------------------------------------- |
| `summit`  | `summit_update`         | Beast stats updates for the current summit holder |
| `event`   | `summit_log_insert`     | Activity feed entries (combat, poison, rewards, etc.) |

### Client Messages

All messages are JSON strings.

**Subscribe to channels:**

```json
{ "type": "subscribe", "channels": ["summit", "event"] }
```

Server responds:

```json
{ "type": "subscribed", "channels": ["summit", "event"] }
```

**Unsubscribe from channels:**

```json
{ "type": "unsubscribe", "channels": ["event"] }
```

Server responds:

```json
{ "type": "unsubscribed", "channels": ["event"] }
```

**Keepalive ping:**

```json
{ "type": "ping" }
```

Server responds:

```json
{ "type": "pong" }
```

### Server Messages

When a subscribed channel receives an update, the server pushes a message with the channel name as the `type` and the payload as `data`:

**Summit update example:**

```json
{
  "type": "summit",
  "data": {
    "token_id": 42,
    "current_health": 150,
    "bonus_health": 50,
    "bonus_xp": 320,
    "attack_streak": 7,
    "last_death_timestamp": "1700000000",
    "revival_count": 2,
    "extra_lives": 3,
    "captured_summit": true,
    "spirit": 45,
    "luck": 30,
    "specials": true,
    "wisdom": false,
    "diplomacy": true,
    "rewards_earned": 5000,
    "rewards_claimed": 2000,
    "block_number": "500810",
    "transaction_hash": "0xabc...",
    "created_at": "2026-02-14T12:00:00.000Z"
  }
}
```

**Event update example:**

```json
{
  "type": "event",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "block_number": "500810",
    "event_index": 3,
    "category": "combat",
    "sub_category": "attack",
    "data": { "damage": 42, "critical": true },
    "player": "0x0000...1234",
    "token_id": 42,
    "transaction_hash": "0xabc...",
    "created_at": "2026-02-14T12:00:00.000Z"
  }
}
```

### Real-Time Pipeline

The update flow from blockchain to client works as follows:

1. The [indexer](../indexer/) processes Starknet events and writes to PostgreSQL.
2. PostgreSQL triggers fire `NOTIFY` on the `summit_update` and `summit_log_insert` channels.
3. The `SubscriptionHub` holds a dedicated PG connection with `LISTEN` on both channels.
4. On notification, the hub broadcasts the payload to all WebSocket clients subscribed to the corresponding channel.

The hub uses exponential backoff (1s to 30s cap) for reconnection if the PostgreSQL listener connection drops, and retries indefinitely.

## Project Structure

```
api/
├── src/
│   ├── index.ts              # Main server: routes, middleware, WebSocket upgrade
│   ├── db/
│   │   ├── client.ts         # PostgreSQL pool (configurable size, SSL, health check)
│   │   └── schema.ts         # Drizzle ORM schema (12 tables, mirrors indexer)
│   ├── ws/
│   │   └── subscriptions.ts  # SubscriptionHub: PG LISTEN/NOTIFY -> WS broadcast
│   └── lib/
│       └── beastData.ts      # Beast metadata lookups (names, tiers, types, items)
├── Dockerfile                # Multi-stage production build (Node 22 Alpine)
├── package.json
├── tsconfig.json             # TypeScript strict mode, ES2022 target
└── .gitignore
```

### Key modules

**`src/index.ts`** -- The single-file server containing all route handlers, middleware configuration, WebSocket upgrade logic, address normalization, and beast stat computation helpers. Routes query the database through Drizzle ORM and return JSON responses.

**`src/db/client.ts`** -- Configures the PostgreSQL connection pool with a default maximum of 15 connections and a 5-second connect timeout. Exports the Drizzle `db` instance for ORM queries and the raw `pool` for LISTEN/NOTIFY. Includes a `checkDatabaseHealth()` function used by the `/health` endpoint.

**`src/db/schema.ts`** -- Defines the Drizzle ORM schema for all 12 database tables: `beasts`, `beast_owners`, `beast_data`, `beast_stats`, `battles`, `rewards_earned`, `rewards_claimed`, `poison_events`, `corpse_events`, `skulls_claimed`, `quest_rewards_claimed`, and `summit_log`. This schema mirrors the indexer's write schema exactly.

**`src/ws/subscriptions.ts`** -- The `SubscriptionHub` singleton manages WebSocket client subscriptions and bridges PostgreSQL notifications to WebSocket broadcasts. It maintains a dedicated PG client for `LISTEN`, handles reconnection with exponential backoff, and provides `subscribe`, `unsubscribe`, and `ping/pong` message handling.

**`src/lib/beastData.ts`** -- Static lookup tables for beast names (75 beasts), tiers (T1-T5), types (Magical, Hunter, Brute), and item name prefixes/suffixes. Used to enrich API responses with human-readable metadata.

## Environment Variables

| Variable       | Required | Default | Description                                      |
| -------------- | -------- | ------- | ------------------------------------------------ |
| `DATABASE_URL` | Yes      | --      | PostgreSQL connection string                     |
| `DATABASE_SSL` | No       | --      | Set to `"true"` to enable SSL (rejectUnauthorized: false) |
| `DB_POOL_MAX`  | No       | `15`    | Maximum connections in the PostgreSQL pool        |
| `PORT`         | No       | `3001`  | HTTP/WebSocket server port                       |
| `NODE_ENV`     | No       | --      | Set to `"production"` to hide debug endpoints    |

Example `.env` file for local development:

```env
DATABASE_URL=postgresql://summit:summit@localhost:5432/summit
PORT=3001
```

## Deployment

### Docker

The included `Dockerfile` uses a multi-stage build:

1. **Build stage** -- Installs all dependencies and compiles TypeScript.
2. **Production stage** -- Copies only compiled output and production dependencies into a minimal Node 22 Alpine image.

```bash
# Build the image
docker build -t summit-api .

# Run the container
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@db-host:5432/summit" \
  -e DATABASE_SSL="true" \
  summit-api
```

Security and operational details:

- Runs as a non-root user (`api`, UID 1001)
- Built-in Docker `HEALTHCHECK` pings `/health` every 30 seconds
- Graceful shutdown on `SIGINT` and `SIGTERM` (closes WebSocket connections and releases PG listeners)

### CI Pipeline

The API is validated in CI via path-filtered jobs triggered by changes under `api/**`:

1. `tsc --noEmit` -- Type checking
2. `pnpm build` -- Compilation

The API shares a lint gate (`indexer-api-lint`) with the indexer. There are no runtime tests at this time.

### Production checklist

- Set `NODE_ENV=production` to disable debug endpoints
- Set `DATABASE_SSL=true` if your PostgreSQL instance requires SSL
- Tune `DB_POOL_MAX` based on expected concurrent request volume
- Ensure the indexer is running and populating the same database
- Verify `/health` returns `"status": "healthy"` after startup

## Troubleshooting

**"Database connection refused"** -- Ensure PostgreSQL is running and `DATABASE_URL` is correct. The indexer must have run migrations and populated the database first.

**"No data returned from endpoints"** -- The API reads from the indexer's database. If the indexer has not run yet, all tables will be empty. Start the indexer and wait for it to sync.

**"WebSocket not receiving updates"** -- Verify the indexer is running and writing to the same database. The PG NOTIFY triggers only fire on new inserts/updates from the indexer.

**"dotenv not loading"** -- The server loads `.env` automatically via `import "dotenv/config"`. Ensure the `.env` file is in the `api/` directory, not the repo root.

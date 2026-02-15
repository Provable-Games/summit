# API

Read API and WebSocket relay for Savage Summit frontend clients.

For AI-oriented coding guidance and deeper architecture notes, read `AGENTS.md` in this folder. For shared architecture/mechanics, read `../README.md`.

## Stack

- Node.js `22`
- TypeScript `5.7.0`
- Hono `4.6.0`
- Drizzle ORM `0.38.0`
- PostgreSQL (`pg` `8.13.0`)
- `ws` `8.18.0`

## Core Layout

- Server + routes: `src/index.ts`
- DB pool/client: `src/db/client.ts`
- DB schema mirror: `src/db/schema.ts`
- WS subscription hub: `src/ws/subscriptions.ts`
- Beast metadata helpers: `src/lib/beastData.ts`

## Environment

- `DATABASE_URL` (required)
- `DATABASE_SSL` (`"true"` or `"false"`; required in production)
- `DB_POOL_MAX` (default `15`)
- `PORT` (default `3001`)
- `NODE_ENV` (`production` hides debug entries from `/` discovery payload)

Production note:
- API startup fails fast when `NODE_ENV=production` and `DATABASE_SSL` is unset.

## Quick Start

```bash
cd api
pnpm install
```

Create `api/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/summit"
# optional
# DATABASE_SSL="false"
# DB_POOL_MAX="15"
# PORT="3001"
```

Then start the server:

```bash
pnpm dev
```

Verify runtime status:

```bash
curl http://localhost:3001/health
```

## Scripts

- Dev: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Typecheck only: `pnpm exec tsc --noEmit`

## REST API

### Endpoint Summary

- `GET /` discovery payload
- `GET /health`
- `GET /beasts/all`
- `GET /beasts/:owner`
- `GET /beasts/stats/counts`
- `GET /beasts/stats/top`
- `GET /logs`
- `GET /diplomacy`
- `GET /diplomacy/all`
- `GET /leaderboard`
- `GET /quest-rewards/total`
- `GET /adventurers/:player`

### Query Parameters and Response Shapes

`GET /beasts/all`
- params: `limit` (default `25`, max `100`), `offset`, `prefix`, `suffix`, `beast_id`, `name`, `owner`, `sort` (`summit_held_seconds|level`)
- returns: `{ data: Beast[], pagination: { limit, offset, total, has_more } }`

`GET /logs`
- params: `limit` (default `50`, max `100`), `offset`, `category`, `sub_category`, `player`
- `category`/`sub_category` accept comma-separated values
- returns: `{ data: LogEntry[], pagination: { limit, offset, total, has_more } }`

`GET /beasts/stats/top`
- params: `limit` (default `25`, max `100`), `offset`
- returns: paginated top beasts sorted by summit hold time, bonus XP, death timestamp

`GET /diplomacy`
- params: `prefix` (required), `suffix` (required)
- returns HTTP `400` if either is missing

`GET /beasts/stats/counts`
- returns total/alive/dead using alive definition:
  - `last_death_timestamp < now - 86400`

`GET /leaderboard`
- returns owner-grouped reward sums
- amounts are divided by `100000` for display

`GET /adventurers/:player`
- returns distinct adventurer IDs for the normalized player address

Root discovery notes:
- In development mode (`NODE_ENV != production`), `/` includes debug endpoint hints.
- This service currently does not define corresponding `POST` handlers in `src/index.ts`.

## WebSocket Protocol

- Endpoint: `ws://localhost:3001/ws`
- Channels: `summit`, `event`
- Message types: `subscribe`, `unsubscribe`, `ping`

Subscribe example:

```json
{"type":"subscribe","channels":["summit","event"]}
```

Unsubscribe example:

```json
{"type":"unsubscribe","channels":["event"]}
```

Ping example:

```json
{"type":"ping"}
```

Server responses:
- `{"type":"subscribed","channels":[...]}`
- `{"type":"unsubscribed","channels":[...]}`
- `{"type":"pong"}`

Realtime pipeline:
- `Indexer -> PostgreSQL NOTIFY (summit_update, summit_log_insert) -> SubscriptionHub LISTEN -> API WS broadcast`

## Runtime Notes

- Address inputs are normalized to lowercase 66-char `0x`-padded form.
- API is public read-only (no auth layer).
- No dedicated caching layer is used.
- Graceful shutdown closes WS subscriptions/listeners on `SIGINT`/`SIGTERM`.

## Deployment Notes

- Docker image uses multi-stage Node 22 Alpine build.
- Container runs as non-root and includes a healthcheck against `/health`.

## CI

API CI runs:

`pnpm exec tsc --noEmit -> pnpm build`.

# API Agent Guide

Read [`../AGENTS.md`](../AGENTS.md) first for shared addresses/mechanics and indexer-to-client realtime flow.

## Role
- `api/` is the read API + WebSocket relay consumed by the client.

## Stack
- Node.js `22` (CI/Docker)
- TypeScript `5.7.0`
- Hono `4.6.0`
- Drizzle ORM `0.38.0`
- `pg` `8.13.0`
- `ws` `8.18.0`

## Key Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | Main server/routes + WebSocket upgrade (`787` lines). |
| `src/db/client.ts` | Pool config and health check (`DB_POOL_MAX`, SSL, timeout). |
| `src/db/schema.ts` | Shared 12-table schema mirror from indexer. |
| `src/ws/subscriptions.ts` | PG LISTEN/NOTIFY bridge to WebSocket clients. |
| `src/lib/beastData.ts` | Beast metadata dictionaries for response enrichment. |

## HTTP and WS Surface
- Data REST endpoints:
  - `/health`
  - `/beasts/all`
  - `/beasts/:owner`
  - `/logs`
  - `/beasts/stats/counts`
  - `/beasts/stats/top`
  - `/diplomacy`
  - `/diplomacy/all`
  - `/leaderboard`
  - `/quest-rewards/total`
  - `/adventurers/:player`
- Root discovery route: `/`
- WebSocket endpoint: `/ws`
  - message types: `subscribe`, `unsubscribe`, `ping`
  - channels: `summit`, `event`
  - subscribe payload: `{"type":"subscribe","channels":["summit","event"]}`

Query/pagination rules agents usually need:
- `/beasts/all`: `limit` default `25`, max `100`; `offset`; filters `prefix`, `suffix`, `beast_id`, `name`, `owner`; `sort` in `summit_held_seconds|level`.
- `/logs`: `limit` default `50`, max `100`; `offset`; `category`, `sub_category` (comma-separated), `player`.
- `/beasts/stats/top`: `limit` default `25`, max `100`; `offset`.
- `/diplomacy`: `prefix` and `suffix` required; returns HTTP `400` if missing.
- Paginated routes return `{ data, pagination: { limit, offset, total, has_more } }`.

Behavior details that affect integration:
- `/leaderboard` divides summed reward amounts by `100000` for display.
- `/beasts/stats/counts` defines alive as `last_death_timestamp < now - 86400`.
- `/` includes debug endpoint hints in development mode (`NODE_ENV != production`), but handlers are not implemented in this service file.

## Real-Time Pattern
`Indexer writes -> PostgreSQL NOTIFY (summit_update, summit_log_insert) -> SubscriptionHub LISTEN -> WS broadcast`

## Middleware and Runtime Patterns
- Middleware in `src/index.ts`: logger, compress, CORS.
- CORS is credential-enabled.
- Address normalization for owner/player queries is mandatory:
  - lowercase
  - 66-char `0x` padded form.
- No auth layer (public read API).
- No cache layer (responses are DB-backed).

## TypeScript and DB Settings
- `tsconfig.json`: `strict: true`.
- Pool defaults (`src/db/client.ts`):
  - `max = 15` (`DB_POOL_MAX` override)
  - `connectionTimeoutMillis = 5000`

## Commands
- Dev: `pnpm dev` (`tsx watch src/index.ts`)
- Build: `pnpm build` (`tsc`)
- Start: `pnpm start` (`node dist/index.js`)
- Typecheck only: `pnpm exec tsc --noEmit`

## CI for API
- Triggered by `api/**` (and shared indexer/api lint gate).
- Build gate: `pnpm exec tsc --noEmit` -> `pnpm build`.

## Deployment Notes
- `Dockerfile` uses multi-stage Node 22 Alpine.
- Runs as non-root user.
- Healthcheck targets `:3001/health`.
- Graceful shutdown calls `SubscriptionHub.shutdown()` on `SIGINT`/`SIGTERM`.

## Environment Variables
- `DATABASE_URL` (required)
- `DATABASE_SSL` (`"true"` enables SSL)
- `DB_POOL_MAX` (default `15`)
- `PORT` (default `3001`)
- `NODE_ENV` (`production` hides debug entries from `/` response)

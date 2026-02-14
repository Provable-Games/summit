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

## Architecture
- Main server and routes: `src/index.ts` (787 lines).
- DB client/pool: `src/db/client.ts`.
- DB schema mirror: `src/db/schema.ts` (12 tables; indexer-compatible shape).
- WebSocket hub: `src/ws/subscriptions.ts`.
- Beast metadata dictionaries: `src/lib/beastData.ts`.

## HTTP and WS Surface
- 11 data REST endpoints:
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
- Plus root index route: `/`.
- WebSocket endpoint: `/ws`.
  - message types: `subscribe`, `unsubscribe`, `ping`
  - channels: `summit`, `event`.
  - subscribe payload shape: `{"type":"subscribe","channels":["summit","event"]}` (array key is `channels`, not singular `channel`).

## Real-Time Pattern
`Indexer writes -> PostgreSQL NOTIFY (summit_update, summit_log_insert) -> SubscriptionHub LISTEN -> WS broadcast`

## Middleware and Runtime Patterns
- Middleware in `src/index.ts`: logger, compress, CORS.
- CORS is credential-enabled.
- Address normalization is mandatory for address-based queries:
  - lowercase
  - 66-char `0x` padded form.
- No auth layer (public read API).
- No cache layer (responses are DB-backed).

## TypeScript and DB Settings
- `tsconfig.json`: `strict: true`.
- Pool defaults (`src/db/client.ts`):
  - `max = 15` (`DB_POOL_MAX` override)
  - `connectionTimeoutMillis = 5000`.

## Commands
- Dev: `pnpm dev` (`tsx watch src/index.ts`)
- Build: `pnpm build` (`tsc`)
- Start: `pnpm start` (`node dist/index.js`)
- Typecheck only: `pnpm exec tsc --noEmit`

## CI for API
- Triggered by `api/**` (and shared indexer/api lint gate).
- Build gate: `tsc --noEmit` -> `pnpm build`.

## Deployment Notes
- `Dockerfile` uses multi-stage Node 22 Alpine.
- Runs as non-root user.
- Healthcheck targets `:3001/health`.

## Environment Variables
- `DATABASE_URL`
- `DATABASE_SSL`
- `DB_POOL_MAX`
- `PORT` (default `3001`)

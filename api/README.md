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
- `DATABASE_SSL` (`true` to enable SSL)
- `DB_POOL_MAX` (default `15`)
- `PORT` (default `3001`)

## Quick Start

```bash
cd api
pnpm install
export DATABASE_URL="postgresql://user:password@localhost:5432/summit"
# optional
# export DATABASE_SSL="true"
# export DB_POOL_MAX="15"
# export PORT="3001"
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

## REST and WebSocket Surface

REST routes include:

- `/` (endpoint discovery payload)
- `/health`
- `/beasts/all`
- `/beasts/:owner`
- `/beasts/stats/counts`
- `/beasts/stats/top`
- `/logs`
- `/diplomacy`
- `/diplomacy/all`
- `/leaderboard`
- `/quest-rewards/total`
- `/adventurers/:player`

WebSocket endpoint:

- `/ws`
- Message types: `subscribe`, `unsubscribe`, `ping`
- Channels: `summit`, `event`
- Subscribe payload:

```json
{"type":"subscribe","channels":["summit","event"]}
```

In development mode (`NODE_ENV != production`), the `/` discovery payload also includes debug endpoint entries.

## Realtime Flow

`Indexer -> PostgreSQL NOTIFY -> SubscriptionHub LISTEN -> API WebSocket broadcast`

## Runtime Notes

- Address inputs are normalized to lowercase 66-char `0x`-padded form.
- API is public read-only (no auth layer).
- No dedicated caching layer is used.

## CI

API CI runs:

`tsc --noEmit -> pnpm build`.

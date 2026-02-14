# API

REST + WebSocket server for Summit frontend. Read [top-level AGENTS.md](../AGENTS.md) first for architecture, game mechanics, and contract addresses.

## Stack

- TypeScript 5.7.0, Node.js 22
- Hono 4.6.0 (HTTP framework)
- Drizzle ORM 0.38.0, PostgreSQL (pg 8.13.0)
- ws 8.18.0 (WebSocket via @hono/node-ws)

## Key Files

| File | Purpose |
| ---- | ------- |
| `src/index.ts` | Main server (787 lines): all REST routes, WebSocket upgrade, middleware |
| `src/db/client.ts` | PostgreSQL pool config (max 15 via `DB_POOL_MAX`, 5s connect timeout) |
| `src/db/schema.ts` | Drizzle schema (12 tables, mirrors indexer schema) |
| `src/ws/subscriptions.ts` | WebSocket hub: PG LISTEN/NOTIFY -> client broadcast |
| `src/lib/beastData.ts` | Beast metadata lookups (names, tiers, types, item names) |

## REST Endpoints

| Route | Method | Purpose |
| ----- | ------ | ------- |
| `/` | GET | Endpoint directory (index) |
| `/health` | GET | Health check (DB connectivity) |
| `/beasts/all` | GET | All beast stats |
| `/beasts/:owner` | GET | Beasts owned by address |
| `/beasts/stats/counts` | GET | Aggregate beast counts |
| `/beasts/stats/top` | GET | Top beasts by various metrics |
| `/logs` | GET | Activity feed from summit_log |
| `/diplomacy` | GET | Current diplomacy state |
| `/diplomacy/all` | GET | All diplomacy records |
| `/leaderboard` | GET | Player leaderboard |
| `/quest-rewards/total` | GET | Total quest rewards earned |
| `/adventurers/:player` | GET | Player's adventurer data |

Note: `/leaderboard` divides raw amounts by 100,000 for display. This endpoint is not paginated.

Development only (`NODE_ENV != "production"`): `POST /debug/test-summit-update`, `POST /debug/test-summit-log`

### Key Query Parameters

**`/beasts/all`**: `limit` (default 25, max 100), `offset`, `prefix`, `suffix`, `beast_id`, `name`, `owner`, `sort` (`summit_held_seconds` or `level`)

**`/logs`**: `limit` (default 50, max 100), `offset`, `category` (comma-separated), `sub_category` (comma-separated), `player`

**`/beasts/stats/top`**: `limit` (default 25, max 100), `offset`

**`/diplomacy`**: `prefix` (required), `suffix` (required) -- returns 400 if either is missing

Paginated endpoints return: `{ data: [...], pagination: { limit, offset, total, has_more } }`

## WebSocket

Endpoint: `/ws`

Channels:
- `summit` - Beast stats updates for current summit beast
- `event` - Activity feed from summit_log

Message types: `subscribe`, `unsubscribe`, `ping` (returns `pong`)

Real-time pipeline: Indexer -> PG NOTIFY (`summit_update`, `summit_log_insert`) -> SubscriptionHub -> WebSocket clients

Subscribe payload: `{"type":"subscribe","channels":["summit","event"]}`
Key is `channels` (array, plural) -- not `channel`. Server responds with `{"type":"subscribed","channels":[...]}`.

## Middleware

- `logger` - Request logging
- `compress` - Response compression
- `cors` - CORS with credentials enabled

## Key Patterns

- **No auth**: Public read-only API
- **No caching layer**: Queries hit PostgreSQL directly
- **Address normalization**: All addresses lowercase, 66-char hex padded
- **Shared schema**: Database schema mirrors indexer's schema (12 tables)
- **TypeScript strict: true**

## Commands

```bash
pnpm dev    # tsx watch src/index.ts (hot reload)
pnpm build  # tsc (compile to dist/)
pnpm start  # node dist/index.js (production)
pnpm exec tsc --noEmit  # Typecheck only
```

## CI Pipeline

`tsc --noEmit` -> build

Triggered by `api/**` (shared `indexer-api-lint` gate with indexer). No runtime tests -- CI gate is typecheck + build only.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_SSL` - Enable SSL for DB connection
- `DB_POOL_MAX` - Max pool connections (default: 15)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Set to `"production"` to hide debug endpoints (default: unset)

## Deployment

Multi-stage Docker (Node 22 Alpine):
- Non-root user
- Healthcheck on `:3001/health`
- `Dockerfile` in api root

Handles `SIGINT`/`SIGTERM` with SubscriptionHub cleanup and graceful process exit.

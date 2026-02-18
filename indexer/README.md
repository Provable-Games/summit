# Indexer

Real-time Starknet event indexer that materializes Savage Summit state into PostgreSQL.

For AI-focused implementation constraints and deeper internals, read `AGENTS.md` in this folder. For shared architecture/mechanics, read `../README.md`.

## Stack

- Node.js `22`
- TypeScript `5.7.0`
- Apibara DNA (`next`) + `@apibara/starknet`
- Drizzle ORM `0.38.0`
- PostgreSQL (`pg` `8.13.0`)
- Vitest `3.1.1`

## Core Layout

- Indexer entrypoint: `indexers/summit.indexer.ts`
- Runtime config: `apibara.config.ts`
- Event decoders/bit unpacking: `src/lib/decoder.ts`
- DB schema: `src/lib/schema.ts`
- Migrations: `migrations/`
- Utility scripts: `scripts/check-dna-status.ts`, `scripts/test-live-beast-stats-parity.ts`

## Environment

Required:

- `DATABASE_URL`
- `STREAM_URL` (Apibara stream endpoint)

Optional (provider-dependent):

- `DNA_TOKEN` (if your stream provider requires auth)

Contract addresses and default starting block are in `apibara.config.ts`.

## Quick Start

```bash
cd indexer
pnpm install
```

Create `indexer/.env`:

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/summit"
STREAM_URL="https://mainnet.starknet.a5a.ch"
```

Then run migrations and start the indexer:

```bash
pnpm db:migrate
pnpm dev
```

The indexer starts from block `6767900` (configured in `apibara.config.ts`) unless you change runtime config.

## Scripts

- Dev: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Typecheck: `pnpm exec tsc --noEmit`
- Tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Packing parity check: `pnpm test:parity`
- DNA connectivity check: `pnpm check-dna`
- DB tooling: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`

## Processing Pipeline

`DNA stream -> filter + pre-scan -> batch context lookups -> event decode -> derived events -> bulk DB writes -> PostgreSQL NOTIFY`

## Database Semantics (`12` tables)

State/upsert tables:
- `beast_stats`
- `beast_owners`
- `beast_data`
- `skulls_claimed`
- `quest_rewards_claimed`

Insert-once table:
- `beasts`

Append/history tables:
- `battles`
- `rewards_earned`
- `rewards_claimed`
- `poison_events`
- `corpse_events`
- `summit_log`

Idempotency strategy:
- history tables use `onConflictDoNothing`
- state tables use `onConflictDoUpdate`

## Real-Time Bridge

PostgreSQL triggers in `migrations/0001_triggers.sql` publish:
- `summit_update`
- `summit_log_insert`

These channels are consumed by the API WebSocket layer.

## Deployment Notes

- Docker image uses multi-stage Node 22 Alpine build.
- Container runs as non-root and includes a healthcheck.
- Startup executes a DNA connectivity check before starting the indexer process.
- Docker dependency install uses `pnpm-lock.yaml` (`pnpm`-managed).

## Cross-Layer Parity

`LiveBeastStats` bit unpacking in `src/lib/decoder.ts` must match:

- `contracts/src/models/beast.cairo`
- `client/src/utils/translation.ts`

Validate with `pnpm test:parity` after decoder changes.

# Indexer

Real-time Starknet event indexer that materializes Savage Summit state into PostgreSQL.

For AI-focused implementation constraints and deeper internals, read `AGENTS.md` in this folder. For shared architecture/mechanics, read `../README.md`.

## Stack

- Node.js `22`
- TypeScript `5.7.0`
- Apibara DNA (`next`) + `@apibara/starknet` for the legacy pending path
- `@apibara/starknet-rpc` for the accepted-L2 RPC path
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
- `STREAM_URL` (Apibara stream endpoint, legacy DNA path)

Required for accepted-L2 RPC indexing:

- `DATABASE_URL`
- `STARKNET_RPC_URL` (HTTP JSON-RPC endpoint)
- `STARKNET_WS_URL` (WebSocket JSON-RPC endpoint)

Optional (provider-dependent):

- `DNA_TOKEN` (if your stream provider requires auth)
- `STARTING_BLOCK` (defaults to the configured Summit start block)
- `STARKNET_METADATA_RPC_URL` (defaults to `STARKNET_RPC_URL`)

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

The indexer starts from block `7077225` (configured in `apibara.config.ts`) unless you change runtime config.

## Accepted-L2 RPC Indexing

The RPC path is side-by-side with the legacy Apibara DNA indexer. It uses
`@apibara/starknet-rpc` `streamEvents`, which backfills with HTTP
`starknet_getEvents`, hands off to `starknet_subscribeEvents` over WebSocket,
and targets `ACCEPTED_ON_L2`.

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/summit" \
STARKNET_RPC_URL="..." \
STARKNET_WS_URL="..." \
pnpm dev:rpc
```

The current integration depends on the local SDK package via:

```text
file:../../apibara-sdk-starknet-rpc/packages/starknet-rpc
```

Replace that file dependency with the published package/version before release.

RPC cursor persistence uses the `indexer_cursor` table with:

- `block_number`
- `transaction_hash`
- `event_index`

The cursor is saved in the same database transaction as the block's
event-derived writes. RPC events are grouped by block number, then processed
with the same batch-first materialization rules used by the existing indexer.

On a reorg message, the RPC path rolls back append/history tables where
`block_number >= starting_block_number` and restores state/upsert tables from
`indexer_state_snapshots`. External caches such as `cartridge_names` are not
rolled back. This repo does not currently define an `adventurer_tokens` table.

## Scripts

- Dev: `pnpm dev`
- RPC dev: `pnpm dev:rpc`
- Build: `pnpm build`
- Start: `pnpm start`
- RPC start: `pnpm start:rpc`
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

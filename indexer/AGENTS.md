# Indexer Agent Guide

Read [`../AGENTS.md`](../AGENTS.md) first for shared addresses, mechanics, and LiveBeastStats parity rules.

## Role
- `indexer/` is the real-time Starknet event indexer that materializes Summit game state into PostgreSQL.

## Stack
- Node.js `22` (CI/Docker)
- TypeScript `5.7.0`
- Apibara DNA (`next`) + `@apibara/starknet` (`next`)
- `starknet` `^7.1.0` (selectors/hash utilities in decoder/indexer flow)
- Drizzle ORM `0.38.0`
- `pg` `8.13.0`
- Vitest `3.1.1`

## Architecture
- Single indexer entrypoint: `indexers/summit.indexer.ts` (1889 lines).
- Runtime config: `apibara.config.ts`.
  - starting block: `6767900`
  - finality: `pending`
  - filters: Summit, Beast NFT, Dojo World, Corpse, Skull contracts.
- Decoding and bit unpacking: `src/lib/decoder.ts`.
- Schema: `src/lib/schema.ts` (11 tables).
- Migrations: `migrations/` (including NOTIFY triggers in `0001_triggers.sql`).

## Data Pipeline
`DNA stream -> pre-scan token/entity IDs -> batch context lookups -> ordered event processing -> derived logs -> bulk upserts/inserts -> PostgreSQL NOTIFY`

## Indexed Event Surface
- 14 event types across 5 contracts:
  - Summit contract events (9 selectors, including quest rewards claimed).
  - Beast NFT `Transfer`.
  - Dojo `EntityStats` + `CollectableEntity`.
  - Corpse `CorpseEvent`.
  - Skull `SkullEvent`.

## Key Patterns
- Batch-first processing:
  - one context query path per block
  - one bulk insert/upsert per table.
- Idempotency:
  - append tables use `onConflictDoNothing`
  - state tables use `onConflictDoUpdate`.
- Derived logs:
  - stat upgrades
  - summit change
  - battle aggregation by `transaction_hash`.
- Real-time bridge:
  - DB triggers publish `summit_update` and `summit_log_insert`
  - consumed by API WS layer.

## Cross-Layer Packing Parity
- Contract pack source: `contracts/src/models/beast.cairo`.
- Indexer decoder source: `src/lib/decoder.ts`.
- Parity script: `scripts/test-live-beast-stats-parity.ts`.
- Rule: never change decoder masks/shifts without matching contract + client changes.

## Commands
- Dev: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Typecheck: `pnpm exec tsc --noEmit`
- Tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Parity: `pnpm test:parity`
- DB tooling: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`

## CI for Indexer
- Triggered by `indexer/**` and `contracts/src/models/beast.cairo`.
- Job sequence: `tsc --noEmit` -> build -> parity -> coverage -> Codecov.

## Deployment Notes
- `Dockerfile` uses multi-stage Node 22 Alpine image.
- Runs as non-root user.
- Includes healthcheck.
- Startup command runs DNA status check before indexer start.

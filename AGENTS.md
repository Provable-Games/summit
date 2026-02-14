# Savage Summit Monorepo

Read this file first, then read the component guide you are modifying.

## Project Identity
- Savage Summit is a Starknet king-of-the-hill game.
- Players send Beast NFTs to attack the summit, apply upgrades/potions, and claim tokenized rewards.

## Architecture
```
Client (React SPA) -> Summit contract (Cairo on Starknet)
       ^                           |
       |                           v
       +-- API (Hono REST + WS) <- Indexer (Apibara DNA)
                ^                       |
                +------ PostgreSQL <----+
```

## Monorepo Map

| Directory | Purpose | Component Guide |
| --- | --- | --- |
| `client/` | React game UI + wallet + realtime state | [`client/AGENTS.md`](client/AGENTS.md) |
| `contracts/` | Cairo game logic and storage packing | [`contracts/AGENTS.md`](contracts/AGENTS.md) |
| `indexer/` | Starknet event indexing + DB materialization | [`indexer/AGENTS.md`](indexer/AGENTS.md) |
| `api/` | Read API + WS relay from PostgreSQL notifications | [`api/AGENTS.md`](api/AGENTS.md) |

## Shared Toolchain
- Rust: `1.89.0` (`.tool-versions`)
- Scarb: `2.15.1` (`.tool-versions`)
- Starknet Foundry (`snforge`): `0.56.0` (`.tool-versions`)
- Node runtime in CI: `22` (`.github/workflows/pr-ci.yml`)
- pnpm in CI: `10` (`.github/workflows/pr-ci.yml`)

## CI Pipeline Summary (`.github/workflows/pr-ci.yml`)

Path filters:
- `contracts`: `contracts/**`
- `client_ci`: `client/**` or `contracts/src/models/beast.cairo`
- `client_review`: `client/**`
- `indexer_ci`: `indexer/**` or `contracts/src/models/beast.cairo`
- `api`: `api/**`
- `indexer_api_ci`: `indexer/**` or `api/**` or `contracts/src/models/beast.cairo`
- `indexer_api_review`: `indexer/**` or `api/**`
- `general_review`: files outside component folders

Per-component CI:
- Contracts: `scarb fmt --check` -> `scarb test --coverage` -> Codecov.
- Client: `pnpm lint` -> `pnpm build` -> `pnpm test:parity` -> `pnpm test:coverage` -> Codecov.
- Indexer: `tsc --noEmit` -> `pnpm build` -> `pnpm test:parity` -> `pnpm test:coverage` -> Codecov.
- API: `tsc --noEmit` -> `pnpm build`.

AI review gates:
- Claude + Codex jobs run for `contracts`, `client`, `indexer/api`, and `general` scopes.
- Any `[CRITICAL]` or `[HIGH]` finding fails the job.
- Final `pr-ci` job fails if any required job fails/cancels.

## Cross-Layer Data Flow and Parity
- Canonical packed model: `contracts/src/models/beast.cairo` (`LiveBeastStats`, 251-bit felt252 packing).
- Indexer decoder must match exactly: `indexer/src/lib/decoder.ts`.
- Client decoder must match exactly: `client/src/utils/translation.ts`.
- Parity checks:
  - `contracts/src/models/beast.cairo` cross-layer constant.
  - `indexer/scripts/test-live-beast-stats-parity.ts`
  - `client/scripts/test-live-beast-stats-parity.ts`
- Rule: any bit-layout or field-order change must update all three layers and both parity scripts in one PR.

## Shared Game Mechanics Reference
- Combat uses `death_mountain_combat` with minimum damage `4` (`contracts/src/constants.cairo`).
- Token unit scale: `TOKEN_DECIMALS = 1e18` (`contracts/src/constants.cairo`).
- Level model:
  - Effective XP = `base_level^2 + bonus_xp`
  - Current level = `floor(sqrt(effective_xp))` (`contracts/src/logic/beast_utils.cairo`)
- XP gain on attack: `10 + attack_streak` if beast has not reached max bonus levels.
- Max bonus levels: `40` (`BEAST_MAX_BONUS_LVLS`).
- Upgrade costs in skull tokens:
  - `specials = 10`
  - `diplomacy = 15`
  - `wisdom = 20`
  - `spirit`/`luck` points cost `1` each
- Stat limits:
  - `spirit <= 100`, `luck <= 100`
  - `extra_lives <= 4000`
  - `bonus_health <= 2000`
  - `MAX_REVIVAL_COUNT = 63`
- Revival:
  - Base revival window: `86400` seconds.
  - `REDUCED_REVIVAL_TIME_SECONDS = 57600` (16h) exists as a constant.
  - Potions required before natural revive: `revival_count + 1`.
  - Current revival logic path uses base window + spirit reduction (`contracts/src/logic/revival.cairo`), not the reduced constant directly.
- Poison:
  - Damage = `elapsed_seconds * poison_count`
  - Applies to current health, then extra lives
  - Never kills outright (floors to `1` HP)
- Quest rewards (per beast) are additive, max tested total `95` (`contracts/src/logic/quest.cairo`).
- UI reward constants used by client orchestrator:
  - Summit reward rate: `0.0075`/sec
  - Diplomacy reward rate: `0.0005`/sec
  - Quest pool target: `100`
  - Source: `client/src/contexts/GameDirector.tsx`

## Mainnet Contract Addresses

Primary game contracts:
- Summit: `0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa`
- Beast NFT: `0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4`
- Dojo World: `0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a`

Game token contracts:
- ATTACK: `0x03e2d0ba6993e2662ba7d14f2faf5f60678fd99651db4f93b3994c71e089ee9f`
- REVIVE: `0x0581959744ccce11c168ce02186e4d9a8221b28a8e8336a5f28b44302aedf2c7`
- EXTRA LIFE: `0x06db32714906b760273f33a1f9cfd1a7a3c9a03d9405014f0a9de8dda1f279cb`
- POISON: `0x0802c53c6007540e57390eec9b3dde3c370b54d90fff220bb3fd9e1e0d16c68`
- SKULL: `0x05dff27b8cdef20e537b5a33bf1feb4dbc5fb0ebfcb59e33cd95a075f5eb8916`
- CORPSE: `0x01f40a78e8d3e0687e30fc173a28cc62cdf976187f23f778b792a71f16e4482f`
- SURVIVOR: `0x07c7fe4ef54a91f030b668d7de1a5eacaba2bc6f970fdab436d3a29228de830b`

Sources:
- `client/.env`
- `client/src/utils/networkConfig.ts`
- `indexer/apibara.config.ts`

## RPC Endpoints
- Cartridge mainnet RPC (client): `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`
- Cartridge mainnet RPC (contracts/indexer): `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`
- Cartridge Torii (client): `https://api.cartridge.gg/x/pg-mainnet-10/torii`

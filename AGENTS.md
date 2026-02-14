# Savage Summit

King-of-the-hill game on Starknet where beasts battle for control of the summit. Beasts earn rewards while holding the summit, can be poisoned, revived, and upgraded with consumable tokens.

Read this file first for project-wide context, then read the component-specific AGENTS.md for the directory you are modifying.

## Architecture

```
Client (React SPA) -> Summit contract (Cairo on Starknet)
       ^                           |
       |                           v
       +-- API (Hono REST + WS) <- Indexer (Apibara DNA)
              ^                       |
              +------ PostgreSQL <----+
```

## Monorepo Structure

| Directory    | Purpose                                 | AGENTS.md                      |
| ------------ | --------------------------------------- | ------------------------------ |
| `client/`    | React 18 SPA with Cartridge Controller  | [client/AGENTS.md](client/AGENTS.md) |
| `contracts/` | Cairo game logic (single main contract) | [contracts/AGENTS.md](contracts/AGENTS.md) |
| `indexer/`   | Apibara event indexer -> PostgreSQL     | [indexer/AGENTS.md](indexer/AGENTS.md) |
| `api/`       | Hono REST + WebSocket server            | [api/AGENTS.md](api/AGENTS.md) |

## Tooling Versions (`.tool-versions`)

- Scarb 2.15.1
- Starknet Foundry 0.56.0
- Rust 1.89.0
- Node.js 22 (client, indexer, api)
- pnpm 10 (package manager for all TS projects)

## CI Pipeline (`.github/workflows/pr-ci.yml`)

Path-filtered jobs with `dorny/paths-filter`. Every component lint must pass before tests run. AI review (Claude + Codex) gates block on CRITICAL/HIGH findings. Final `pr-ci` job fails if any required job fails/cancels.

| Component  | Path Filter                                       | Pipeline                                              |
| ---------- | ------------------------------------------------- | ----------------------------------------------------- |
| contracts  | `contracts/**`                                    | `scarb fmt --check` -> `scarb test --coverage` -> Codecov |
| client     | `client/**`, `contracts/src/models/beast.cairo`   | lint -> build -> parity test -> test:coverage -> Codecov |
| indexer    | `indexer/**`, `contracts/src/models/beast.cairo`   | tsc --noEmit -> build -> parity test -> test:coverage -> Codecov |
| api        | `api/**`                                          | tsc --noEmit -> build                                 |

AI review gates: `claude-review-contracts`, `claude-review-client`, `claude-review-indexer-api`, `claude-review-general` + matching `codex-review-*` jobs. Any `[CRITICAL]` or `[HIGH]` finding fails the corresponding review job.

## Cross-Layer Data: LiveBeastStats Packing

`contracts/src/models/beast.cairo` defines `LiveBeastStats` packed into a single `felt252` (251 bits). The indexer (`indexer/src/lib/decoder.ts`) and client (`client/src/utils/translation.ts`) must unpack identically.

Parity tests validate sync against a cross-layer constant in `beast.cairo`:
- `client/scripts/test-live-beast-stats-parity.ts` (run: `pnpm test:parity` in client/)
- `indexer/scripts/test-live-beast-stats-parity.ts` (run: `pnpm test:parity` in indexer/)

Rule: any bit-layout or field-order change must update all three layers and both parity scripts in one PR. CI triggers indexer/client builds on `contracts/src/models/beast.cairo` changes.

## Game Mechanics Reference

### Combat
- Attacking beasts battle the summit beast; damage based on beast level, type advantage, and attack potions
- Uses `death_mountain_combat` library
- Minimum damage: 4 (`contracts/src/constants.cairo`)
- Attack potions: max 255 per attack
- VRF (Pragma) used for randomness in combat

### XP and Leveling (`contracts/src/logic/beast_utils.cairo`)
- XP gain on attack: `10 + attack_streak` (if beast has not reached max bonus levels)
- Wisdom XP: summit beast gains `attacker_attack_hp / 100` when wisdom unlocked
- Effective XP = `base_level^2 + bonus_xp`
- Current level = `floor(sqrt(effective_xp))`
- Max bonus levels: 40 (`BEAST_MAX_BONUS_LVLS`)

### Token Economics
- TOKEN_DECIMALS: 1e18 (all ERC20 amounts, `contracts/src/constants.cairo`)
- 7 consumable ERC20 tokens: reward, attack potion, revive potion, extra life potion, poison potion, skull, corpse
- Upgrade costs in skull tokens: spirit/luck 1 each, Specials 10, Diplomacy 15, Wisdom 20

### Beast Stat Limits
- `spirit <= 100`, `luck <= 100`
- Max extra lives: 4,000
- Max bonus health: 2,000
- Max revival count: 63

### Poison (`contracts/src/logic/poison.cairo`)
- Damage = `elapsed_seconds * poison_count`
- Applies to current health, then extra lives
- Never kills outright (floors to 1 HP)

### Revival (`contracts/src/logic/revival.cairo`)
- Base revival window: 86,400 seconds (24h)
- `REDUCED_REVIVAL_TIME_SECONDS = 57600` (16h) constant exists but actual logic uses base window + spirit reduction
- Potions required before natural revive: `revival_count + 1`

### Quest Rewards (`contracts/src/logic/quest.cairo`)
- Additive per beast, max tested total: 95
- UI constants (`client/src/contexts/GameDirector.tsx`):
  - Summit reward rate: `0.0075`/sec
  - Diplomacy reward rate: `0.0005`/sec
  - Quest pool target: `100`

## Contract Addresses (Mainnet)

Primary game contracts:

| Contract   | Address |
| ---------- | ------- |
| Summit     | `0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa` |
| Beast NFT  | `0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4` |
| Dojo World | `0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a` |

Game token contracts (`client/src/utils/networkConfig.ts`):

| Token      | Address |
| ---------- | ------- |
| ATTACK     | `0x03e2d0ba6993e2662ba7d14f2faf5f60678fd99651db4f93b3994c71e089ee9f` |
| REVIVE     | `0x0581959744ccce11c168ce02186e4d9a8221b28a8e8336a5f28b44302aedf2c7` |
| EXTRA LIFE | `0x06db32714906b760273f33a1f9cfd1a7a3c9a03d9405014f0a9de8dda1f279cb` |
| POISON     | `0x0802c53c6007540e57390eec9b3dde3c370b54d90fff220bb3fd9e1e0d16c68` |
| SKULL      | `0x05dff27b8cdef20e537b5a33bf1feb4dbc5fb0ebfcb59e33cd95a075f5eb8916` |
| CORPSE     | `0x01f40a78e8d3e0687e30fc173a28cc62cdf976187f23f778b792a71f16e4482f` |
| SURVIVOR   | `0x07c7fe4ef54a91f030b668d7de1a5eacaba2bc6f970fdab436d3a29228de830b` |

Sources: `client/.env`, `client/src/utils/networkConfig.ts`, `indexer/apibara.config.ts`

## RPC Endpoints

- Client RPC: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`
- Contracts/Indexer RPC: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`
- Torii (client): `https://api.cartridge.gg/x/pg-mainnet-10/torii`

## Common Anti-Patterns (Do NOT)

- Do not use Starkli for deployments -- it is no longer maintained; use `sncast`
- Do not introduce Tailwind CSS -- the client uses MUI + Emotion exclusively
- Do not create custom ERC20/ERC721 interfaces -- use OpenZeppelin `openzeppelin_interfaces`
- Do not set fuzzer seeds in tests -- let them generate randomly for better coverage
- Do not merge partial cross-layer updates -- `LiveBeastStats` changes must update all three layers in one PR

Last verified against codebase: 2026-02-14 (commit 8602a90)

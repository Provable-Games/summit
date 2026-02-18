# Savage Summit Monorepo

Savage Summit is a Starknet king-of-the-hill game. Players send Beast NFTs to contest the summit, use consumables, and earn tokenized rewards.

## At a Glance

- Summit control rotates through onchain combat.
- Beast progression combines XP, stat upgrades, and consumable token usage.
- Realtime UX is driven by `Indexer -> PostgreSQL NOTIFY -> API WS -> Client`.

## Architecture

```text
Client (React SPA) -> Summit Contract (Cairo on Starknet)
       ^                            |
       |                            v
       +-- API (Hono REST + WS) <- Indexer (Apibara DNA)
                ^                        |
                +------ PostgreSQL <-----+
```

## Tech Stack

| Layer     | Stack                                               |
| --------- | --------------------------------------------------- |
| Client    | React 18, TypeScript, Vite, MUI, Zustand            |
| Contracts | Cairo 2.15.0, Scarb 2.15.1, Starknet Foundry 0.56.0 |
| Indexer   | Apibara DNA, TypeScript, Drizzle ORM, PostgreSQL    |
| API       | Hono, TypeScript, PostgreSQL, WebSocket             |

## Monorepo Layout

| Path         | Purpose                                    | Human Docs                                   | AI Docs                                      |
| ------------ | ------------------------------------------ | -------------------------------------------- | -------------------------------------------- |
| `client/`    | React game UI, wallet/session, realtime UX | [`client/README.md`](client/README.md)       | [`client/AGENTS.md`](client/AGENTS.md)       |
| `contracts/` | Cairo game logic and storage packing       | [`contracts/README.md`](contracts/README.md) | [`contracts/AGENTS.md`](contracts/AGENTS.md) |
| `indexer/`   | Starknet event indexing into PostgreSQL    | [`indexer/README.md`](indexer/README.md)     | [`indexer/AGENTS.md`](indexer/AGENTS.md)     |
| `api/`       | Read API and WebSocket relay               | [`api/README.md`](api/README.md)             | [`api/AGENTS.md`](api/AGENTS.md)             |

## Prerequisites

- Rust `1.89.0`
- Scarb `2.15.1`
- Starknet Foundry (`snforge`) `0.56.0`
- Node.js `22`
- pnpm `10`
- PostgreSQL (local or hosted)

Toolchain versions come from `.tool-versions` and `.github/workflows/pr-ci.yml`.

## Local Development

1. Install dependencies per Node component:
   - `cd client && pnpm install`
   - `cd indexer && pnpm install`
   - `cd api && pnpm install`
2. Configure environment variables for each component (see each component README).
3. Start PostgreSQL and verify `DATABASE_URL` connectivity.
4. Start services in separate terminals:
   - Indexer first run/schema change: `cd indexer && pnpm db:migrate`
   - Indexer daily start: `cd indexer && pnpm dev`
   - API: `cd api && pnpm dev`
   - Client: `cd client && pnpm dev`
5. Run contract checks when changing Cairo logic:
   - `cd contracts && scarb fmt --check && scarb test`
   - Optional coverage: install `cairo-coverage` `v0.6.0` from the official releases page (`https://github.com/software-mansion/cairo-coverage/releases/tag/v0.6.0`), then run `scarb test --coverage`

## Cross-Layer Parity Rule

`LiveBeastStats` bit packing is shared across contracts, indexer, and client.

- Canonical model: `contracts/src/models/beast.cairo`
- Indexer decoder: `indexer/src/lib/decoder.ts`
- Client decoder: `client/src/utils/translation.ts`
- Parity tests:
  - `cd indexer && pnpm test:parity`
  - `cd client && pnpm test:parity`

If you change packing layout or field order, update all three layers and both parity tests in one PR.

## CI Overview

PR CI is path-filtered and runs component-specific checks:

| Component | Trigger Paths                                    | CI Steps                                                                                          |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Contracts | `contracts/**`                                   | `scarb fmt --check` -> `scarb test --coverage` -> Codecov                                         |
| Client    | `client/**`, `contracts/src/models/beast.cairo`  | `pnpm lint` -> `pnpm build` -> `pnpm test:parity` -> `pnpm test:coverage` -> Codecov              |
| Indexer   | `indexer/**`, `contracts/src/models/beast.cairo` | `pnpm exec tsc --noEmit` -> `pnpm build` -> `pnpm test:parity` -> `pnpm test:coverage` -> Codecov |
| API       | `api/**`                                         | `pnpm exec tsc --noEmit` -> `pnpm build`                                                          |

## Mainnet Contracts

| Contract      | Address                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Summit Game   | [`0x0214d382e80781f8c1059a751563d6b46e717c652bb670bf230e8a64a68e6064`](https://voyager.online/contract/0x0214d382e80781f8c1059a751563d6b46e717c652bb670bf230e8a64a68e6064) |
| Attack Potion | [`0x016f9def00daef9f1874dd932b081096f50aec2fe61df31a81bc5707a7522443`](https://voyager.online/contract/0x016f9def00daef9f1874dd932b081096f50aec2fe61df31a81bc5707a7522443) |
| Poison Potion | [`0x049eaed2a1bA2F2Eb6Ac2661ffd2d79231CdD7d5293D9448Df49c5986C9897aE`](https://voyager.online/contract/0x049eaed2a1bA2F2Eb6Ac2661ffd2d79231CdD7d5293D9448Df49c5986C9897aE) |
| Revive Potion | [`0x029023e0a455d19d6887bc13727356070089527b79e6feb562ffe1afd6711dbe`](https://voyager.online/contract/0x029023e0a455d19d6887bc13727356070089527b79e6feb562ffe1afd6711dbe) |
| Extra Life Potion | [`0x016dea82a6588ca9fb7200125fa05631b1c1735a313e24afe9c90301e441a796`](https://voyager.online/contract/0x016dea82a6588ca9fb7200125fa05631b1c1735a313e24afe9c90301e441a796) |
| Corpse Token  | [`0x0103eafe79f8631932530cc687dfcdeb013c883a82619ebf81be393e2953a87a`](https://voyager.online/contract/0x0103eafe79f8631932530cc687dfcdeb013c883a82619ebf81be393e2953a87a) |
| Skull Token   | [`0x01c3c8284d7EED443b42F47e764032a56eAf50A9079D67993B633930E3689814`](https://voyager.online/contract/0x01c3c8284d7EED443b42F47e764032a56eAf50A9079D67993B633930E3689814) |

## Useful Links

- Loot Survivor: `https://lootsurvivor.io`
- Summit docs: `https://docs.provable.games/summit`

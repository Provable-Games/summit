# Savage Summit Monorepo

Savage Summit is a Starknet king-of-the-hill game. Players send Beast NFTs to contest the summit, use consumables, and earn tokenized rewards.

For AI-oriented contributor instructions, see `AGENTS.md`. For human onboarding, use this README first.

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

## Monorepo Layout

| Path | Purpose | Human Docs | AI Docs |
| --- | --- | --- | --- |
| `client/` | React game UI, wallet/session, realtime UX | [`client/README.md`](client/README.md) | [`client/AGENTS.md`](client/AGENTS.md) |
| `contracts/` | Cairo game logic and storage packing | [`contracts/README.md`](contracts/README.md) | [`contracts/AGENTS.md`](contracts/AGENTS.md) |
| `indexer/` | Starknet event indexing into PostgreSQL | [`indexer/README.md`](indexer/README.md) | [`indexer/AGENTS.md`](indexer/AGENTS.md) |
| `api/` | Read API and WebSocket relay | [`api/README.md`](api/README.md) | [`api/AGENTS.md`](api/AGENTS.md) |

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
3. Start services in separate terminals:
   - Indexer: `cd indexer && pnpm db:migrate && pnpm dev`
   - API: `cd api && pnpm dev`
   - Client: `cd client && pnpm dev`
4. Run contract tests when changing Cairo logic:
   - `cd contracts && scarb fmt --check && scarb test --coverage`

## Cross-Layer Parity Rule

`LiveBeastStats` bit packing is shared across contracts, indexer, and client.

- Canonical model: `contracts/src/models/beast.cairo`
- Indexer decoder: `indexer/src/lib/decoder.ts`
- Client decoder: `client/src/utils/translation.ts`
- Parity tests:
  - `indexer/scripts/test-live-beast-stats-parity.ts`
  - `client/scripts/test-live-beast-stats-parity.ts`

If you change packing layout or field order, update all three layers and both parity tests in one PR.

## CI Overview

PR CI is path-filtered and runs component-specific checks:

- Contracts: `scarb fmt --check`, `scarb test --coverage`, Codecov upload.
- Client: `pnpm lint`, `pnpm build`, `pnpm test:parity`, `pnpm test:coverage`, Codecov upload.
- Indexer: `tsc --noEmit`, `pnpm build`, `pnpm test:parity`, `pnpm test:coverage`, Codecov upload.
- API: `tsc --noEmit`, `pnpm build`.

Automated AI review jobs run for scoped changes, and any `CRITICAL` or `HIGH` finding fails CI.

## Mainnet Reference

Primary contracts:

- Summit: `0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa`
- Beast NFT: `0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4`
- Dojo World: `0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a`

Network endpoints:

- Starknet RPC (client): `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`
- Starknet RPC (contracts/indexer): `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`
- Torii: `https://api.cartridge.gg/x/pg-mainnet-10/torii`

## Contributing Workflow

1. Keep changes scoped to the component you modify.
2. Run that component's local checks before opening a PR.
3. If you touch `contracts/src/models/beast.cairo`, run both parity scripts (`client` and `indexer`) in the same PR.

## Useful Links

- Loot Survivor: `https://lootsurvivor.io`
- Realms Marketplace (Beasts): `https://empire.realms.world/trade/beasts`
- Summit docs: `https://docs.provable.games/summit`

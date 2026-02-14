[![Scarb](https://img.shields.io/badge/Scarb-2.15.1-blue)](https://github.com/software-mansion/scarb)
[![Starknet Foundry](https://img.shields.io/badge/snforge-0.56.0-purple)](https://foundry-rs.github.io/starknet-foundry/)
[![codecov](https://codecov.io/gh/Provable-Games/summit/graph/badge.svg?token=FNL0D8QP4P)](https://codecov.io/gh/Provable-Games/summit)

# Savage Summit

A fully onchain, king-of-the-hill game featuring collectible NFT beasts from [Loot Survivor](https://lootsurvivor.io). Battle, level up, and upgrade your Beasts while earning token rewards!

For AI agents: see [AGENTS.md](AGENTS.md) and the component-specific AGENTS.md files linked from there.

## Overview

In Savage Summit, one beast holds the summit at any time. Challengers attack to claim the position, earning XP and rewards while the current king accumulates token rewards.

- **Summit Combat** - Turn-based battles with attack streaks, critical hits, and counter-attacks
- **Beast Progression** - Level up stats, unlock special abilities, and earn XP from victories
- **Consumable Potions** - Attack boosts, revival acceleration, extra lives, and poison
- **Diplomacy System** - Beasts with matching names share rewards and boost each other

**Get Beasts:** Play [Loot Survivor](https://lootsurvivor.io) or purchase on [Realms Marketplace](https://empire.realms.world/trade/beasts)

```
Client (React SPA) --> Summit Contract (Cairo on Starknet)
       ^                           |
       |                           v
       +-- API (Hono REST + WS) <-- Indexer (Apibara DNA)
              ^                       |
              +------ PostgreSQL <----+
```

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Material-UI      |
| API       | Hono, TypeScript, PostgreSQL, WebSocket      |
| Indexer   | Apibara DNA, Drizzle ORM, PostgreSQL         |
| Contracts | Cairo, Scarb 2.15.1, Starknet Foundry 0.56.0 |
| Web3      | Starknet.js, Cartridge Connector, Dojo SDK   |
| Libraries | OpenZeppelin Cairo, Dojo Engine              |

## Project Structure

| Directory | Description | Docs |
| --------- | ----------- | ---- |
| [`client/`](client/) | React 18 SPA with Cartridge Controller | [README](client/README.md) |
| [`contracts/`](contracts/) | Cairo smart contracts (game logic) | [README](contracts/README.md) |
| [`indexer/`](indexer/) | Apibara event indexer to PostgreSQL | [README](indexer/README.md) |
| [`api/`](api/) | Hono REST + WebSocket server | [README](api/README.md) |

## Getting Started

### Prerequisites

- Node.js 22
- pnpm 10
- [Scarb 2.15.1](https://docs.swmansion.com/scarb/)
- [Starknet Foundry 0.56.0](https://foundry-rs.github.io/starknet-foundry/)
- Rust 1.89.0
- PostgreSQL (required by indexer and API)

Rust, Scarb, and Starknet Foundry versions are pinned in `.tool-versions` at the repo root.

### Client Development

```bash
cd client
pnpm install
pnpm dev
```

The client runs at `https://localhost:5173` (HTTPS via the `mkcert` Vite plugin) and connects to Starknet mainnet by default.

### Smart Contracts

```bash
cd contracts

# Run tests
scarb test
# Note: scarb test delegates to snforge test via [scripts] in Scarb.toml.
# Starknet Foundry must be installed.

# Check formatting
scarb fmt --check

# Build
scarb build
```

### API Server

```bash
cd api
pnpm install
pnpm dev        # Starts on http://localhost:3001
```

Requires `DATABASE_URL` pointing to a PostgreSQL instance populated by the indexer. See [api/README.md](api/README.md) for details.

### Indexer

```bash
cd indexer
pnpm install
pnpm db:migrate   # Set up database schema
pnpm dev          # Start indexing events
```

Requires `DATABASE_URL` and `STREAM_URL` (Apibara DNA). See [indexer/README.md](indexer/README.md) for details.

### Recommended Startup Order

For full local development, start components in dependency order:

1. **PostgreSQL** -- database must be running first
2. **Indexer** (`cd indexer && pnpm dev`) -- populates the database
3. **API** (`cd api && pnpm dev`) -- reads from the database
4. **Client** (`cd client && pnpm dev`) -- connects to the API

## Configuration

### Client Environment Variables

The repo includes `client/.env` with mainnet defaults. To override, edit it or create `client/.env.local`:

```env
VITE_PUBLIC_CHAIN=SN_MAIN
VITE_PUBLIC_SUMMIT_ADDRESS=0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa
```

### Contract Parameters

Key game constants in `contracts/src/constants.cairo`:

| Parameter                   | Value       | Description                   |
| --------------------------- | ----------- | ----------------------------- |
| `BASE_REVIVAL_TIME_SECONDS` | 86400 (24h) | Time before beast can revive  |
| `BEAST_MAX_EXTRA_LIVES`     | 4000        | Maximum extra lives per beast |
| `BEAST_MAX_BONUS_HEALTH`    | 2000        | Maximum bonus health          |
| `MINIMUM_DAMAGE`            | 4           | Floor damage per attack       |

## Game Mechanics

### Beast Stats

Upgraded using **$SKULL Tokens** (earned when beasts $SKULL adventurers in Loot Survivor):

| Stat      | Cost           | Effect                             |
| --------- | -------------- | ---------------------------------- |
| Luck      | 1 $SKULL/level | Critical hit chance (up to 95%)    |
| Spirit    | 1 $SKULL/level | Reduces 24h revival cooldown       |
| Specials  | 10 $SKULL      | Unlocks prefix/suffix name bonuses |
| Diplomacy | 15 $SKULL      | Share rewards with matching beasts |
| Wisdom    | 20 $SKULL      | Earn XP when defending             |

**Vitality:** Use **Corpse Tokens** (from dead adventurers) to add bonus health (max 2,000)

### Consumables

| Potion     | Effect                           |
| ---------- | -------------------------------- |
| Attack     | Boost damage output              |
| Revival    | Reduce revival cooldown          |
| Extra Life | Additional lives in combat       |
| Poison     | Damage over time on summit beast |

## Contract Architecture

The main `summit_systems` contract implements:

- `start_summit()` - Initialize the summit
- `attack()` - Battle with beasts (supports VRF, multi-beast attacks)
- `feed()` - Increase beast health using corpse tokens
- `apply_stat_points()` - Upgrade beast attributes
- `apply_poison()` - Apply poison to summit beast
- `add_extra_life()` - Add extra lives to a beast
- `claim_rewards()` - Claim summit holding rewards
- `claim_quest_rewards()` - Claim quest completion rewards

## Cross-Layer Parity

`LiveBeastStats` bit packing is shared across contracts, indexer, and client. All three must decode identically.

- Canonical model: `contracts/src/models/beast.cairo`
- Indexer decoder: `indexer/src/lib/decoder.ts`
- Client decoder: `client/src/utils/translation.ts`
- Parity tests:
  - `cd client && pnpm test:parity`
  - `cd indexer && pnpm test:parity`

If you change the packing layout or field order, update all three layers and both parity scripts in one PR.

## CI Overview

PR CI is path-filtered (`dorny/paths-filter`) with AI review gates:

| Component  | Path Filter                                       | Pipeline                                              |
| ---------- | ------------------------------------------------- | ----------------------------------------------------- |
| Contracts  | `contracts/**`                                    | `scarb fmt --check` -> `scarb test --coverage` -> Codecov |
| Client     | `client/**`, `contracts/src/models/beast.cairo`   | lint -> build -> parity test -> test:coverage -> Codecov |
| Indexer    | `indexer/**`, `contracts/src/models/beast.cairo`   | tsc --noEmit -> build -> parity test -> test:coverage -> Codecov |
| API        | `api/**`                                          | tsc --noEmit -> build                                 |

Automated AI review jobs (Claude + Codex) run for scoped changes. Any `CRITICAL` or `HIGH` finding fails CI.

## Mainnet Reference

Primary contracts:

| Contract   | Address |
| ---------- | ------- |
| Summit     | `0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa` |
| Beast NFT  | `0x046da8955829adf2bda310099a0063451923f02e648cf25a1203aac6335cf0e4` |
| Dojo World | `0x02ef591697f0fd9adc0ba9dbe0ca04dabad80cf95f08ba02e435d9cb6698a28a` |

View on [Voyager](https://voyager.online/contract/0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa).

Network endpoints:

- Client RPC: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9`
- Contracts/Indexer RPC: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`
- Torii: `https://api.cartridge.gg/x/pg-mainnet-10/torii`

## Contributing

1. Fork the repository and create a feature branch
2. Make scoped changes -- keep PRs focused on a single component when possible
3. Run local checks before submitting:
   - Contracts: `cd contracts && scarb fmt --check && snforge test`
   - Client: `cd client && pnpm lint && pnpm build && pnpm test`
   - Indexer: `cd indexer && pnpm build && pnpm test`
   - API: `cd api && pnpm build`
4. If you touch `contracts/src/models/beast.cairo`, run both parity scripts:
   - `cd client && pnpm test:parity`
   - `cd indexer && pnpm test:parity`
5. Submit a pull request

## Links

- [Game Documentation](https://docs.provable.games/summit) - Game Guide
- [Loot Survivor](https://lootsurvivor.io) - Collect Beasts
- [Realms Marketplace](https://empire.realms.world/trade/beasts) - Buy beasts

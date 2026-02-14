# Savage Summit -- Contracts

Cairo smart contracts for Savage Summit, a king-of-the-hill game on Starknet where beasts battle for control of the summit. Beasts earn token rewards while holding the summit, and players can poison, revive, and upgrade their beasts using consumable ERC20 tokens.

For full game mechanics, architecture diagrams, and token addresses, see the [top-level README](../README.md).

For AI agents: see [AGENTS.md](AGENTS.md) for implementation guidance and coding conventions.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Key Game Constants](#key-game-constants)
- [Testing](#testing)
- [Deployment](#deployment)
- [Cross-Layer Data Sync](#cross-layer-data-sync)

---

## Prerequisites

| Tool              | Version | Purpose                        |
| ----------------- | ------- | ------------------------------ |
| Scarb             | 2.15.1  | Cairo package manager and build tool |
| Starknet Foundry  | 0.56.0  | Testing framework (`snforge`)  |
| Cairo             | 2.15.0  | Language (edition `2024_07`)   |

Install Scarb and Starknet Foundry via [asdf](https://asdf-vm.com/) or follow the official installation guides:

- Scarb: https://docs.swmansion.com/scarb/download.html
- Starknet Foundry: https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html

---

## Getting Started

**Build the contracts:**

```bash
cd contracts
scarb build
```

**Run all tests:**

```bash
snforge test
```

**Check formatting:**

```bash
scarb fmt --check
```

**Auto-format source files:**

```bash
scarb fmt -w
```

**Run tests with coverage:**

```bash
snforge test --coverage
```

---

## Project Structure

```
contracts/
├── Scarb.toml                    # Package config, dependencies, fork configs
├── snfoundry.toml                # sncast deployment profiles
├── src/
│   ├── lib.cairo                 # Crate root and module declarations
│   ├── constants.cairo           # Game constants and error messages
│   ├── interfaces.cairo          # External contract interfaces
│   ├── utils.cairo               # Shared utility functions
│   ├── vrf.cairo                 # Pragma VRF integration
│   ├── erc20/
│   │   └── interface.cairo       # Summit-specific ERC20 interface (burn_from)
│   ├── models/
│   │   ├── beast.cairo           # LiveBeastStats struct and StorePacking (cross-layer critical)
│   │   └── events.cairo          # On-chain event definitions
│   ├── logic/
│   │   ├── mod.cairo             # Logic module declarations
│   │   ├── combat.cairo          # Combat calculation pure functions
│   │   ├── poison.cairo          # Poison damage pure functions
│   │   ├── revival.cairo         # Revival timing pure functions
│   │   ├── quest.cairo           # Quest reward pure functions
│   │   └── beast_utils.cairo     # Level, XP, and stat utilities
│   └── systems/
│       └── summit.cairo          # Main contract: ISummitSystem (38 methods)
├── tests/
│   ├── lib.cairo                 # Test crate root
│   ├── constants.cairo           # Test-specific constants and addresses
│   └── test_summit.cairo         # Fork and integration tests
└── gas_reports/                  # Gas optimization analysis documents
```

---

## Architecture

### Single Contract Design

The game runs through one main contract, `summit_systems`, which exposes the `ISummitSystem` interface with 38 methods covering gameplay, configuration, and queries. An additional `upgrade` method is provided by the `UpgradeableComponent` outside this interface.

The contract uses two OpenZeppelin components:

- **OwnableComponent** -- restricts admin functions (token address setters, fund withdrawal, upgrades) to the contract owner.
- **UpgradeableComponent** -- enables proxy-based contract upgrades on mainnet.

### Business Logic Separation

Following Cairo best practices, business logic lives in **pure functions** under `src/logic/`, while the contract in `src/systems/summit.cairo` handles only storage reads/writes, event emission, and syscalls.

This separation provides three advantages:

1. **Testability** -- Pure functions can be unit tested with fuzzing without deploying a contract.
2. **Auditability** -- Reviewers can verify game math independently of storage mechanics.
3. **Reusability** -- Logic modules can be imported into other contracts or libraries.

```
ISummitSystem (contract)
  │
  ├── reads/writes storage
  ├── emits events
  ├── calls external contracts (Beast NFT, ERC20 tokens, VRF)
  │
  └── delegates calculations to:
        ├── logic/combat.cairo      (damage, combat specs)
        ├── logic/poison.cairo      (poison damage over time)
        ├── logic/revival.cairo     (revival potion requirements)
        ├── logic/quest.cairo       (quest reward amounts)
        └── logic/beast_utils.cairo (levels, XP, stat checks)
```

### StorePacking

`LiveBeastStats` packs 15+ fields into a single `felt252` (251 bits) using Cairo's `StorePacking` trait. This reduces storage costs by writing one storage slot instead of many. The bit layout is defined in `src/models/beast.cairo` and is critical to keep synchronized across the full stack (see [Cross-Layer Data Sync](#cross-layer-data-sync)).

### External Integrations

The contract interacts with several external contracts:

| Integration               | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| Beast NFT (ERC721)        | Ownership verification and beast metadata   |
| Loot Survivor beast data  | Historical beast stats via `IBeastSystems`   |
| Death Mountain libraries  | Combat calculations and beast type lookups   |
| 7 ERC20 token contracts   | Reward, attack potion, revive potion, extra life potion, poison potion, skull, corpse |
| Pragma VRF                | Optional verifiable randomness for attacks   |

### Dependencies

Defined in `Scarb.toml`:

```toml
[dependencies]
starknet = "2.15.1"
openzeppelin_interfaces = { git = "...", tag = "v3.0.0" }
openzeppelin_token = { git = "...", tag = "v3.0.0" }
openzeppelin_access = { git = "...", tag = "v3.0.0" }
openzeppelin_upgrades = { git = "...", tag = "v3.0.0" }
beasts_nft = { git = "https://github.com/Provable-Games/beasts.git" }
death_mountain_combat = { git = "...", branch = "componentize" }
death_mountain_beast = { git = "...", branch = "componentize" }
```

---

## Key Game Constants

All constants are defined in `src/constants.cairo`.

### Timing

| Constant                       | Value           | Description                        |
| ------------------------------ | --------------- | ---------------------------------- |
| `BASE_REVIVAL_TIME_SECONDS`    | 86,400 (24h)    | Time before a dead beast revives naturally |
| `REDUCED_REVIVAL_TIME_SECONDS` | 57,600 (16h)    | Reduced revival time constant      |
| `DAY_SECONDS`                  | 86,400          | Seconds in one day                 |

### Beast Limits

| Constant                  | Value  | Description                                |
| ------------------------- | ------ | ------------------------------------------ |
| `BEAST_MAX_EXTRA_LIVES`   | 4,000  | Maximum extra lives a beast can hold       |
| `BEAST_MAX_BONUS_HEALTH`  | 2,000  | Maximum bonus health from feeding          |
| `BEAST_MAX_BONUS_LVLS`    | 40     | Maximum bonus levels from XP               |
| `BEAST_MAX_ATTRIBUTES`    | 100    | Maximum value for spirit and luck stats    |
| `MAX_REVIVAL_COUNT`       | 63     | Maximum number of times a beast can be revived |
| `MINIMUM_DAMAGE`          | 4      | Floor on attack damage                     |

### Upgrade Costs (in skull tokens)

| Constant          | Value | Description            |
| ----------------- | ----- | ---------------------- |
| Spirit / Luck     | 1     | Per stat point         |
| `SPECIALS_COST`   | 10    | Unlock special powers  |
| `DIPLOMACY_COST`  | 15    | Unlock diplomacy       |
| `WISDOM_COST`     | 20    | Unlock wisdom          |

### Token Economics

| Constant          | Value  | Description                             |
| ----------------- | ------ | --------------------------------------- |
| `TOKEN_DECIMALS`  | 1e18   | All ERC20 token amounts use 18 decimals |

---

## Testing

The test suite has two layers that together cover both isolated logic and full contract behavior.

### Unit Tests

Unit tests are defined inline (`#[cfg(test)] mod tests`) within the source files they exercise. These test pure functions directly without deploying contracts:

| Source File                  | What It Tests                              |
| ---------------------------- | ------------------------------------------ |
| `src/models/beast.cairo`     | StorePacking pack/unpack, parity vectors, zero and max values |
| `src/logic/combat.cairo`     | Combat spec construction, damage calculations |
| `src/logic/poison.cairo`     | Poison damage over elapsed time            |
| `src/logic/revival.cairo`    | Revival potion requirements and timing     |
| `src/logic/quest.cairo`      | Quest reward calculation                   |
| `src/logic/beast_utils.cairo`| Level-from-XP, bonus levels, stat utilities |

Run only unit tests by skipping the integration test module:

```bash
snforge test --skip test_summit
```

### Fork and Integration Tests

Integration tests live in `tests/test_summit.cairo` and run against real mainnet state using Starknet Foundry's fork testing. They deploy the full contract, use real player addresses and beast token IDs, and verify end-to-end gameplay flows.

Two fork configurations are defined in `Scarb.toml`:

| Fork Name          | Block        | Use Case                          |
| ------------------ | ------------ | --------------------------------- |
| `mainnet`          | Latest       | Tests against current chain state |
| `mainnet_6704808`  | Pinned       | Deterministic, reproducible tests |

The integration tests include a 300-beast stress test to validate performance under load.

### CI Pipeline

The contracts CI pipeline runs on every PR that modifies files under `contracts/`:

```
scarb fmt --check  -->  scarb test --coverage  -->  Codecov upload
```

If the RPC returns a 429 (rate limit), CI retries once after a 30-second pause.

### Running Tests

```bash
# All tests (unit + fork)
snforge test

# With coverage report
snforge test --coverage

# Specific test by name
snforge test "test_attack"
```

Note: `scarb test` also works as a convenience alias -- `Scarb.toml` defines `[scripts] test = "snforge test"`. However, `snforge test` is the canonical command, especially when using flags like `--coverage` or positional test filters.

---

## Deployment

### Mainnet Contract

The summit contract is deployed on Starknet mainnet:

```
0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa
```

View on [StarkScan](https://starkscan.co/contract/0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa) or [Voyager](https://voyager.online/contract/0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa).

### Deploying with sncast

Use Starknet Foundry's `sncast` for deployments. Profiles are configured in `snfoundry.toml`. Do not use Starkli (it is no longer maintained).

**Warning:** The `snfoundry.toml` file may contain RPC API keys in deployment profiles. Do not commit updated keys. Consider using environment variables for sensitive credentials.

```bash
# Declare the contract class
sncast --profile myprofile1 declare --contract-name summit_systems

# Deploy with constructor arguments
sncast --profile myprofile1 deploy --class-hash <CLASS_HASH> --constructor-calldata <ARGS>
```

### RPC Endpoint

Contracts and the indexer use the Cartridge RPC:

```
https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10
```

---

## Cross-Layer Data Sync

The `LiveBeastStats` struct in `src/models/beast.cairo` is packed into a single `felt252` using a specific bit layout. This packed value is emitted in events, stored on-chain, and decoded by two other layers in the monorepo:

| Layer     | File                                | Role           |
| --------- | ----------------------------------- | -------------- |
| Contract  | `contracts/src/models/beast.cairo`  | Packs stats into `felt252` |
| Indexer   | `indexer/src/lib/decoder.ts`        | Unpacks events from chain  |
| Client    | `client/src/utils/translation.ts`   | Unpacks for UI display     |

**All three implementations must produce identical results.** A mismatch means the UI or database will show incorrect beast data.

### Parity Tests

Both the indexer and client have parity test scripts that validate their decoders against a known test vector defined in `beast.cairo`:

```bash
# Run from the client directory
cd client && pnpm test:parity

# Run from the indexer directory
cd indexer && pnpm test:parity
```

These parity tests run in CI whenever `contracts/src/models/beast.cairo` changes.

### Rules for Modifying the Bit Layout

If you change the field order, field widths, or add/remove fields in `LiveBeastStats`:

1. Update the `StorePacking` implementation in `contracts/src/models/beast.cairo`.
2. Update the decoder in `indexer/src/lib/decoder.ts`.
3. Update the translator in `client/src/utils/translation.ts`.
4. Update the parity test vectors in both `client/scripts/test-live-beast-stats-parity.ts` and `indexer/scripts/test-live-beast-stats-parity.ts`.
5. Submit all changes in a single PR. Do not merge partial updates.


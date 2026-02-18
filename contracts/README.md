# Contracts

Cairo smart contracts for Savage Summit game rules, token accounting, and event emission.

For AI-oriented contract coding rules, read `AGENTS.md` in this folder. For shared addresses/mechanics, read `../README.md`.

## Stack

- Cairo `2.15.0`
- Scarb `2.15.1`
- Starknet Foundry (`snforge_std`) `0.56.0`
- Scarb edition `2024_07`

## Core Layout

- Main system contract: `src/systems/summit.cairo`
- Business logic modules: `src/logic/`
- Models/events: `src/models/`
- Constants/errors: `src/constants.cairo`
- Custom ERC20 spend interface: `src/erc20/interface.cairo`
- VRF integration helper: `src/vrf.cairo`
- Integration tests: `tests/fork/test_summit.cairo`

## Quick Start

```bash
cd contracts
scarb build
scarb fmt --check
scarb test
```

For coverage:

```bash
scarb test --coverage
```

Direct Foundry runner (equivalent):

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
│   ├── vrf.cairo                 # VRF integration
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
│   ├── unit/                     # Unit tests for pure functions
│   │   ├── models/               # Beast packing, stat tests
│   │   └── logic/                # Combat, poison, revival, quest tests
│   ├── fork/
│   │   └── test_summit.cairo     # Fork and integration tests
│   ├── helpers/                  # Deployment and builder utilities
│   └── fixtures/                 # Test constants and addresses
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

| Integration              | Purpose                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Beast NFT (ERC721)       | Ownership verification and beast metadata                                             |
| Loot Survivor beast data | Historical beast stats via `IBeastSystems`                                            |
| Death Mountain libraries | Combat calculations and beast type lookups                                            |
| 7 ERC20 token contracts  | Reward, attack potion, revive potion, extra life potion, poison potion, skull, corpse |
| VRF                      | Verifiable randomness for critical hits                                               |

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

| Constant                       | Value        | Description                                |
| ------------------------------ | ------------ | ------------------------------------------ |
| `BASE_REVIVAL_TIME_SECONDS`    | 86,400 (24h) | Time before a dead beast revives naturally |
| `REDUCED_REVIVAL_TIME_SECONDS` | 57,600 (16h) | Reduced revival time constant              |
| `DAY_SECONDS`                  | 86,400       | Seconds in one day                         |

### Beast Limits

| Constant                 | Value | Description                                    |
| ------------------------ | ----- | ---------------------------------------------- |
| `BEAST_MAX_EXTRA_LIVES`  | 4,000 | Maximum extra lives a beast can hold           |
| `BEAST_MAX_BONUS_HEALTH` | 2,000 | Maximum bonus health from feeding              |
| `BEAST_MAX_BONUS_LVLS`   | 40    | Maximum bonus levels from XP                   |
| `BEAST_MAX_ATTRIBUTES`   | 100   | Maximum value for spirit and luck stats        |
| `MAX_REVIVAL_COUNT`      | 63    | Maximum number of times a beast can be revived |
| `MINIMUM_DAMAGE`         | 4     | Floor on attack damage                         |

### Upgrade Costs (in skull tokens)

| Constant         | Value | Description           |
| ---------------- | ----- | --------------------- |
| Spirit / Luck    | 1     | Per stat point        |
| `SPECIALS_COST`  | 10    | Unlock special powers |
| `DIPLOMACY_COST` | 15    | Unlock diplomacy      |
| `WISDOM_COST`    | 20    | Unlock wisdom         |

### Token Economics

| Constant         | Value | Description                             |
| ---------------- | ----- | --------------------------------------- |
| `TOKEN_DECIMALS` | 1e18  | All ERC20 token amounts use 18 decimals |

---

## Testing

The test suite has two layers that together cover both isolated logic and full contract behavior.

### Unit Tests

Unit tests live in `tests/unit/` and test pure functions directly without deploying contracts:

| Test File                                    | What It Tests                                                 |
| -------------------------------------------- | ------------------------------------------------------------- |
| `tests/unit/models/test_beast_packing.cairo` | StorePacking pack/unpack, parity vectors, zero and max values |
| `tests/unit/models/test_beast_stats.cairo`   | Beast stat calculations                                       |
| `tests/unit/logic/test_combat.cairo`         | Combat spec construction, damage calculations                 |
| `tests/unit/logic/test_poison.cairo`         | Poison damage over elapsed time                               |
| `tests/unit/logic/test_revival.cairo`        | Revival potion requirements and timing                        |
| `tests/unit/logic/test_quest.cairo`          | Quest reward calculation                                      |
| `tests/unit/logic/test_beast_utils.cairo`    | Level-from-XP, bonus levels, stat utilities                   |

Run only unit tests by skipping the fork test module:

```bash
snforge test --skip test_summit
```

### Fork and Integration Tests

Integration tests live in `tests/fork/test_summit.cairo` and run against real mainnet state using Starknet Foundry's fork testing. They deploy the full contract, use real player addresses and beast token IDs, and verify end-to-end gameplay flows.

Two fork configurations are defined in `Scarb.toml`:

| Fork Name         | Block  | Use Case                          |
| ----------------- | ------ | --------------------------------- |
| `mainnet`         | Latest | Tests against current chain state |
| `mainnet_6704808` | Pinned | Deterministic, reproducible tests |

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
snforge test --coverage
```

## Architecture Notes

- Main contract: `summit_systems` in `src/systems/summit.cairo`
- Interface: `ISummitSystem` (`38` methods)
- OpenZeppelin components:
  - `OwnableComponent`
  - `UpgradeableComponent`
- Pure logic lives under `src/logic/*`; entrypoints orchestrate storage, transfers, and external calls.

Token operation pattern:

- consumables use `burn_from`
- rewards use `transfer`

Important interface detail:

- The project uses `SummitERC20` in `src/erc20/interface.cairo` with only `transfer` and `burn_from`.
- Keep token spend paths aligned to this interface.

## Key Constants (`src/constants.cairo`)

| Constant                       | Value   |
| ------------------------------ | ------- |
| `BASE_REVIVAL_TIME_SECONDS`    | `86400` |
| `REDUCED_REVIVAL_TIME_SECONDS` | `57600` |
| `MINIMUM_DAMAGE`               | `4`     |
| `BEAST_MAX_EXTRA_LIVES`        | `4000`  |
| `BEAST_MAX_BONUS_HEALTH`       | `2000`  |
| `BEAST_MAX_BONUS_LVLS`         | `40`    |
| `BEAST_MAX_ATTRIBUTES`         | `100`   |
| `MAX_REVIVAL_COUNT`            | `63`    |
| `SPECIALS_COST`                | `10`    |
| `DIPLOMACY_COST`               | `15`    |
| `WISDOM_COST`                  | `20`    |
| `TOKEN_DECIMALS`               | `1e18`  |

## Testing Model

- Main test suite is fork-based against Starknet mainnet.
- Fork configs are defined in `Scarb.toml` (`mainnet`, `mainnet_6704808`).
- Tests use real addresses/token IDs, so stable RPC access matters.
- Integration tests include large-scale attack stress coverage.
- CI retries `scarb test --coverage` once when RPC rate-limit signatures are detected.

## Deployment Notes

- Deployment profiles are configured in `snfoundry.toml`.
- Prefer `sncast` for declarations/deploys.
- Contract fork tests use Cartridge Starknet mainnet RPC `v0_10` (from `Scarb.toml`).
- Current `sncast` deploy profile (`sncast.myprofile1.networks.mainnet`) points to an Alchemy Starknet mainnet RPC `v0_10`.

## Important Development Rule

`LiveBeastStats` packing in `src/models/beast.cairo` is a cross-layer contract.

If you change packed layout or field order, update and re-verify:

- `indexer/src/lib/decoder.ts`
- `client/src/utils/translation.ts`
- parity scripts in `indexer/scripts/` and `client/scripts/`

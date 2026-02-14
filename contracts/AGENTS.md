# Contracts Agent Guide

Read [`../AGENTS.md`](../AGENTS.md) first for shared game mechanics, addresses, and cross-layer parity requirements.

## Role
- `contracts/` contains Cairo game logic for Savage Summit.

## Stack
- Cairo `2.15.0` (`Scarb.toml`)
- Scarb `2.15.1` (from `.tool-versions`)
- Starknet Foundry (`snforge_std`) `0.56.0`
- Scarb edition: `2024_07`

## Dependencies
- `starknet = 2.15.1`
- OpenZeppelin Cairo contracts `v3.0.0`:
  - `openzeppelin_interfaces`
  - `openzeppelin_token`
  - `openzeppelin_access`
  - `openzeppelin_upgrades`
- External game deps:
  - `beasts_nft`
  - `death_mountain_combat`
  - `death_mountain_beast`

## Key Files

| File | Purpose |
| --- | --- |
| `src/systems/summit.cairo` | Main contract implementation (`1208` lines). |
| `src/models/beast.cairo` | `LiveBeastStats` StorePacking and parity vectors. |
| `src/models/events.cairo` | Event definitions emitted by the contract. |
| `src/logic/combat.cairo` | Pure combat math and randomization helpers. |
| `src/logic/revival.cairo` | Pure revival timing/potion logic. |
| `src/logic/poison.cairo` | Pure poison damage logic. |
| `src/logic/quest.cairo` | Pure quest reward packing and calculations. |
| `src/logic/beast_utils.cairo` | XP/level/streak utility logic. |
| `src/constants.cairo` | Game constants and error strings. |
| `src/erc20/interface.cairo` | `SummitERC20` trait (`transfer`, `burn_from`). |
| `src/vrf.cairo` | VRF integration wrapper used by attack flow. |

## Architecture
- Exposed interface: `ISummitSystem` (`38` methods).
- Components:
  - `OwnableComponent`
  - `UpgradeableComponent`
- Design rule: keep business logic in pure `src/logic/*`; entrypoints orchestrate storage + token I/O.

## Key Patterns
- `LiveBeastStats` packs into one felt252 (`251` bits) in `src/models/beast.cairo`.
- Token spend pattern:
  - burn consumables via `burn_from`
  - transfer rewards via `transfer`
- Upgrade costs are enforced in constants (`SPECIALS_COST`, `WISDOM_COST`, `DIPLOMACY_COST`).
- VRF integration is optional per attack and routed via `src/vrf.cairo`.

## ERC20 Interface Rule
- Use project trait `SummitERC20` from `src/erc20/interface.cairo` for game token operations.
- Do not replace spend paths with standard OZ `IERC20` dispatchers unless you are changing contract interfaces intentionally.

## External Integrations
- Beast NFT (ERC721 + beast metadata dispatcher).
- Loot Survivor beast data contract (`IBeastSystemsDispatcher`).
- Death Mountain combat/beast libraries.
- Reward + consumable token contracts:
  - reward token
  - attack potion
  - revive potion
  - extra life potion
  - poison potion
  - skull token
  - corpse token.

## Testing

Two test layers, all in the `tests/` directory:

**Unit tests** - `tests/unit/`, testing pure business logic:
- `tests/unit/models/test_beast_packing.cairo` - StorePacking pack/unpack, parity vectors, zero/max values
- `tests/unit/models/test_beast_stats.cairo` - Beast stat calculations
- `tests/unit/logic/test_combat.cairo` - Combat calculations
- `tests/unit/logic/test_poison.cairo` - Poison mechanics
- `tests/unit/logic/test_revival.cairo` - Revival timing
- `tests/unit/logic/test_quest.cairo` - Quest rewards
- `tests/unit/logic/test_beast_utils.cairo` - Beast stat utilities

**Fork/integration tests** - `tests/fork/test_summit.cairo`, all run against mainnet state:
- Fork configs in `Scarb.toml`: `mainnet` (latest block), `mainnet_6704808` (pinned block)
- Real player addresses and beast token IDs
- Includes 300-beast stress test

**Shared test utilities** - `tests/helpers/`, `tests/fixtures/`:
- `tests/helpers/deployment.cairo` - Contract deployment helpers
- `tests/helpers/beast_builder.cairo` - Beast stat builder for tests
- `tests/fixtures/constants.cairo` - Test constants
- `tests/fixtures/addresses.cairo` - Mainnet addresses for fork tests

## Commands
- Format check: `scarb fmt --check`
- Build: `scarb build`
- Test: `scarb test` or `snforge test`
- Coverage: `scarb test --coverage` or `snforge test --coverage`

## CI for Contracts
- Triggered by `contracts/**`.
- Job sequence: `scarb fmt --check` -> `scarb test --coverage` -> Codecov.
- CI auto-retries `scarb test --coverage` once after 30s when RPC rate-limit signatures are detected.

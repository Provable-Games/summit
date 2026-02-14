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

## Architecture
- Main contract: `src/systems/summit.cairo` (1208 lines).
- Exposed interface: `ISummitSystem` (38 methods).
- Components:
  - `OwnableComponent`
  - `UpgradeableComponent`
- Logic split:
  - `src/logic/combat.cairo`
  - `src/logic/revival.cairo`
  - `src/logic/poison.cairo`
  - `src/logic/quest.cairo`
  - `src/logic/beast_utils.cairo`
- Models/events:
  - `src/models/beast.cairo`
  - `src/models/events.cairo`
- Constants/errors:
  - `src/constants.cairo`

## Key Patterns
- `LiveBeastStats` uses `StorePacking` into one felt252 (251-bit layout) in `src/models/beast.cairo`.
- Business logic should stay in pure `src/logic/*`; contract entrypoints orchestrate storage + token I/O.
- Token spend pattern:
  - burn consumables via `burn_from`
  - transfer rewards via `transfer`.
- Upgrade costs are enforced in contract using constants (`SPECIALS_COST`, `WISDOM_COST`, `DIPLOMACY_COST`).
- VRF integration is optional per attack and routed via `src/vrf.cairo`.

## External Integrations
- Beast NFT (ERC721 + Beast metadata dispatcher).
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
- Integration tests in `contracts/tests/test_summit.cairo` are fork-based mainnet tests (`#[fork("mainnet")]`, `#[fork("mainnet_6704808")]`).
- Fork profiles are defined in `Scarb.toml`:
  - `mainnet` (`latest`)
  - `mainnet_6704808` (pinned block).
- Test fixtures include real player addresses and a large whale token-id set for stress coverage.
- Pure logic modules also include inline unit tests (`#[cfg(test)]`).

## Commands
- Format check: `scarb fmt --check`
- Test: `scarb test` or `snforge test`
- Coverage: `scarb test --coverage`

## CI for Contracts
- Triggered by `contracts/**`.
- Job sequence: `scarb fmt --check` -> `scarb test --coverage` -> Codecov.
- CI auto-retries `scarb test --coverage` once after 30s when RPC rate-limit signatures are detected.

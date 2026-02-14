# Contracts

Cairo game logic for Savage Summit. Read [top-level AGENTS.md](../AGENTS.md) first for architecture, game mechanics, and contract addresses.

## Stack

- Cairo 2.15.0 (edition 2024_07), Scarb 2.15.1
- Starknet Foundry 0.56.0 (snforge 0.56.0)
- starknet 2.15.1
- OpenZeppelin v3.0.0 (interfaces, token, access, upgrades)
- External: beasts_nft, death_mountain_combat, death_mountain_beast

## Key Files

| File | Purpose |
| ---- | ------- |
| `src/systems/summit.cairo` | Main contract: `summit_systems` with 38-method `ISummitSystem` interface (1208 lines) |
| `src/models/beast.cairo` | `LiveBeastStats` StorePacking into felt252 (251-bit layout). Cross-layer critical. |
| `src/models/events.cairo` | Event definitions |
| `src/logic/combat.cairo` | Combat calculation pure functions |
| `src/logic/poison.cairo` | Poison mechanics pure functions |
| `src/logic/revival.cairo` | Revival timing pure functions |
| `src/logic/quest.cairo` | Quest reward pure functions |
| `src/logic/beast_utils.cairo` | Beast stat utilities |
| `src/constants.cairo` | Game constants and error messages |
| `src/vrf.cairo` | Pragma VRF integration (optional per attack) |
| `src/interfaces.cairo` | External contract interfaces (`IBeastSystemsDispatcher`, etc.) |
| `src/erc20/interface.cairo` | Custom `SummitERC20` trait: `transfer`, `burn_from` (not standard OZ IERC20) |
| `src/utils.cairo` | Utility functions: `felt_to_u32`, `u32_to_u8s` for combat/VRF randomness |

## Architecture

Single main contract (`summit_systems`) using OpenZeppelin components:
- `OwnableComponent` for admin functions
- `UpgradeableComponent` for proxy upgrades

**Business logic separation**: Pure functions in `src/logic/`, contract orchestrates storage/events/syscalls.

**StorePacking**: `LiveBeastStats` packs 15+ fields into a single `felt252`. Changes require updating indexer and client decoders. See top-level AGENTS.md for parity test details.

## Key Patterns

- **Token spend**: Consumables use `burn_from`; rewards use `transfer`
- **Upgrade costs enforced via constants**: `SPECIALS_COST`, `DIPLOMACY_COST`, `WISDOM_COST` (spirit/luck cost 1 each)
- **VRF is opt-in**: `vrf: bool` parameter on `attack()` - when true, uses Pragma VRF via `src/vrf.cairo`
- **Custom ERC20 interface**: `src/erc20/interface.cairo` defines a simplified `SummitERC20` trait with only `transfer` and `burn_from`. Do not import standard OZ `IERC20Dispatcher` for token spend operations -- use the project's custom interface.

## External Integrations

- Beast NFT (ERC721 ownership + Beast metadata dispatcher)
- Loot Survivor beast data contract (`IBeastSystemsDispatcher`)
- Death Mountain combat/beast libraries
- 7 ERC20 token contracts: reward, attack potion, revive potion, extra life potion, poison potion, skull, corpse

## Testing

Two test layers:

**Unit tests** - Inline `#[cfg(test)] mod tests` in source files, testing pure business logic:
- `src/models/beast.cairo` - StorePacking pack/unpack, parity vectors, zero/max values
- `src/logic/combat.cairo` - Combat calculations
- `src/logic/poison.cairo` - Poison mechanics
- `src/logic/revival.cairo` - Revival timing
- `src/logic/quest.cairo` - Quest rewards
- `src/logic/beast_utils.cairo` - Beast stat utilities

**Fork/integration tests** - `tests/test_summit.cairo`, all run against mainnet state:
- Fork configs in `Scarb.toml`: `mainnet` (latest block), `mainnet_6704808` (pinned block)
- Real player addresses and beast token IDs
- Includes 300-beast stress test

## Commands

```bash
scarb fmt --check    # Format check (CI)
scarb fmt -w         # Format and write
snforge test         # Run all tests
snforge test --coverage  # Tests with coverage report
scarb build          # Build contracts
```

## CI Pipeline

`scarb fmt --check` -> `scarb test --coverage` -> Codecov upload

Rate-limit retry: CI retries once after 30s if RPC 429 detected.

## Scarb.toml Config

```toml
[tool.fmt]
sort-module-level-items = true
max-line-length = 120

[profile.dev.cairo]
unstable-add-statements-functions-debug-info = true
unstable-add-statements-code-locations-debug-info = true
inlining-strategy = "avoid"
```

**Build config**: `build-external-contracts = ["beasts_nft::beasts_nft"]` in Scarb.toml -- required for fork tests that deploy the beast NFT.

## Error Pattern

Error constants defined in `src/constants.cairo`:
```cairo
pub mod errors {
    pub const NOT_TOKEN_OWNER: felt252 = 'Not token owner';
    pub const BEAST_ALIVE: felt252 = 'beast is alive';
    // ...
}
```

Use: `assert(condition, errors::CONSTANT_NAME);`

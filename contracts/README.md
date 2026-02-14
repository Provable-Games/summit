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
- Integration tests: `tests/test_summit.cairo`

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

| Constant | Value |
| --- | --- |
| `BASE_REVIVAL_TIME_SECONDS` | `86400` |
| `REDUCED_REVIVAL_TIME_SECONDS` | `57600` |
| `MINIMUM_DAMAGE` | `4` |
| `BEAST_MAX_EXTRA_LIVES` | `4000` |
| `BEAST_MAX_BONUS_HEALTH` | `2000` |
| `BEAST_MAX_BONUS_LVLS` | `40` |
| `BEAST_MAX_ATTRIBUTES` | `100` |
| `MAX_REVIVAL_COUNT` | `63` |
| `SPECIALS_COST` | `10` |
| `DIPLOMACY_COST` | `15` |
| `WISDOM_COST` | `20` |
| `TOKEN_DECIMALS` | `1e18` |

## Testing Model

- Main test suite is fork-based against Starknet mainnet.
- Fork configs are defined in `Scarb.toml` (`mainnet`, `mainnet_6704808`).
- Tests use real addresses/token IDs, so stable RPC access matters.
- Integration tests include large-scale attack stress coverage.
- CI retries `scarb test --coverage` once when RPC rate-limit signatures are detected.

## Deployment Notes

- Deployment profiles are configured in `snfoundry.toml`.
- Prefer `sncast` for declarations/deploys.
- Contracts and indexer target Cartridge Starknet mainnet RPC `v0_10`.

## Important Development Rule

`LiveBeastStats` packing in `src/models/beast.cairo` is a cross-layer contract.

If you change packed layout or field order, update and re-verify:

- `indexer/src/lib/decoder.ts`
- `client/src/utils/translation.ts`
- parity scripts in `indexer/scripts/` and `client/scripts/`

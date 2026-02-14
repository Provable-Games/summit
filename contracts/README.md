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

Alternative test runner:

```bash
snforge test
snforge test --coverage
```

## Testing Model

- Main test suite is fork-based against Starknet mainnet.
- Fork configs are defined in `Scarb.toml` (`mainnet`, `mainnet_6704808`).
- Tests use real addresses and token IDs, so stable RPC access matters.
- CI retries `scarb test --coverage` once when RPC rate-limit signatures are detected.

## Deployment Notes

- Deployment profiles are configured in `snfoundry.toml`.
- Contracts and indexer target Cartridge Starknet mainnet RPC `v0_10`.

## Important Development Rule

`LiveBeastStats` packing in `src/models/beast.cairo` is a cross-layer contract.

If you change packed layout or field order, update and re-verify:

- `indexer/src/lib/decoder.ts`
- `client/src/utils/translation.ts`
- parity scripts in `indexer/scripts/` and `client/scripts/`

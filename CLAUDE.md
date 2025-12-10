# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Savage Summit is a king-of-the-hill game on Starknet where players battle NFT beasts from Loot Survivor. One beast holds the summit; challengers attack to claim it and earn token rewards.

## Common Commands

### Client (React/TypeScript)
```bash
cd client
pnpm install          # Install dependencies (use --legacy-peer-deps if conflicts)
pnpm dev              # Start dev server at http://localhost:5173
pnpm build            # TypeScript check + production build
pnpm lint             # ESLint
```

### Contracts (Cairo)
```bash
cd contracts
scarb build           # Compile contracts
scarb test            # Run all tests (uses snforge)
scarb fmt --check     # Check formatting
scarb fmt -w          # Auto-format
```

### Running a Single Test
```bash
cd contracts
scarb test test_attack_basic    # Filter by test name
```

## Architecture

### Three Codebases
1. **client/** - React 18 + Vite frontend with Starknet.js and Dojo SDK
2. **contracts/** - Standalone Cairo smart contracts (main game logic)
3. **dojo/** - Dojo world for event emission (indexed by Torii)

### Client Data Flow
- **Contexts** (`contexts/`) provide global state: `StarknetProvider`, `MetagameProvider`, `StatisticsProvider`
- **Stores** (`stores/`) use Zustand for game state
- **API** (`api/`) handles Ekubo DEX quotes and Starknet RPC calls
- **Dojo** (`dojo/`) integrates with Dojo SDK for contract calls

### Contract Architecture
Main contract: `contracts/src/systems/summit.cairo`
- Constructor takes 13 parameters (owner, timestamps, durations, reward amounts, addresses)
- Uses OpenZeppelin's Ownable and Upgradeable components
- Dispatches to external contracts: Beasts NFT, Beast Data, Reward Token, Potions

Key interfaces in `contracts/src/interfaces.cairo`:
- `ISummitSystem` - Main game functions (attack, feed, claim, etc.)
- External dispatchers for token interactions

### Wallet Integration
Uses Cartridge Controller (`@cartridge/connector`) as primary wallet, with Starknet.js for RPC.

## Tool Versions

Defined in `.tool-versions`:
- Scarb 2.13.1
- Starknet Foundry 0.53.0

snforge version must match `snforge_std` in `contracts/Scarb.toml`.

## CI

GitHub Actions runs on PRs and pushes to main:
- `scarb-test` - Runs `scarb test`
- `scarb-fmt` - Checks Cairo formatting

## Key Files

- `contracts/src/constants.cairo` - Game constants and error messages
- `contracts/tests/test_summit.cairo` - Integration tests with mainnet fork
- `client/src/utils/networkConfig.ts` - Token addresses and network config
- `client/src/contexts/Statistics.tsx` - Token price fetching from Ekubo

## Game Mechanics Reference

Full documentation: https://docs.provable.games/summit

**Combat:**
- Power = Beast Level × (6 - Beast Tier)
- Type advantages: Brute > Hunter > Magical > Brute (+50% / -50% damage)
- Critical hits: +100% damage, chance based on Luck stat

**Tokens:**
- Kill Tokens: Earned when beasts kill adventurers (1 per kill) - used for stat upgrades
- Corpse Tokens: From dead adventurers (1 per level) - used for bonus health

**Upgrade Costs:**
- Luck/Spirit: 1 Kill Token per level (max 255)
- Specials: 10 Kill Tokens (one-time unlock)
- Diplomacy: 15 Kill Tokens (one-time unlock)
- Wisdom: 20 Kill Tokens (one-time unlock)
- Bonus Health: 1 Corpse Token per HP (max 1,023)

**Rewards:**
- Summit holder earns 0.1 $SURVIVOR per block
- Diplomacy beasts with matching names get 0.01 $SURVIVOR per block each
- Total pool: 100,000 $SURVIVOR

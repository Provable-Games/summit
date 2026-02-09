[![Scarb](https://img.shields.io/badge/Scarb-2.15.1-blue)](https://github.com/software-mansion/scarb)
[![Starknet Foundry](https://img.shields.io/badge/snforge-0.56.0-purple)](https://foundry-rs.github.io/starknet-foundry/)
[![codecov](https://codecov.io/gh/Provable-Games/summit/graph/badge.svg?token=FNL0D8QP4P)](https://codecov.io/gh/Provable-Games/summit)

# Savage Summit

A fully onchain, king-of-the-hill game featuring collectible NFT beasts from [Loot Survivor](https://lootsurvivor.io). Battle, level up, and upgrade your Beasts while earning token rewards!

## Overview

In Savage Summit, one beast holds the summit at any time. Challengers attack to claim the position, earning XP and rewards while the current king accumulates token rewards.

- **Summit Combat** - Turn-based battles with attack streaks, critical hits, and counter-attacks
- **Beast Progression** - Level up stats, unlock special abilities, and earn XP from victories
- **Consumable Potions** - Attack boosts, revival acceleration, extra lives, and poison
- **Diplomacy System** - Beasts with matching names share rewards and boost each other

**Get Beasts:** Play [Loot Survivor](https://lootsurvivor.io) or purchase on [Realms Marketplace](https://empire.realms.world/trade/beasts)

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Material-UI      |
| Web3      | Starknet.js, Cartridge Connector, Dojo SDK   |
| Contracts | Cairo, Scarb 2.15.1, Starknet Foundry 0.56.0 |
| Libraries | OpenZeppelin Cairo, Dojo Engine              |

## Project Structure

```
summit/
├── client/           # React web application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── contexts/     # React contexts (Starknet, Sound, etc.)
│   │   ├── dojo/         # Dojo SDK integration
│   │   ├── api/          # API clients (Ekubo, Starknet)
│   │   └── stores/       # Zustand state management
│   └── package.json
│
├── contracts/        # Cairo smart contracts
│   ├── src/
│   │   ├── systems/      # Summit game logic
│   │   ├── models/       # Beast data structures
│   │   ├── logic/        # Pure business logic
│   │   └── constants.cairo
│   └── tests/
│
├── api/              # Backend API server
│   └── src/
│
├── indexer/          # Blockchain event indexer
│   └── src/
│
└── .github/workflows/  # CI/CD
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- [Scarb 2.15.1](https://docs.swmansion.com/scarb/)
- [Starknet Foundry 0.56.0](https://foundry-rs.github.io/starknet-foundry/)

### Client Development

```bash
cd client
pnpm install
pnpm dev
```

The client runs at `http://localhost:5173` and connects to Starknet mainnet by default.

### Smart Contracts

```bash
cd contracts

# Run tests
scarb test

# Check formatting
scarb fmt --check

# Build
scarb build
```

## Configuration

### Client Environment Variables

Create `client/.env`:

```env
VITE_PUBLIC_CHAIN=SN_MAIN
VITE_PUBLIC_SUMMIT_ADDRESS=0x0784e5bac3de23ad40cf73e61c7b559dafb2495136ca474d1603815bb223408c
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

### Game Phases

1. **Summit Phase** - Open combat period
2. **Submission Phase** - Register beasts for leaderboard
3. **Distribution Phase** - Rewards distributed to top positions

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

## Deployment

**Mainnet Contract:** [0x0784e5bac3de23ad40cf73e61c7b559dafb2495136ca474d1603815bb223408c](https://voyager.online/contract/0x0784e5bac3de23ad40cf73e61c7b559dafb2495136ca474d1603815bb223408c)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `scarb test` and `pnpm lint`
4. Submit a pull request

## License

MIT

## Links

- [Game Documentation](https://docs.provable.games/summit) - Game Guide
- [Loot Survivor](https://lootsurvivor.io) - Collect Beasts
- [Realms Marketplace](https://empire.realms.world/trade/beasts) - Buy beasts

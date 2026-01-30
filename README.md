# Savage Summit

A king-of-the-hill style game on Starknet featuring collectible NFT beasts from [Loot Survivor](https://lootsurvivor.io). Players battle their beasts to claim and defend the summit, earning token rewards through combat victories.

## Overview

In Savage Summit, one beast holds the summit at any time. Challengers attack to claim the position, earning XP and rewards while the current king accumulates **0.1 $SURVIVOR per block**. The game distributes a total of **100,000 $SURVIVOR** tokens.

- **Summit Combat** - Turn-based battles with attack streaks, critical hits, and counter-attacks
- **Beast Progression** - Level up stats, unlock special abilities, and earn XP from victories
- **Consumable Potions** - Attack boosts, revival acceleration, extra lives, and poison
- **Diplomacy System** - Beasts with matching names share rewards and boost each other

**Get Beasts:** Play [Loot Survivor](https://lootsurvivor.io) or purchase on [Realms Marketplace](https://empire.realms.world/trade/beasts)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Material-UI |
| Web3 | Starknet.js, Cartridge Connector, Dojo SDK |
| Contracts | Cairo, Scarb 2.13.1, Starknet Foundry 0.53.0 |
| Libraries | OpenZeppelin Cairo, Dojo Engine |

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
│   │   └── constants.cairo
│   └── tests/
│
├── dojo/             # Dojo world & events
│   └── src/
│       ├── systems/      # Event emitters
│       └── models/       # Event structures
│
└── .github/workflows/  # CI/CD
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- [Scarb 2.13.1](https://docs.swmansion.com/scarb/)
- [Starknet Foundry 0.53.0](https://foundry-rs.github.io/starknet-foundry/)

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
VITE_PUBLIC_SUMMIT_ADDRESS=0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4
```

### Contract Parameters

Key game constants in `contracts/src/constants.cairo`:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `BASE_REVIVAL_TIME_SECONDS` | 86400 (24h) | Time before beast can revive |
| `BEAST_MAX_EXTRA_LIVES` | 4000 | Maximum extra lives per beast |
| `BEAST_MAX_BONUS_HEALTH` | 2000 | Maximum bonus health |
| `MINIMUM_DAMAGE` | 4 | Floor damage per attack |

## Game Mechanics

### Beast Stats

Upgraded using **Kill Tokens** (earned when beasts kill adventurers in Loot Survivor):

| Stat | Cost | Effect |
|------|------|--------|
| Luck | 1 Kill/level | Critical hit chance (up to 95%) |
| Spirit | 1 Kill/level | Reduces 24h revival cooldown |
| Specials | 10 Kill | Unlocks prefix/suffix name bonuses |
| Diplomacy | 15 Kill | Share rewards with matching beasts |
| Wisdom | 20 Kill | Earn XP when defending |

**Vitality:** Use **Corpse Tokens** (from dead adventurers) to add bonus health (max 2,000)

### Consumables

| Potion | Effect |
|--------|--------|
| Attack | Boost damage output |
| Revival | Reduce revival cooldown |
| Extra Life | Additional lives in combat |
| Poison | Damage over time on summit beast |

### Game Phases

1. **Summit Phase** - Open combat period
2. **Submission Phase** - Register beasts for leaderboard
3. **Distribution Phase** - Rewards distributed to top positions

## Contract Architecture

The main `summit_systems` contract implements:

- `start_summit()` - Initialize with first beast
- `attack()` / `attack_unsafe()` - Combat with/without VRF
- `feed()` - Increase beast health
- `apply_stat_points()` - Upgrade beast attributes
- `apply_poison()` - Apply poison to summit beast
- `claim_starter_pack()` - Claim potion rewards
- `distribute_beast_tokens()` - Distribute rewards to winners

## Deployment

**Mainnet Contract:** `0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `scarb test` and `pnpm lint`
4. Submit a pull request

## License

MIT

## Links

- [Game Documentation](https://docs.provable.games/summit) - Full game guide
- [Loot Survivor](https://lootsurvivor.io)
- [Realms Marketplace](https://empire.realms.world/trade/beasts) - Buy beasts
- [Provable Games](https://github.com/Provable-Games)
- [Starknet](https://starknet.io)
- [Dojo Engine](https://dojoengine.org)

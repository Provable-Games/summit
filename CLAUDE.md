# Savage Summit

A king-of-the-hill game on Starknet where players battle NFT beasts from Loot Survivor. One beast holds the summit; challengers attack to claim it and earn token rewards.

Full documentation: https://docs.provable.games/summit

## Codebase Navigation

| Directory | Purpose | Instructions |
|-----------|---------|--------------|
| `client/` | React 18 + Vite frontend | [client/CLAUDE.md](./client/CLAUDE.md) |
| `contracts/` | Cairo smart contracts (game logic) | [contracts/CLAUDE.md](./contracts/CLAUDE.md) |
| `dojo/` | Dojo world (event indexing for Torii) | [dojo/CLAUDE.md](./dojo/CLAUDE.md) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React)                          │
│  - Wallet: Cartridge Controller                                 │
│  - State: Zustand stores + React contexts                       │
│  - Real-time: Torii subscriptions via Dojo SDK                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Starknet RPC
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Contracts (Cairo)                            │
│  - Game logic: attack, feed, claim rewards                      │
│  - State: beast stats, summit holder, token balances            │
│  - Emits events via Dojo world                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Dispatch
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Dojo (Event Relay)                         │
│  - Emits indexed events                                         │
│  - Torii indexes for real-time client updates                   │
└─────────────────────────────────────────────────────────────────┘
```

## Shared Configuration

### Tool Versions (`.tool-versions`)

```
scarb 2.13.1
starknet-foundry 0.54.0
cairo-coverage 0.6.0
sozo 1.8.3
```

### RPC Endpoint

Use Cartridge's RPC for all network interactions:
- Mainnet: `https://api.cartridge.gg/x/starknet/mainnet`
- v0.10: `https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_10`

### CI Requirements

GitHub Actions runs on PRs and pushes to main:
- `scarb-test` - Runs `scarb test` for contracts
- `scarb-fmt` - Checks Cairo formatting

---

## Game Mechanics Reference

### Combat

- **Power** = Beast Level × (6 - Beast Tier)
- **Type advantages**: Brute > Hunter > Magical > Brute (+50% / -50% damage)
- **Critical hits**: +100% damage, chance based on Luck stat

### Tokens

| Token | Source | Usage |
|-------|--------|-------|
| Kill Token | Earned when beasts kill adventurers (1 per kill) | Stat upgrades |
| Corpse Token | From dead adventurers (1 per level) | Bonus health |

### Upgrade Costs

| Upgrade | Cost | Max |
|---------|------|-----|
| Luck/Spirit | 1 Kill Token per level | 255 |
| Specials | 10 Kill Tokens | One-time |
| Diplomacy | 15 Kill Tokens | One-time |
| Wisdom | 20 Kill Tokens | One-time |
| Bonus Health | 1 Corpse Token per HP | 2,000 |

### Rewards

- Summit holder earns **0.1 $SURVIVOR per block**
- Diplomacy beasts with matching names get **0.01 $SURVIVOR per block each**
- Total pool: **100,000 $SURVIVOR**

---

## Key Contract Addresses (Mainnet)

Summit Contract: `0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4`

Token addresses are defined in `client/src/utils/networkConfig.ts`.

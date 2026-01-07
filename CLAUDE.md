# Savage Summit

A king-of-the-hill game on Starknet where players battle NFT beasts from Loot Survivor. One beast holds the summit; challengers attack to claim it and earn token rewards.

Full documentation: https://docs.provable.games/summit

## Role & Context

You are a senior fullstack developer specializing in complete feature development with expertise across backend and frontend technologies. Your primary focus is delivering cohesive, end-to-end solutions that work seamlessly from database to user interface. On the frontend, you specialize in modern web applications with deep expertise in React 18+, Vite 5+, and TypeScript 5+. On the backend, you specialize in Cairo and Starknet smart contract development.

## Fullstack development checklist

- Database schema aligned with API contracts
- Type-safe API implementation with shared types
- Frontend components matching backend capabilities
- Authentication flow spanning all layers
- Consistent error handling throughout stack
- End-to-end testing covering user journeys
- Performance optimization at each layer
- Deployment pipeline for entire feature

## Data flow architecture

- Database design with proper relationships
- API endpoints following RESTful/GraphQL patterns
- Frontend state management synchronized with backend
- Optimistic updates with proper rollback
- Caching strategy across all layers
- Real-time synchronization when needed
- Consistent validation rules throughout
- Type safety from database to UI

## Real-time implementation

- WebSocket server configuration
- Frontend WebSocket client setup
- Event-driven architecture design
- Message queue integration
- Presence system implementation
- Conflict resolution strategies
- Reconnection handling
- Scalable pub/sub patterns

## Testing strategy

- Unit tests for business logic (backend & frontend)
- Integration tests for API endpoints
- Component tests for UI elements
- End-to-end tests for complete features
- Performance tests across stack
- Load testing for scalability
- Security testing throughout
- Cross-browser compatibility

## Architecture decisions

Monorepo vs polyrepo evaluation
Shared code organization
API gateway implementation
BFF pattern when beneficial
Microservices vs monolith
State management selection
Caching layer placement
Build tool optimization

## Performance optimization

- Database query optimization
- API response time improvement
- Frontend bundle size reduction
- Image and asset optimization
- Lazy loading implementation
- Server-side rendering decisions
- CDN strategy planning
- Cache invalidation patterns

## Codebase Navigation

| Directory    | Purpose                               | Instructions                                 |
| ------------ | ------------------------------------- | -------------------------------------------- |
| `client/`    | React 18 + Vite frontend              | [client/CLAUDE.md](./client/CLAUDE.md)       |
| `contracts/` | Cairo smart contracts (game logic)    | [contracts/CLAUDE.md](./contracts/CLAUDE.md) |
| `dojo/`      | Dojo world (event indexing for Torii) | [dojo/CLAUDE.md](./dojo/CLAUDE.md)           |

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

| Token        | Source                                           | Usage         |
| ------------ | ------------------------------------------------ | ------------- |
| Kill Token   | Earned when beasts kill adventurers (1 per kill) | Stat upgrades |
| Corpse Token | From dead adventurers (1 per level)              | Bonus health  |

### Upgrade Costs

| Upgrade      | Cost                   | Max      |
| ------------ | ---------------------- | -------- |
| Luck/Spirit  | 1 Kill Token per level | 255      |
| Specials     | 10 Kill Tokens         | One-time |
| Diplomacy    | 15 Kill Tokens         | One-time |
| Wisdom       | 20 Kill Tokens         | One-time |
| Bonus Health | 1 Corpse Token per HP  | 2,000    |

### Rewards

- Summit holder earns **0.1 $SURVIVOR per block**
- Diplomacy beasts with matching names get **0.01 $SURVIVOR per block each**
- Total pool: **100,000 $SURVIVOR**

---

## Key Contract Addresses (Mainnet)

Summit Contract: `0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4`

Token addresses are defined in `client/src/utils/networkConfig.ts`.

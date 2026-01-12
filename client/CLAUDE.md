# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Context

You are a **senior frontend gaming engineer** specializing in real-time blockchain gaming interfaces. You have deep expertise in:

- React 18 patterns (hooks, context, composition)
- Real-time state synchronization and event-driven UX
- Web3/Starknet wallet integration and transaction handling
- Performance optimization for gaming interfaces
- TypeScript for large-scale React applications

### Success Criteria

| Criterion       | Requirement                                                              |
| --------------- | ------------------------------------------------------------------------ |
| **Correctness** | Code builds with `pnpm build`, no runtime errors                         |
| **Performance** | No unnecessary re-renders; memoize expensive computations                |
| **UX**          | Optimistic updates for blockchain actions; clear loading/error states    |
| **Consistency** | Follow existing patterns; use established hooks and contexts             |
| **Simplicity**  | Prefer composition over large components; extract reusable hooks         |

### Behavioral Expectations

1. **Understand before modifying**: Read existing components and hooks before suggesting changes
2. **Respect provider hierarchy**: Order matters - Dojo after StarknetConfig, GameDirector last
3. **Preserve state patterns**: Contexts for side effects/fetching, Zustand for UI state
4. **Handle async carefully**: Clean up subscriptions, handle race conditions in event queues
5. **Test state changes**: Verify state synchronization between stores and contexts

### Architecture Constraints

- **GameDirector** is the central orchestrator - don't bypass it for game state updates
- **Beast collection** uses localStorage caching - maintain hydration patterns
- **Event processing** is sequential to prevent race conditions - respect queue patterns
- **TypeScript** is intentionally relaxed (`strict: false`) - don't add excessive type guards

### When Uncertain

- Ask about state management approach (store vs context vs local)
- Clarify wallet interaction requirements (Cartridge-specific vs universal)
- Confirm animation/UX expectations before implementing
- Default to simpler, more composable solutions

---

## Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server at http://localhost:5173
pnpm build            # TypeScript check + production build
pnpm lint             # ESLint
```

## Architecture

React 18 + Vite frontend for Savage Summit, a king-of-the-hill game on Starknet featuring NFT beasts from Loot Survivor.

### Provider Hierarchy

Entry point `main.tsx` sets up providers in order:
1. **PostHogProvider** - Analytics
2. **DynamicConnectorProvider** - Wallet connection (Cartridge Controller)
3. **DojoSdkProvider** - Dojo SDK for Torii subscriptions
4. **SoundProvider** - Audio management

### Key Directories

- **contexts/** - React contexts for wallet (`starknet.tsx`), controller (`controller.tsx`), game state (`GameDirector.tsx`)
- **stores/** - Zustand stores: `gameStore.ts` (game state), `autopilotStore.ts` (auto-attack logic)
- **dojo/** - Contract interaction: `useSystemCalls.ts` (attack/feed/claim), `useGameTokens.ts` (token balances)
- **api/** - Direct RPC calls: `starknet.ts` (summit data, balances), `ekubo.ts` (DEX quotes)
- **components/** - UI: `Summit.tsx` (main game), `BeastCollection.tsx`, `ActionBar.tsx`

### Data Flow

1. **Wallet**: `DynamicConnectorProvider` manages Cartridge Controller connection
2. **Network Config**: `utils/networkConfig.ts` defines RPC endpoints, token addresses, contract policies
3. **Game State**: `GameDirector.tsx` coordinates polling summit data and beast collection
4. **Contract Calls**: `useSystemCalls.ts` wraps Dojo SDK for `attack()`, `feed()`, `claim_beast_reward()`, etc.

### Network Configuration

`utils/networkConfig.ts` contains:
- RPC endpoints (Cartridge's `api.cartridge.gg`)
- Token addresses (ATTACK, REVIVE, EXTRA_LIFE, POISON, SKULL, CORPSE, SURVIVOR)
- Torii subscription URLs
- Contract call policies for Cartridge Controller

### Environment Variables

```env
VITE_PUBLIC_CHAIN=SN_MAIN
VITE_PUBLIC_SUMMIT_ADDRESS=0x06015596D10cBc6DD695a964827eEe290d3487ffFCF60d02264b81524Dd275E4
VITE_PUBLIC_POSTHOG_KEY=<posthog_key>
VITE_PUBLIC_POSTHOG_HOST=<posthog_host>
```

## Directory Structure

```
src/
├── main.tsx               # App entry, provider composition
├── App.tsx                # Root component
├── api/                   # Direct RPC calls (no Dojo SDK)
│   ├── starknet.ts        # Summit data, beast balances
│   └── ekubo.ts           # DEX price quotes
├── components/            # UI components
│   ├── Summit.tsx         # Main game display
│   ├── BeastCollection.tsx
│   ├── ActionBar.tsx
│   └── dialogs/           # Modal dialogs
├── contexts/              # React contexts (side effects, fetching)
│   ├── starknet.tsx       # Wallet connection (DynamicConnectorProvider)
│   ├── controller.tsx     # Cartridge Controller integration
│   ├── GameDirector.tsx   # Central game state coordinator
│   ├── Statistics.tsx     # Token prices from Ekubo
│   └── sound.tsx          # Audio management
├── dojo/                  # Dojo SDK integration
│   ├── useSystemCalls.ts  # Contract calls (attack, feed, claim)
│   └── useGameTokens.ts   # Token balance subscriptions
├── stores/                # Zustand UI state
│   ├── gameStore.ts       # Game state (summit, beasts, battles)
│   └── autopilotStore.ts  # Auto-attack configuration
├── types/                 # TypeScript types
│   └── game.ts            # Beast, Summit, BattleEvent types
└── utils/
    ├── networkConfig.ts   # RPC endpoints, token addresses, policies
    ├── BeastData.ts       # Beast metadata
    └── beasts.ts          # Beast stat calculations
```

## Key Patterns

### 1. Zustand Store Pattern

Game state is managed in `stores/gameStore.ts`:

```typescript
// Reading state
const { summit, collection, attackInProgress } = useGameStore();

// Updating state
const { setSummit, setAttackInProgress } = useGameStore();
setAttackInProgress(true);

// Functional updates for arrays
setCollection((prev) => prev.filter(b => b.health > 0));
```

### 2. Contract Calls via useSystemCalls

All contract interactions go through `dojo/useSystemCalls.ts`:

```typescript
const { attack, feed, claimBeastReward, applyPotions } = useSystemCalls();

// Execute an attack
await attack(selectedBeasts, attackPotions);
```

### 3. Direct RPC vs Dojo SDK

| Use Case | Approach | File |
|----------|----------|------|
| Contract calls (attack, feed) | account.execute | `dojo/useSystemCalls.ts` |
| Token balances | Direct RPC | `api/starknet.ts` |
| Summit state | Direct RPC | `api/starknet.ts` |
| DEX quotes | Direct RPC | `api/ekubo.ts` |
| Real-time events | Torii subscription | `dojo/useGameTokens.ts` |

## Common Tasks

### Adding a New Contract Call

1. Add to `dojo/useSystemCalls.ts`:
```typescript
const myAction = async (params: MyParams) => {
  const calls = [{
    contractAddress: SUMMIT_ADDRESS,
    entrypoint: "my_action",
    calldata: CallData.compile({ ...params }),
  }];
  return executeAction(calls, () => { /* reset state */ });
};
```

2. Add to the return object of `useSystemCalls`

### Adding a New Token

1. Add address to `utils/networkConfig.ts` in the `tokens` object
2. Add to `dojo/useGameTokens.ts` for balance fetching
3. Update UI components to display

## Key Files

- `src/main.tsx` - App entry, provider setup, Dojo SDK init
- `src/contexts/GameDirector.tsx` - Central game state coordination
- `src/dojo/useSystemCalls.ts` - Contract call wrappers
- `src/stores/gameStore.ts` - Zustand game state
- `src/utils/networkConfig.ts` - Network config, token addresses, policies

## Testing

Currently no test suite. Verify changes with:
```bash
pnpm build   # TypeScript check + production build
pnpm lint    # ESLint
```

## Parent Project

See `/CLAUDE.md` for project overview and `/contracts/CLAUDE.md` for Cairo contract development.

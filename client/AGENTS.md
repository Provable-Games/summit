# Client

React 18 SPA for the Savage Summit game. Read [top-level AGENTS.md](../AGENTS.md) first for architecture, game mechanics, and contract addresses.

Role: React SPA providing real-time game UI with Starknet wallet integration and WebSocket-driven state updates.

## Stack

- React 18.2.0, Vite 5.4.21, TypeScript 5.8.3
- MUI 7.0.2 + Emotion CSS-in-JS (NO Tailwind)
- Zustand 4.5.6 (state management)
- Framer Motion 12.7.4 (animations)
- Vitest 3.1.1

Blockchain/client SDK stack:
- starknet.js 8.5.2
- @starknet-react/core 5.0.1, @starknet-react/chains 5.0.1
- @cartridge/controller 0.12.1, @cartridge/connector 0.12.1
- Dojo packages pinned in `pnpm.overrides`: `@dojoengine/sdk` 1.7.3, core/utils/torii-client 1.7.2

## Key Files

| File | Purpose |
| ---- | ------- |
| `src/main.tsx` | Provider composition: PostHog > DynamicConnector > Sound > QuestGuide > App |
| `src/contexts/GameDirector.tsx` | Gameplay orchestrator: executes game actions, consumes API + WS streams, merges realtime updates into stores, dispatches notifications |
| `src/contexts/starknet.tsx` | Starknet + Cartridge Controller setup (StarknetConfig, connectors, RPC) |
| `src/contexts/controller.tsx` | Controller context (session management) |
| `src/stores/gameStore.ts` | Zustand store for core game/UI state |
| `src/stores/autopilotStore.ts` | Zustand store for autopilot policy and spend counters |
| `src/dojo/useSystemCalls.ts` | Contract interaction hook (all write operations) |
| `src/dojo/useGameTokens.ts` | Token balance and collection hooks via Dojo/Torii |
| `src/hooks/useWebSocket.ts` | WebSocket real-time sync (channels: `summit`, `event`) |
| `src/utils/themes.ts` | MUI custom theme |
| `src/utils/translation.ts` | LiveBeastStats unpacking (cross-layer parity critical) |
| `src/utils/beasts.ts` | Beast calculation utilities |
| `src/utils/networkConfig.ts` | Network-specific addresses and config |

## Data Flow

```
Contract Event -> Indexer -> PostgreSQL (NOTIFY) -> API WebSocket -> useWebSocket -> GameDirector -> Zustand stores -> React components

Parallel read path: Dojo/Torii SQL queries for token/collection data flow through `src/dojo/useGameTokens.ts`.
```

## Directory Map

```
src/
  api/          # REST/RPC clients
  components/   # Gameplay UI and dialogs
  contexts/     # Provider layer and orchestration (GameDirector, wallet, sound, controller)
  dojo/         # Starknet call helpers and token hooks
  hooks/        # Realtime hooks (useWebSocket)
  stores/       # Zustand state (gameStore, autopilotStore)
  types/        # Shared TS domain types
  utils/        # Theme, translation, network config, unpack helpers
  pages/        # Page-level route components (MainPage)
  abi/          # Contract ABI JSON (router-abi.json)
  assets/       # Static assets
```

## TypeScript Config

- `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` (tsconfig.json)
- Path alias: `@/*` maps to `src/*`
- Target: ES2020, bundler module resolution

## Environment Variables

- `VITE_PUBLIC_CHAIN` - Network identifier (e.g., `SN_MAIN`). Optional, defaults to `SN_MAIN`.
- `VITE_PUBLIC_SUMMIT_ADDRESS` - Summit contract address. Optional, has mainnet default.
- `VITE_PUBLIC_POSTHOG_KEY` - PostHog analytics project key. Optional.
- `VITE_PUBLIC_POSTHOG_HOST` - PostHog API host URL. Optional.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # TypeScript check + Vite build
pnpm lint         # ESLint (cached)
pnpm test         # Vitest run
pnpm test:coverage # Vitest with coverage
pnpm test:parity  # Validate LiveBeastStats unpacking matches contract packing
```

## CI Pipeline

lint -> build -> parity test -> test:coverage -> Codecov upload

Triggered by changes to `client/**` or `contracts/src/models/beast.cairo`.

## Testing

- Vitest 3.1.1 with @vitest/coverage-v8
- Parity test in `scripts/test-live-beast-stats-parity.ts` validates cross-layer LiveBeastStats sync
- Limited test coverage currently (~9 test files)
- Test files colocated with source (e.g., `contexts/controller.test.tsx`)

## Patterns

- **Styling**: MUI theme system (`utils/themes.ts`) + Emotion `sx` prop. Do not introduce Tailwind.
- **State**: Zustand for global game state; React Context for providers (controller, sound, starknet)
- **Contract calls**: All writes go through `useSystemCalls` hook with error parsing via `parseExecutionError`
- **Address handling**: Normalize addresses to lowercase 66-char hex (`0x` + 64 chars) before comparison. Source constants use mixed formats; the API's `normalizeAddress()` handles padding.

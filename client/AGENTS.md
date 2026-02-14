# Client Agent Guide

Read [`../AGENTS.md`](../AGENTS.md) first for shared mechanics, addresses, CI filters, and cross-layer packing rules.

## Role
- `client/` is the React 18 SPA for gameplay, wallet/session handling, and realtime state projection.

## Stack
- React `18.2.0`
- Vite `5.4.21`
- TypeScript `5.8.3`
- MUI `7.0.2` + Emotion (`@emotion/react`, `@emotion/styled`)
- Zustand `4.5.6`
- Framer Motion `12.7.4`
- Vitest `3.1.1`

Blockchain/client SDK stack:
- `starknet` `8.5.2`
- `@starknet-react/core` `5.0.1`
- `@starknet-react/chains` `5.0.1`
- `@cartridge/controller` `0.12.1`
- `@cartridge/connector` `0.12.1`
- Dojo packages pinned in `pnpm.overrides` (`@dojoengine/sdk` `1.7.3`, core/utils/torii-client `1.7.2`)

## Core Architecture Patterns
- Provider composition starts in `src/main.tsx`:
  - `PostHogProvider` -> `DynamicConnectorProvider` -> `SoundProvider` -> `QuestGuideProvider` -> `App`.
- Starknet provider wiring lives in `src/contexts/starknet.tsx` (`StarknetConfig`, connectors, RPC provider).
- `src/contexts/GameDirector.tsx` is the gameplay orchestrator:
  - executes game actions
  - consumes API + WS streams
  - merges realtime updates into stores
  - dispatches notifications.
- Zustand split:
  - `src/stores/gameStore.ts` for core game/UI state.
  - `src/stores/autopilotStore.ts` for autopilot policy and spend counters.
- Contract call assembly is centralized in `src/dojo/useSystemCalls.ts`.
- WebSocket sync is centralized in `src/hooks/useWebSocket.ts`.
- Packed `LiveBeastStats` decoding for parity-sensitive paths lives in `src/utils/translation.ts`.

## Data Flow
`Contract Event -> Indexer -> PostgreSQL (NOTIFY) -> API WebSocket -> useWebSocket -> GameDirector -> Zustand stores -> React components`

Parallel read path:
- Dojo/Torii SQL queries (for token/collection reads) flow through `src/dojo/useGameTokens.ts` using `currentNetworkConfig.toriiUrl`.

## Directory Map
- `src/components/`: gameplay UI and dialogs.
- `src/contexts/`: provider layer and orchestration (`GameDirector`, wallet, sound, controller).
- `src/dojo/`: Starknet call helpers and token hooks.
- `src/hooks/`: realtime hooks (`useWebSocket`).
- `src/stores/`: Zustand state.
- `src/utils/`: theme, translation, network config, unpack helpers.
- `src/api/`: REST/RPC clients.
- `src/types/`: shared TS domain types.

## Styling Rules
- Use MUI theme + Emotion only.
- Primary theme: `src/utils/themes.ts`.
- Do not introduce Tailwind.

## TypeScript and Config
- `tsconfig.json` is intentionally non-strict:
  - `strict: false`
  - `noImplicitAny: false`
  - `strictNullChecks: false`
- Path alias: `@/* -> src/*`.

## Tests
- Test runner: Vitest.
- Coverage is limited (9 test files currently under `src/`).
- Cross-layer packing parity script: `scripts/test-live-beast-stats-parity.ts`.

## Commands
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Parity: `pnpm test:parity`

## CI for Client
- Triggered by `client/**` and by `contracts/src/models/beast.cairo`.
- Job sequence: lint -> build -> parity -> coverage -> Codecov.

## Environment Variables
- `VITE_PUBLIC_CHAIN`
- `VITE_PUBLIC_SUMMIT_ADDRESS`
- `VITE_PUBLIC_POSTHOG_KEY`
- `VITE_PUBLIC_POSTHOG_HOST`

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

## Key Files

| File | Purpose |
| --- | --- |
| `src/main.tsx` | Provider composition entrypoint (`PostHog -> DynamicConnector -> Analytics -> Sound -> QuestGuide -> App`). |
| `src/contexts/starknet.tsx` | Starknet + Cartridge connector wiring. |
| `src/contexts/GameDirector.tsx` | Gameplay orchestrator for API/WS/state sync and action dispatch. |
| `src/stores/gameStore.ts` | Core game + UI global state. |
| `src/stores/autopilotStore.ts` | Autopilot policy and spend counters. |
| `src/dojo/useSystemCalls.ts` | Central write path for contract calls + error parsing. |
| `src/dojo/useGameTokens.ts` | Token and collection reads via Torii/API. |
| `src/hooks/useWebSocket.ts` | WebSocket `summit`/`event` channel sync. |
| `src/utils/translation.ts` | `LiveBeastStats` unpacking (parity-critical). |
| `src/utils/networkConfig.ts` | Network endpoints and contract addresses. |
| `src/utils/themes.ts` | MUI theme definition. |
| `src/api/ekubo.ts` | Ekubo quoting/swaps/liquidity helpers used by market flows. |

## Core Architecture Patterns
- `GameDirector` is the central coordinator for reads, WS events, optimistic updates, and notifications.
- All write operations route through `useSystemCalls`; user-facing execution errors are normalized by `parseExecutionError`.
- State is split across two Zustand stores (`gameStore`, `autopilotStore`) to isolate high-frequency gameplay updates.
- Packed stats decode (`src/utils/translation.ts`) must stay bit-exact with contracts/indexer.

## Data Flow
`Contract Event -> Indexer -> PostgreSQL (NOTIFY) -> API WebSocket -> useWebSocket -> GameDirector -> Zustand stores -> React components`

Parallel read path:
- Dojo/Torii SQL reads flow through `src/dojo/useGameTokens.ts` using `currentNetworkConfig.toriiUrl`.

## Directory Map
- `src/components/`: gameplay UI and dialogs.
- `src/contexts/`: provider layer and orchestration.
- `src/dojo/`: Starknet call helpers and token hooks.
- `src/hooks/`: realtime hooks.
- `src/stores/`: Zustand stores.
- `src/utils/`: theme, network config, unpack helpers.
- `src/api/`: REST/RPC integrations.
- `src/types/`: shared TS domain types.

## Styling Rules
- Use MUI theme + Emotion only.
- Primary theme: `src/utils/themes.ts`.
- Do not introduce Tailwind.

## TypeScript and Config
- `tsconfig.json` runs in strict mode:
  - `strict: true`
- Path alias: `@/* -> src/*`.

## Address Handling
- When querying normalized owner data, use padded lowercase formatting (`addAddressPadding(owner.toLowerCase())`) to match DB/API address shape.
- UI address-name cache uses lowercase trimmed normalization for consistent map lookups.

## Tests
- Test runner: Vitest (`environment: node`, v8 coverage).
- Coverage remains limited (about 9 test files under `src/`).
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
- `VITE_PUBLIC_CHAIN` (network key, typically `SN_MAIN`)
- `VITE_PUBLIC_SUMMIT_ADDRESS` (contract address used in network policy config)
- `VITE_PUBLIC_POSTHOG_KEY`
- `VITE_PUBLIC_POSTHOG_HOST`

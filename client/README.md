# Client

React SPA for Savage Summit gameplay, wallet/session flows, and realtime state updates.

For AI-focused implementation guidance, read `AGENTS.md` in this folder. For shared architecture and mechanics, read `../README.md`.

## Stack

- React `18.2.0`
- Vite `5.4.21`
- TypeScript `5.8.3`
- MUI `7.0.2` + Emotion
- Zustand `4.5.6`
- Framer Motion `12.7.4`
- `starknet` `8.5.2`
- `@starknet-react/core` `5.0.1`
- Cartridge Controller/Connector `0.12.1`
- Dojo SDK packages pinned to `1.7.x` via `pnpm.overrides`

## Quick Start

```bash
cd client
pnpm install
pnpm dev
```

The dev server runs on `https://localhost:5173` (HTTPS enabled via `vite-plugin-mkcert` in `vite.config.ts`).

## Environment

The repo includes `client/.env` with mainnet values. If you need to override, set:

| Variable | Purpose |
| --- | --- |
| `VITE_PUBLIC_CHAIN` | Network key (typically `SN_MAIN`). |
| `VITE_PUBLIC_SUMMIT_ADDRESS` | Summit contract address used by client policy config. |
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog key. |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog host. |

Example:

```env
VITE_PUBLIC_CHAIN=SN_MAIN
VITE_PUBLIC_SUMMIT_ADDRESS=0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa
VITE_PUBLIC_POSTHOG_KEY=<your-key>
VITE_PUBLIC_POSTHOG_HOST=<your-host>
```

## Scripts

- Dev server: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Packing parity check: `pnpm test:parity`

## Project Structure

```text
src/
  api/          REST/RPC/Ekubo integrations
  components/   Gameplay UI and dialogs
  contexts/     Provider layer + orchestration (`GameDirector`, wallet, sound)
  dojo/         Contract write helpers and token-read hooks
  hooks/        Realtime hooks (`useWebSocket`)
  stores/       Zustand stores (`gameStore`, `autopilotStore`)
  types/        Shared domain types
  utils/        Theme/network config/translation helpers
  pages/        Route-level pages
  abi/          Contract ABI artifacts
```

## Architecture Notes

- Provider composition starts in `src/main.tsx`:
  - `PostHogProvider -> DynamicConnectorProvider -> Analytics -> SoundProvider -> QuestGuideProvider -> App`
- Gameplay orchestration is centralized in `src/contexts/GameDirector.tsx`.
- State is split between `src/stores/gameStore.ts` and `src/stores/autopilotStore.ts`.
- Contract write assembly lives in `src/dojo/useSystemCalls.ts`.
- Realtime subscription handling lives in `src/hooks/useWebSocket.ts`.
- Packed stat decode logic is in `src/utils/translation.ts` and must stay in sync with contracts/indexer.

## Data Flow

`Contract Event -> Indexer -> PostgreSQL (NOTIFY) -> API WS -> useWebSocket -> GameDirector -> Zustand -> UI`

Parallel read path:
- Dojo/Torii SQL and API reads flow via `src/dojo/useGameTokens.ts`.

## Path Alias

TypeScript + Vite alias:
- `@/* -> src/*`

## Styling

Use MUI + Emotion. The primary theme is in `src/utils/themes.ts`.

Tailwind is not used in this project.

## Testing

- Test runner: Vitest (`environment: node`)
- Coverage provider: v8 (`coverage/` output)
- Parity script: `scripts/test-live-beast-stats-parity.ts`

## CI

Client CI runs on `client/**` and `contracts/src/models/beast.cairo` changes:

`lint -> build -> test:parity -> test:coverage -> Codecov`.

# Savage Summit -- Client

The web client for Savage Summit, a fully onchain king-of-the-hill game on Starknet where collectible NFT beasts battle for control of the summit. This is a React 18 single-page application that connects to Starknet mainnet, renders real-time game state, and lets players interact with the Summit smart contract.

For AI agents: see [AGENTS.md](AGENTS.md) for implementation guidance.

For game mechanics, contract addresses, token economics, and cross-layer data formats, see the [top-level README](../README.md).

## Prerequisites

- **Node.js 22** (LTS recommended)
- **pnpm 10** (package manager for all TypeScript projects in this monorepo)

## Stack

- React 18.2.0, Vite 5.4.21, TypeScript 5.8.3
- MUI 7.0.2 + Emotion CSS-in-JS
- Zustand 4.5.6 (state management), Framer Motion 12.7.4 (animations)
- starknet.js 8.5.2, @starknet-react/core 5.0.1
- @cartridge/controller 0.12.1, @cartridge/connector 0.12.1
- Dojo SDK 1.7.3 (via pnpm overrides)
- Vitest 3.1.1 (test framework)

See `package.json` for the complete dependency list.

## Getting Started

1. Install dependencies:

   ```bash
   cd client
   pnpm install
   ```

2. The repo includes a `client/.env` file with mainnet defaults. To override values, edit it or create a `.env.local`:

   ```env
   VITE_PUBLIC_CHAIN=SN_MAIN
   VITE_PUBLIC_SUMMIT_ADDRESS=0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa
   VITE_PUBLIC_POSTHOG_KEY=<your-posthog-key>
   VITE_PUBLIC_POSTHOG_HOST=<your-posthog-host>
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

   The app runs at `https://localhost:5173` (HTTPS via the `mkcert` Vite plugin).

## Project Structure

```
src/
  main.tsx            Entry point and provider composition
  App.tsx             Root application component
  api/                REST and RPC clients (summit API, Starknet, Ekubo)
  components/         Gameplay UI, dialogs, and visual elements
  contexts/           React context providers and orchestration
    GameDirector.tsx    Central gameplay orchestrator
    starknet.tsx        Starknet config and Cartridge Controller setup
    controller.tsx      Session and controller context
    sound.tsx           Sound effects provider
    QuestGuide.tsx      Quest progression guide
    Statistics.tsx      Game statistics context
  dojo/               Starknet write operations and token hooks
    useSystemCalls.ts   All contract interaction calls
    useGameTokens.ts    Token balance hooks via Dojo/Torii
  hooks/              Realtime data hooks
    useWebSocket.ts     WebSocket connection for live game events
  stores/             Zustand state stores
    gameStore.ts        Core game and UI state
    autopilotStore.ts   Autopilot policy and spend counters
  types/              Shared TypeScript domain types
  utils/              Helpers and configuration
    translation.ts      LiveBeastStats bit-unpacking (cross-layer critical)
    networkConfig.ts    Network-specific addresses and endpoints
    themes.ts           MUI custom theme
    beasts.ts           Beast calculation utilities
```

## Development Commands

| Command               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `pnpm dev`            | Start the Vite dev server with HMR                      |
| `pnpm build`          | TypeScript type-check (`tsc -b`) then Vite production build |
| `pnpm lint`           | Run ESLint with caching                                 |
| `pnpm test`           | Run Vitest test suite                                   |
| `pnpm test:coverage`  | Run tests with V8 coverage (output in `coverage/`)      |
| `pnpm test:parity`    | Validate that `LiveBeastStats` unpacking matches the Cairo contract |
| `pnpm preview`        | Serve the production build locally                      |

## Environment Variables

| Variable                      | Required | Description                          |
| ----------------------------- | -------- | ------------------------------------ |
| `VITE_PUBLIC_CHAIN`           | No       | Starknet network identifier (default: `SN_MAIN`) |
| `VITE_PUBLIC_SUMMIT_ADDRESS`  | No       | Summit contract address (has a mainnet default)   |
| `VITE_PUBLIC_POSTHOG_KEY`     | No       | PostHog analytics project key        |
| `VITE_PUBLIC_POSTHOG_HOST`    | No       | PostHog API host URL                 |

All environment variables are prefixed with `VITE_PUBLIC_` and are exposed to the browser at build time by Vite.

## Architecture

### Data Flow

The client receives real-time game updates through the following pipeline:

```
Starknet Contract Events
        |
        v
Apibara Indexer --> PostgreSQL (NOTIFY)
        |
        v
   API Server (Hono)
        |
        v  WebSocket channels: "summit", "event"
   useWebSocket hook
        |
        v
   GameDirector context
        |
        v
   Zustand stores (gameStore, autopilotStore)
        |
        v
   React components
```

A parallel read path exists for token and collection data: Dojo/Torii SQL queries flow through `src/dojo/useGameTokens.ts` using the configured Torii URL.

### Provider Composition

The app wraps the component tree in a series of providers, composed in `src/main.tsx`:

```
PostHogProvider                Product analytics
  DynamicConnectorProvider     Starknet wallet + Cartridge Controller
    Analytics                  Vercel page view tracking (sibling)
    SoundProvider              Sound effects
      QuestGuideProvider       Quest progression tracking
        App                    Router and game UI
```

### State Management

- **Zustand stores** hold global game state (`gameStore.ts`) and autopilot configuration (`autopilotStore.ts`). Components subscribe to slices of these stores for efficient re-rendering.
- **React contexts** provide services that need the component tree: wallet connection, sound, quest guidance, and statistics.
- **GameDirector** (`src/contexts/GameDirector.tsx`) is the central orchestrator. It consumes WebSocket streams and API data, merges real-time updates into the Zustand stores, and dispatches UI notifications.

### Contract Interactions

All write operations to the Summit contract go through the `useSystemCalls` hook (`src/dojo/useSystemCalls.ts`). This hook constructs and submits Starknet transactions via the Cartridge Controller session, with error parsing handled by `parseExecutionError`.

### Wallet and Session Management

The client uses [Cartridge Controller](https://docs.cartridge.gg/) for wallet connectivity and session-based transaction signing. The Starknet provider configuration lives in `src/contexts/starknet.tsx`, and session management is handled by `src/contexts/controller.tsx`.

### Styling

The UI is built with MUI (Material UI) 7 and Emotion CSS-in-JS. A custom theme is defined in `src/utils/themes.ts`. All styling uses the MUI theme system and the `sx` prop. Tailwind CSS is not used and should not be introduced.

The UI also uses Framer Motion for animations, Recharts for charts, Notistack for snackbar notifications, and @tanstack/react-virtual for virtualized lists.

### Path Aliases

TypeScript and Vite are configured with the `@/*` alias that maps to `src/*`. Use this for imports:

```typescript
import { useGameStore } from "@/stores/gameStore";
import { calculateLevel } from "@/utils/beasts";
```

## Testing

Tests use **Vitest 3.1.1** with **@vitest/coverage-v8** for code coverage. The test environment is Node.js (configured in `vitest.config.ts`).

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm test:coverage
```

Coverage reports are generated in LCOV and text formats under the `coverage/` directory.

### Parity Tests

The `LiveBeastStats` struct is packed into a single `felt252` (251 bits) on-chain in Cairo, and unpacked in both the client (`src/utils/translation.ts`) and the indexer. A parity test ensures these implementations stay in sync:

```bash
pnpm test:parity
```

This runs `scripts/test-live-beast-stats-parity.ts` against a known constant from the Cairo contract. If you change the bit layout or field order in `contracts/src/models/beast.cairo`, you must update the unpacking logic in all three layers (contract, indexer, client) and both parity scripts in the same PR.

### Test File Location

Test files are colocated with their source files (for example, `src/contexts/controller.test.tsx` alongside `src/contexts/controller.tsx`).

## CI Pipeline

The client CI pipeline runs on PRs that touch `client/**` or `contracts/src/models/beast.cairo`:

```
lint --> build --> parity test --> test:coverage --> Codecov upload
```

See the [top-level README](../README.md) for details on the full CI workflow and AI review gates.

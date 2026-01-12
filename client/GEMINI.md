# Savage Summit - Client

## Project Overview

**Savage Summit** is a king-of-the-hill strategy game on Starknet. This directory (`/client`) contains the **React 18** frontend application built with **Vite**. Players connect their wallets (Cartridge Controller), view the leaderboard, manage their beast collection, and battle for the Summit.

*   **Framework:** React 18 + Vite
*   **Language:** TypeScript
*   **State Management:** Zustand (UI state) + React Context (Global coordination)
*   **Styling:** Material UI (`@mui/material`) + Emotion + Framer Motion
*   **Blockchain Integration:** Starknet.js, Dojo SDK, Cartridge Controller

## Architecture

### 1. Provider Hierarchy (`src/App.tsx`)

The application enforces a strict provider order to ensure dependencies are available:

1.  **`SnackbarProvider`**: Notification UI.
2.  **`StatisticsProvider`**: Token price data (Ekubo).
3.  **`ControllerProvider`**: Wallet connection management.
4.  **`GameDirector`**: Central orchestrator for game state polling and coordination.

### 2. State Management

*   **Zustand (`src/stores/`)**:
    *   `gameStore.ts`: Primary game state (Summit status, beast collection, battle events, UI toggles).
    *   `autopilotStore.ts`: Configuration for the auto-attack feature.
*   **React Context (`src/contexts/`)**:
    *   `GameDirector.tsx`: Handles data fetching intervals and updates the Zustand store.
    *   `controller.tsx`: Wraps the Cartridge Controller SDK.
    *   `sound.tsx`: Manages audio playback.

### 3. Network & Data Layer

*   **Dojo SDK (`src/dojo/`)**:
    *   `useSystemCalls.ts`: Wraps contract interactions (`attack`, `feed`, `claim`).
    *   `useGameTokens.ts`: Subscribes to token balance updates via Torii.
*   **Direct RPC (`src/api/`)**:
    *   `starknet.ts`: Fetches Summit state and beast balances directly from the sequencer (bypassing indexing for critical data).
    *   `ekubo.ts`: Fetches token prices.

## Key Directories

| Directory | Purpose |
| :--- | :--- |
| **`src/components/`** | UI components (Summit display, Beast cards, Leaderboard). |
| **`src/pages/`** | Route components (`MainPage.tsx`). |
| **`src/utils/`** | Helper functions, including `networkConfig.ts` (Addresses/RPCs) and `themes.ts`. |
| **`src/assets/`** | Static assets (images, sounds, animations). |

## Development

### Prerequisites
*   **Node.js:** v20+
*   **Package Manager:** pnpm

### Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies. |
| `pnpm dev` | Start local development server (default port 5173). |
| `pnpm build` | Run TypeScript validation and build for production. |
| `pnpm lint` | Run ESLint. |

### Environment Variables

Required in `.env`:
```env
VITE_PUBLIC_CHAIN=SN_MAIN
VITE_PUBLIC_SUMMIT_ADDRESS=<contract_address>
```

## Conventions & Patterns

*   **GameDirector Pattern:** Do not fetch game state directly in components if possible. Let `GameDirector` handle synchronization and consume data from `useGameStore`.
*   **Optimistic Updates:** The UI should reflect actions immediately where possible, but rely on the `GameDirector` to reconcile with the blockchain state.
*   **Contract Calls:** All write operations (transactions) must go through `useSystemCalls.ts`.
*   **Styling:** Use `Box`, `Stack`, and `Typography` from MUI for layout. Use the defined theme in `utils/themes`.

## Related Files
*   `CLAUDE.md`: Contains specific instructions for AI coding assistants.
*   `package.json`: Dependency versions.

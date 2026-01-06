# Savage Summit Project Context

## Project Overview
"Savage Summit" is a blockchain-based "King of the Hill" style game on Starknet. It involves collectible NFT beasts from [Loot Survivor](https://lootsurvivor.io) battling to hold the summit and earn `$SURVIVOR` tokens.

The project consists of three main components:
1.  **Client (`client/`)**: A React-based web frontend for the game.
2.  **Contracts (`contracts/`)**: Cairo smart contracts implementing the core game logic (combat, beast progression, rewards).
3.  **Dojo (`dojo/`)**: Dojo Engine integration for event handling and world state.

## Architecture & Tech Stack

### Frontend (`client/`)
*   **Framework**: React 18 + Vite (TypeScript)
*   **UI Library**: Material UI (MUI) + Framer Motion
*   **State Management**: Zustand (stores), React Context
*   **Blockchain Interaction**: 
    *   `@starknet-react/core` & `starknet.js`
    *   `@cartridge/connector` (Wallet connection)
    *   `@dojoengine/sdk` (Game state sync)
*   **Build Tool**: Vite

### Smart Contracts (`contracts/`)
*   **Language**: Cairo (v2.13.1)
*   **Framework**: Scarb (Build tool), Starknet Foundry (Testing)
*   **Dependencies**: OpenZeppelin (Token, Access, Upgrades)
*   **Key Logic**: Combat system, Beast stats, Token distribution

### Dojo (`dojo/`)
*   **Engine**: Dojo Engine (v1.8.0)
*   **Purpose**: Manages world state and event emission for the game.

## Key Directories & Files

### `/client`
*   `src/components/`: Reusable UI components (Beast display, Leaderboard, etc.).
*   `src/contexts/`: React Context providers (`GameDirector`, `controller`).
*   `src/dojo/`: Dojo-specific logic and system calls.
*   `src/api/`: Wrappers for external APIs (Ekubo, Starknet).
*   `src/stores/`: Zustand stores for global state.
*   `package.json`: Dependencies and scripts.
*   `.env`: Environment variables (Chain ID, Contract Addresses).

### `/contracts`
*   `src/systems/`: Core game logic (Summit, Combat).
*   `src/models/`: Beast and game data structures.
*   `src/constants.cairo`: Game configuration (Revival time, Damage, Costs).
*   `tests/`: Starknet Foundry tests (`test_summit.cairo`).
*   `Scarb.toml`: Contract dependencies and build config.

### `/dojo`
*   `src/systems/`: Event emitters.
*   `src/models/`: Event structures.
*   `Scarb.toml`: Dojo configuration.

## Development Workflow

### Client
1.  **Install Dependencies**:
    ```bash
    cd client
    pnpm install
    ```
2.  **Start Development Server**:
    ```bash
    pnpm dev
    ```
    Runs at `http://localhost:5173`.
3.  **Build**:
    ```bash
    pnpm build
    ```
4.  **Lint**:
    ```bash
    pnpm lint
    ```

### Contracts
1.  **Build**:
    ```bash
    cd contracts
    scarb build
    ```
2.  **Test**:
    ```bash
    scarb test
    ```
    Uses `snforge` for testing.
3.  **Format**:
    ```bash
    scarb fmt --check
    ```

## Configuration

### Client Environment Variables (`client/.env`)
*   `VITE_PUBLIC_CHAIN`: Chain ID (e.g., `SN_MAIN`).
*   `VITE_PUBLIC_SUMMIT_ADDRESS`: Address of the main Summit contract.

### Contract Constants (`contracts/src/constants.cairo`)
*   `BASE_REVIVAL_TIME_SECONDS`: 86400 (24h)
*   `BEAST_MAX_EXTRA_LIVES`: 4000
*   `MINIMUM_DAMAGE`: 4

## Conventions
*   **Frontend**: Use `useGameStore` for beast/player data. Use `useSystemCalls` for blockchain writes. Follow MUI styling patterns.
*   **Contracts**: Modularize logic into systems and models. Use `snforge` for comprehensive testing.
*   **State Updates**: Optimistic updates are encouraged where possible, confirmed by event subscriptions.

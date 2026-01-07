# Savage Summit - Developer Context

## Project Overview

**Savage Summit** is a king-of-the-hill style strategy game built on **Starknet**. Players use NFT beasts from [Loot Survivor](https://lootsurvivor.io) to battle for control of the "Summit". The reigning beast earns **$SURVIVOR** tokens per block until defeated.

*   **Core Mechanics:** Turn-based combat, beast progression (stats/leveling), consumable potions, and a diplomacy system for beasts with matching names.
*   **Blockchain:** Starknet Mainnet.
*   **Engine:** Custom Cairo contracts with Dojo used for event indexing/relay.

## Architecture

The project is a monorepo structured into three main components:

| Directory | Component | Tech Stack | Purpose |
| :--- | :--- | :--- | :--- |
| **`client/`** | Frontend | React 18, TypeScript, Vite, Material UI, Zustand | The web interface for players to connect wallets, view the leaderboard, and interact with the game. |
| **`contracts/`** | Smart Contracts | Cairo, Scarb, Starknet Foundry | The core game logic (combat, rewards, state management) running on Starknet. |
| **`dojo/`** | Indexing Layer | Dojo Engine (Cairo) | Acts as an event emitter/relay to facilitate efficient indexing by Torii for the frontend. |

## Development Environment

### Prerequisites
*   **Node.js:** v20+
*   **Package Manager:** pnpm
*   **Cairo Toolchain:**
    *   `scarb` (v2.13.1)
    *   `snforge` (Starknet Foundry v0.54.0)
    *   `sozo` (Dojo v1.8.3)

*Note: Check `.tool-versions` for exact version pinning.*

### Key Commands

#### Client (`/client`)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `pnpm install` | Install dependencies. |
| **Run Dev** | `pnpm dev` | Start the local dev server (default port 5173). |
| **Build** | `pnpm build` | Type-check and build for production. |
| **Lint** | `pnpm lint` | Run ESLint. |

*   **Environment:** Requires `.env` with `VITE_PUBLIC_CHAIN` and `VITE_PUBLIC_SUMMIT_ADDRESS`.
*   **State Management:** Uses Zustand (`stores/`) and React Context (`contexts/`).
*   **Wallet:** Integrated via Cartridge Controller.

#### Contracts (`/contracts`)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Test** | `scarb test` | Run Cairo unit and integration tests via `snforge`. |
| **Build** | `scarb build` | Compile contracts. |
| **Format** | `scarb fmt` | Format Cairo code. |

*   **Testing:** Uses `snforge` with mainnet forking capabilities configured in `Scarb.toml`.
*   **Key Files:**
    *   `src/systems/summit.cairo`: Main game loop and entry points.
    *   `src/models/beast.cairo`: Beast data structures.
    *   `src/constants.cairo`: Game balancing constants (damage, health caps, etc.).

#### Dojo (`/dojo`)

This directory is primarily for event definitions to support client-side indexing.
*   **Build:** `sozo build`
*   **Test:** `sozo test`

## Game Mechanics Reference

Understanding these terms helps when reading the code:

*   **Summit:** The central position to hold. Only one beast can be here.
*   **King:** The current holder of the Summit.
*   **Kill Tokens:** Currency earned from Loot Survivor kills, used to upgrade stats (Luck, Spirit, etc.).
*   **Corpse Tokens:** Currency from dead adventurers, used to buy Bonus Health.
*   **Potions:** Consumables like Poison (DOT), Revival (cooldown reduction), and Extra Lives.

## Conventions

*   **Cairo:** Follow strict formatting. Use `scarb fmt` before committing.
*   **React:** Functional components with hooks. Styling primarily via Material UI (`@mui/material`) and Emotion.
*   **Git:** Monorepo structure. Ensure changes are atomic to their respective directories where possible.

# Repository Guidelines

## Project Structure & Module Organization
This repository is a React 18 + Vite frontend. Source lives in `src/`, static assets in `public/` and `src/assets/`. Key folders:
- `src/components/` UI (for example `Summit.tsx`, dialogs in `src/components/dialogs/`).
- `src/contexts/` providers and side effects (`starknet.tsx`, `controller.tsx`, `GameDirector.tsx`, `sound.tsx`).
- `src/stores/` Zustand stores (`gameStore.ts`, `autopilotStore.ts`).
- `src/dojo/` Dojo SDK hooks (`useSystemCalls.ts`, `useGameTokens.ts`).
- `src/api/` direct RPC helpers and `src/utils/` shared helpers and config (`networkConfig.ts`).

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run the dev server at `http://localhost:5173`.
- `pnpm build`: TypeScript check plus production build.
- `pnpm lint`: ESLint checks.

## Coding Style & Naming Conventions
Use 2-space indentation, double quotes, and semicolons. Components are `PascalCase.tsx`, hooks are `useXxx`, and stores are named `*Store.ts`. Follow existing patterns in `src/contexts` and `src/stores` before introducing new abstractions.

## Testing Guidelines
There is no formal test suite in this client. Validate changes with `pnpm build` and `pnpm lint`, and do a quick UI smoke test in the browser for affected flows.

## Commit & Pull Request Guidelines
Commit messages are mixed, but prefer `type(scope): short summary` (example: `feat(client): add leaderboard filter`). PRs should include a concise summary, tests run (for example `pnpm lint`), and screenshots or short clips for UI changes. Call out any changes to network config or environment variables.

## Configuration & Architecture Notes
Environment variables live in `.env` and use the `VITE_PUBLIC_*` prefix; do not commit secrets. The provider hierarchy in `src/main.tsx` matters (wallet and Dojo providers before game orchestration), and `GameDirector` is the central coordinator for game state updates.

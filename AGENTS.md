# Repository Guidelines

## Role & Context

You are a senior fullstack developer specializing in complete feature development with expertise across backend and frontend technologies. Your primary focus is delivering cohesive, end-to-end solutions that work seamlessly from database to user interface. On the frontend, you specialize in modern web applications with deep expertise in React 18+, Vite 5+, and TypeScript 5+. On the backend, you specialize in Cairo and Starknet smart contract development.

## Project Structure & Module Organization

- `client/`: React 18 + Vite frontend. Source in `client/src`, static assets in `client/public`.
- `contracts/`: Cairo smart contracts. Sources in `contracts/src`, tests in `contracts/tests`, assets in `contracts/assets`.
- `dojo/`: Dojo world/event contracts for Torii indexing. Sources in `dojo/src`.
- Shared docs: `README.md` for overview, `CLAUDE.md` plus per-folder `CLAUDE.md` files for deeper module notes.

## Build, Test, and Development Commands

From repo root:

- `cd client && pnpm install` installs frontend dependencies.
- `cd client && pnpm dev` starts the dev server at `http://localhost:5173`.
- `cd client && pnpm build` runs TypeScript checks and a production build.
- `cd client && pnpm lint` runs ESLint.

Contracts:

- `cd contracts && scarb build` compiles Cairo.
- `cd contracts && scarb test` runs snforge tests.
- `cd contracts && scarb fmt --check` checks formatting (`scarb fmt -w` to fix).

Dojo:

- `cd dojo && sozo build` compiles the world.
- `cd dojo && sozo test` runs Dojo tests.
- `cd dojo && scarb fmt -w` formats Cairo.

## Coding Style & Naming Conventions

- TypeScript/React: 2-space indent, double quotes, semicolons; components are `PascalCase.tsx`, hooks are `useXxx`, stores are `*Store.ts`.
- Cairo: snake_case modules/files, format with `scarb fmt` (120-char max line length, sorted module items); keep pure logic under `contracts/src/logic/`.
- Follow existing patterns in each subproject before introducing new abstractions.

## Testing Guidelines

- Frontend has no formal test suite; validate with `pnpm build` and `pnpm lint`, plus a quick UI smoke test.
- Contract tests live in `contracts/tests/test_*.cairo` and run via `scarb test` (snforge).
- Dojo tests (if added) should be runnable via `sozo test`.

## Commit & Pull Request Guidelines

- Git history mixes short messages and Conventional Commit style (e.g., `fix: ...`, `perf(contracts): ...`, `refactor(contracts): ...`), sometimes with PR numbers like `(#55)`.
- Prefer `type(scope): short summary` with scopes like `client`, `contracts`, or `dojo`; add issue/PR references when relevant.
- PRs should include a concise summary, tests run (e.g., `pnpm lint`, `scarb test`), and screenshots or clips for UI changes; call out any contract storage/event changes.

## Configuration & Tooling

- Tool versions are pinned in `.tool-versions` (scarb, snforge, sozo).
- Frontend environment variables live in `client/.env` (e.g., `VITE_PUBLIC_*`); keep secrets out of git.

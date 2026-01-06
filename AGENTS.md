# Repository Guidelines

## Project Structure & Module Organization
- `client/`: React 18 + Vite frontend. Key folders: `client/src/components`, `client/src/contexts`, `client/src/api`, `client/src/stores`, `client/src/utils`, and static assets in `client/public` and `client/src/assets`.
- `contracts/`: Cairo smart contracts. Source lives in `contracts/src` (systems, models, logic), tests in `contracts/tests`, and config in `contracts/Scarb.toml`.
- `dojo/`: Dojo world and event models/systems in `dojo/src`.
- `controller-upstream/`: Upstream Cartridge Controller workspace used for wallet integration reference.
- Root docs: `README.md` for setup, `test_plan.md` for contract test scope.

## Build, Test, and Development Commands
- Frontend: `cd client`, then `pnpm install`, `pnpm dev` (local server), `pnpm build` (typecheck + prod build), `pnpm lint` (ESLint), `pnpm preview` (serve build).
- Contracts: `cd contracts`, then `scarb build`, `scarb test` (runs `snforge test`), `scarb fmt --check` or `scarb fmt -w`.
- Tooling versions are pinned in `.tool-versions` (Scarb, Starknet Foundry, sozo).

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indentation as used in `client/src`; keep component files in `PascalCase` (e.g., `BeastBoard.tsx`) and hooks prefixed with `use`.
- Cairo: 4-space indentation; format with `scarb fmt` (line length 120 per `contracts/Scarb.toml`).
- Tests: `contracts/tests/test_*.cairo` is the prevailing naming pattern.

## Testing Guidelines
- Contract tests run via `scarb test` and use Starknet Foundry; the fork RPC is configured in `contracts/Scarb.toml`, so ensure network access when running fork tests.
- The frontend has no dedicated test suite yet; validate UI changes with `pnpm dev` and `pnpm build`.
- Use `test_plan.md` to align on coverage goals and edge cases for contract changes.

## Commit & Pull Request Guidelines
- Commit messages are short and often use conventional prefixes like `fix:` or `refactor(contracts):`; include a scope when it clarifies the area.
- PRs should summarize impact and list tests run (at minimum `scarb test` and/or `pnpm lint` depending on the area touched), and note any new env vars or on-chain addresses.

## Agent-Specific Instructions
- For contract work, follow the Cairo guidance in `CLAUDE.md` (testing, coverage, formatting expectations).

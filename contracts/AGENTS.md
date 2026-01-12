# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains Cairo sources. `src/lib.cairo` registers modules, `src/systems/summit.cairo` is the main contract, and `src/logic/` holds pure game logic. Data lives in `src/models/`, interfaces in `src/interfaces.cairo`, and token interfaces in `src/erc20/`.
- `tests/` contains snforge tests (for example, `tests/test_summit.cairo`).
- `assets/` stores images. `coverage/`, `snfoundry_trace/`, and `target/` are generated outputs.

## Build, Test, and Development Commands
- `scarb build` compiles the contracts.
- `scarb test` runs the snforge test suite.
- `scarb test test_attack_basic` runs a single test by name.
- `scarb fmt --check` verifies formatting (`scarb fmt -w` to fix).

## Coding Style & Naming Conventions
- Use snake_case for files, modules, and functions; keep pure logic under `src/logic/`.
- Keep modules small and focused; interfaces belong in `src/interfaces.cairo`.
- Format code with `scarb fmt` and follow existing patterns in this repo.

## Testing Guidelines
- Tests live in `tests/*.cairo` and use snforge; some rely on forked mainnet state via `#[fork("mainnet")]`.
- Make callers explicit and validate failure cases with `#[should_panic]`.
- Prefer unit tests against `src/logic/` to keep business rules testable in isolation.

## Commit & Pull Request Guidelines
- History mixes short messages and Conventional Commits; prefer `type(scope): summary` (e.g., `perf(contracts): pack poison state`).
- PRs should include a concise summary, tests run (for example, `scarb test`), and note any storage or event changes.

## Configuration & References
- `Scarb.toml` defines package metadata and dependencies; `snfoundry.toml` configures snforge/sncast and fork RPCs.
- Keep API keys and secrets out of git; use local config or environment variables.
- Read `CLAUDE.md` for architecture notes and deeper contract guidance.

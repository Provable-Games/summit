# ESLint Rollout Guide

This project uses flat config (`eslint.config.js`) and supports ESLint suppressions for staged rule adoption.

## Fast and diagnostic runs

- `pnpm lint:fast`
  - Cached, content-based, multithreaded lint for local development.
- `pnpm lint:stats`
  - Shows ESLint timing stats to identify slow rules/files.

## First suppression rollout target: `@typescript-eslint/no-explicit-any`

The rollout scripts enable this rule at CLI level (`--rule`) so you can stage enforcement without changing default project lint behavior yet.

Phase 1: Create a baseline suppression file from current code.

```bash
pnpm lint:suppress:any:init
```

This writes `.eslint-suppressions.json` with current baseline violations for `@typescript-eslint/no-explicit-any`.

Phase 2: Check only new violations in CI or pre-merge checks.

```bash
pnpm lint:suppress:any:check
```

Phase 3: Prune stale suppressions as code is cleaned up.

```bash
pnpm lint:suppress:prune
```

## Recommended policy

- Keep default `pnpm lint` and `pnpm lint:ci` green.
- Use suppression check scripts to block regressions for a selected strict rule.
- Periodically prune suppressions to reduce technical debt.

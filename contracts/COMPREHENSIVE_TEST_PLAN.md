# Comprehensive Test Plan

## Goal
Improve test fidelity to maximize bug discovery before production, with minimal complexity overhead.

This plan prioritizes:
1. Fuzzing for pure/library logic.
2. Fork-based integration tests for real-world behavior.
3. Targeted mocking and direct storage access for hard-to-reach branches.

## Baseline (Requested Command)
Command run:

```bash
snforge test --coverage && lcov --list coverage/coverage.lcov
```

Observed baseline:
1. `87` tests passed, `0` failed (all from `src/` inline unit tests).
2. Reported total line coverage: `43.3%`.
3. Important anomaly: coverage report includes stale/nonexistent paths like `tests/test_summit.cairo` and `src/logic/rewards.cairo`, so coverage percentages are not currently trustworthy for trend tracking.

Additional confirmation:
1. `snforge test test_attack_basic` collected `0` tests (the large integration suite is currently not active).

## Current Testing Framework Review
### What is working
1. Pure logic modules (`beast_utils`, `combat`, `poison`, `quest`, `revival`) have deterministic unit tests.
2. Core pack/unpack tests exist for `LiveBeastStats`.

### Main gaps
1. No active fork tests.
2. No active fuzz tests.
3. No active direct storage (`store`/`load`) tests.
4. No active mocking (`mock_call`, `start_mock_call`, `stop_mock_call`) in current test run.
5. No active `#[should_panic]` assertions in the running suite.
6. Integration suite exists in `tests_backup/test_summit.cairo` but is not part of execution.

## Starknet Foundry Features To Use (Context7)
Source references:
1. Test attributes (`#[fork]`, `#[fuzzer]`, `#[should_panic]`, `#[available_gas]`): https://github.com/foundry-rs/starknet-foundry/blob/master/docs/src/testing/test-attributes.md
2. Fuzz testing config (`fuzzer_runs`, `fuzzer_seed`): https://github.com/foundry-rs/starknet-foundry/blob/master/docs/src/snforge-advanced-features/fuzz-testing.md
3. Fork testing config (named forks in `Scarb.toml`): https://github.com/foundry-rs/starknet-foundry/blob/master/docs/src/snforge-advanced-features/fork-testing.md
4. Mocking cheatcodes (`mock_call`, `start_mock_call`, `stop_mock_call`): https://github.com/foundry-rs/starknet-foundry/blob/master/docs/src/appendix/cheatcodes/mock_call.md
5. Direct storage access (`store`, `load`): https://github.com/foundry-rs/starknet-foundry/blob/master/design_documents/store_load_cheatcodes.md
6. Event spy and block cheatcodes: https://github.com/foundry-rs/starknet-foundry/blob/master/docs/src/appendix/cheatcodes.md

## Target Test Architecture (Minimal Complexity)
Create and use active `tests/` modules:
1. `tests/unit/`: fuzz + boundary tests for pure logic.
2. `tests/integration/`: local deployment contract flow tests with mocks.
3. `tests/fork/`: mainnet fork flow tests (pinned block).
4. `tests/helpers/`: deployment, actors, assertions, storage helpers.
5. `tests/fixtures/`: stable constants (token IDs, addresses, block numbers).

Keep source files focused by moving new tests out of inline `#[cfg(test)]` blocks over time.

## Execution Plan (Prioritized)
## Phase 0: Harness Rehab
1. Re-activate integration tests by moving valid cases from `tests_backup/test_summit.cairo` into `tests/` and fixing API drift.
2. Configure two forks in `Scarb.toml`:
1. `MAINNET_PINNED` for deterministic CI.
2. `MAINNET_LATEST` for scheduled drift detection.
3. Add a small coverage hygiene script to clean old artifacts before baseline generation.

Definition of done:
1. `snforge test` runs unit + integration + fork tests.
2. Coverage report no longer references removed files.

## Phase 1: Library Logic (Fuzz First, Then Extreme Cases)
### `src/logic/beast_utils.cairo`
1. Fuzz `get_level_from_xp` monotonicity and square-boundary properties.
2. Fuzz `can_gain_xp` around max bonus limits and overflow-adjacent values.
3. Boundary tests for `level_up` with `xp_gained` near/above total XP.
4. Fuzz `calculate_upgrade_cost` for additive correctness.

### `src/logic/combat.cairo`
1. Fuzz `apply_damage` invariants: result in `[0, current_health]`.
2. Fuzz `use_extra_life` invariant parity with `extra_lives`.
3. Fuzz `get_battle_randomness` determinism and collision sanity across counters.
4. Boundary tests for max `base_level`, `bonus_xp`, and `u32` cap behavior.

### `src/logic/poison.cairo`
1. Fuzz `calculate_poison_damage` for no-panics across randomized state.
2. Property tests for life/health conservation expectations (define exact intended model first).
3. Extreme tests for large `poison_count`, large elapsed time, and `full_health == 0`.
4. Add missing assertions for `test_large_poison_stacks`.

### `src/logic/quest.cairo`
1. Fuzz monotonicity: once quest flags increase, rewards should not decrease.
2. Boundary tests at thresholds: bonus levels `{0,1,3,5,10}` and summit hold `{9,10}`.
3. Pack/unpack fuzz roundtrip with max token IDs and amounts.

### `src/logic/revival.cairo`
1. Fuzz `calculate_revival_potions` under timestamp/stats ranges.
2. Boundary tests for exact cooldown edges and spirit saturation.
3. Align tests with actual max revival count in production constants.

## Phase 2: Contract Integration Tests (Local + Mocking + Direct Storage)
Use `declare/deploy` and `mock_call` for external token behavior to isolate branch logic.

High-priority functions:
1. `attack`.
2. `claim_rewards`.
3. `claim_quest_rewards`.
4. `apply_poison`.
5. `add_extra_life`.
6. `apply_stat_points`.

### Direct Storage Access Strategy
Use `store`/`load` to force hard-to-reach states:
1. `live_beast_stats` packed values.
2. `poison_state`.
3. `quest_rewards_total_amount` and `quest_rewards_total_claimed`.
4. `diplomacy_count` and `diplomacy_beast`.
5. `summit_history`.

This avoids long setup chains and keeps tests fast.

### Event Validation
Use `spy_events` to assert:
1. Battle event correctness (`revive_potions`, damage/count semantics).
2. Rewards and quest-claim events vs actual transferred amount.
3. Poison and live stats emission behavior on zero/nonzero damage paths.

## Phase 3: Fork Tests (Real Systems)
Use pinned mainnet state for deterministic behavior and confidence in predeployed integrations.

Focus flows:
1. Full summit lifecycle (`start_summit` -> multiple attacks -> claims).
2. Real ownership checks via NFT contract.
3. Real external token interactions with selective mocks only for failure injection.
4. Race-safe attack behavior with `safe_attack`.

Use cheatcodes:
1. `start_cheat_caller_address`.
2. `start_cheat_block_timestamp_global`.
3. `start_cheat_block_number_global`.

## Phase 4: Bug-Hunting Regression Suite
Create targeted tests for each item in `POSSIBLE_BUGS.md`, then keep as permanent regressions.

## Concrete Test Cases To Add First (Top 15)
1. Quest pool truncation does not over-mark beast claims.
2. Quest claim event reflects actual claimed delta, not full lifetime reward.
3. Diplomacy reward calculation cannot underflow with many diplomacy participants.
4. Diplomacy per-beast reward accumulation handles overflow safely.
5. `claim_rewards` aggregate claim total cannot overflow.
6. `apply_poison` count addition overflow behavior explicitly tested.
7. Poison extra-life semantics match intended combat semantics.
8. Revival max count behavior consistent between docs/tests/constants.
9. `get_last_killed_timestamp` with zero collectables cannot underflow index.
10. `_get_diplomacy_bonus` cannot panic on `u8` conversion.
11. `set_start_timestamp` behavior when start time is in past but summit not started.
12. `attack` with asymmetric specials (attacker unlocked, defender locked, and inverse).
13. Battle event damage fields represent intended aggregate or per-hit semantics (define and test).
14. `get_summit_data` behavior before `start_summit`.
15. Coverage command outputs only existing source/test files after cleanup.

## CI/Automation Plan
1. PR job:
1. `snforge test` on local deterministic tests.
2. `snforge test --coverage && lcov --list coverage/coverage.lcov`.
3. Fail on missing/removed expected test modules.
2. Scheduled nightly:
1. Run `MAINNET_LATEST` fork tests.
2. Report drift/failures without blocking PR flow.

## Success Criteria
1. Active test suite uses fuzzing, forking, mocking, and direct storage access.
2. Deterministic CI and reproducible failures.
3. Regression tests exist for all high-risk potential bugs.
4. Coverage report is clean and comparable run-to-run.
5. Meaningful confidence increase, not just synthetic coverage growth.

# Summit Security Audit

Date: 2026-02-13  
Scope: `src/systems/summit.cairo`, `src/logic/*.cairo`, `src/models/*.cairo`, `tests/test_summit.cairo`

## Executive Summary

I identified 5 material findings:

1. High: combat specials are applied using the wrong unlock flag source, creating a repeatable combat advantage exploit.
2. High: reward finalization contains multiple unchecked arithmetic/conversion paths that can revert summit captures (gameplay DoS).
3. Medium: `claim_quest_rewards` can permanently underpay users when the global quest pool is nearly exhausted.
4. Medium: diplomacy bonus math can overflow and revert attacks at higher participation levels.
5. Low: death-history lookup can underflow when external data returns zero records.

I also found major testing blind spots around reward claiming and reward-finalization math, despite broad happy-path attack coverage.

---

## Findings

### 1) High - Specials Logic Uses Attacker Flag for Both Sides

Location:
- `src/systems/summit.cairo:816`
- `src/systems/summit.cairo:818`
- `src/systems/summit.cairo:823`
- `src/systems/summit.cairo:824`

Issue:
- Combat specs are built with `attacker_has_specials` for both attacker and defender during attacker damage calculation.
- Combat specs are built with `defender_has_specials` for both defender and attacker during counter-attack calculation.
- This means specials are not enabled per beast; they are toggled per combat side.

Impact:
- A beast without unlocked specials can still benefit from specials in one half of combat depending on opponent state.
- A beast with unlocked specials can incorrectly disable opponent specials in certain phases.
- This is a direct game-balance exploit surface and can be strategically abused.

Recommendation:
- Build both specs once using each beast's own unlock state:
  - `attacker_spec = attacking_beast.get_combat_spec(attacker_has_specials)`
  - `defender_spec = defending_beast.get_combat_spec(defender_has_specials)`
- Reuse these two specs consistently in both attacker and defender outcome calculations.

---

### 2) High - Reward Finalization Can Revert Summit Capture (DoS)

Location:
- `src/systems/summit.cairo:701`
- `src/systems/summit.cairo:712`
- `src/systems/summit.cairo:726`
- `src/systems/summit.cairo:729`

Issue:
- `diplomacy_reward_amount_u32` and `reward_amount_u32` use `try_into().unwrap()` on `u128` values.
- Diplomacy reward accumulation uses unchecked `u32` addition (`rewards_earned += ...`).
- Subtraction `total_reward_amount - (diplomacy_reward_amount * diplomacy_count)` can underflow if config is inconsistent.
- Any of these failures occur inside summit-finalization on dethrone.

Impact:
- Dethroning transactions can revert repeatedly, effectively freezing summit progress for affected states/configurations.
- This is a gameplay availability risk and can lock core game progression.

Recommendation:
- Keep intermediate reward math in wider types (`u128`/`u256`), then clamp at boundaries before storage writes.
- Replace unwrap conversions with explicit safe bounds and deterministic clamping behavior.
- Use saturating logic for diplomacy `rewards_earned` updates (same style intended for summit holder rewards).
- Enforce owner-set configuration invariant: diplomacy payout cannot exceed total payout envelope.

---

### 3) Medium - Quest Reward Claiming Can Permanently Underpay Users

Location:
- `src/systems/summit.cairo:294`
- `src/systems/summit.cairo:296`
- `src/systems/summit.cairo:305`
- `src/systems/summit.cairo:311`

Issue:
- Per-beast quest claim state is advanced to full (`quest_rewards_claimed = quest_rewards`) before applying global pool cap.
- Later, `claimable_amount` is capped to remaining pool.
- If pool is insufficient, user receives only partial payout while beasts are already marked as fully claimed.

Impact:
- Users can lose claimable quest rewards irreversibly when claiming near pool exhaustion.
- This is a value-accounting bug and a poor-fairness failure mode.

Recommendation:
- Apply pool cap before mutating per-beast claim state.
- Track and credit each beast incrementally against remaining pool.
- Only increase each beast's claimed amount by what was actually paid.

---

### 4) Medium - Diplomacy Bonus Arithmetic Can Overflow and Revert Attacks

Location:
- `src/systems/summit.cairo:404`
- `src/systems/summit.cairo:1178`
- `src/systems/summit.cairo:1191`
- `src/systems/summit.cairo:1197`

Issue:
- `diplomacy_count` is `u8` and increments without explicit overflow handling.
- Bonus accumulation uses `u16`; summing many beasts' attack power can overflow.
- Final cast `(bonus / 250).try_into().unwrap()` to `u8` can overflow.

Impact:
- At larger diplomacy participation levels, attacks can revert in `_get_diplomacy_bonus`.
- This creates a latent DoS vector tied to organic game growth.

Recommendation:
- Use larger accumulator types (`u32`+).
- Clamp final diplomacy bonus to max supported value instead of unwrapping.
- Consider widening `diplomacy_count` storage type and/or hard-capping entries per hash with explicit revert reason.

---

### 5) Low - Death-Mountain Lookup Can Underflow on Zero History

Location:
- `src/systems/summit.cairo:1096`
- `src/systems/summit.cairo:1102`

Issue:
- `_get_last_killed_timestamp` handles `num_deaths == 1` but not `num_deaths == 0`.
- For zero, it executes `num_deaths - 1`, which underflows.

Impact:
- Attacks involving beasts with missing/zero external history can revert unexpectedly.
- Risk depends on guarantees from `beast_data_dispatcher`.

Recommendation:
- Treat `num_deaths <= 1` as no cooldown history and return `0`.
- Add a defensive test with mocked zero-history response.

---

## Testing Coverage Review

### What is well-covered

- Core attack flow and many permission/error paths are exercised (`tests/test_summit.cairo`).
- Pure stat curve logic has both unit tests and fuzz tests (crit/spirit).
- Several boundary checks exist (max extra lives, max attributes, no-op guards).

### High-impact gaps

1. No tests for `claim_rewards` or `claim_quest_rewards`.
   - No coverage for ownership checks, duplicate IDs, partial-claim paths, pool exhaustion, or decimal scaling.
2. No tests for reward finalization with non-zero reward rates.
   - Current deployment helper sets reward rates to `0` in tests (`tests/test_summit.cairo:62`, `tests/test_summit.cairo:63`), so overflow/underflow paths are not exercised.
3. No tests for diplomacy bonus growth behavior.
   - No scenarios with high `diplomacy_count`, accumulation bounds, or overflow-clamp expectations.
4. No test for specials-flag correctness in combat math.
   - The exploit in Finding #1 is currently untested.
5. Main fork profile uses `latest` block (`Scarb.toml:34`-`Scarb.toml:36`), reducing determinism and making regressions harder to reproduce consistently.

### Recommended test additions

1. Add dedicated tests for `claim_rewards` and `claim_quest_rewards`, including pool-insufficient scenarios.
2. Add reward-finalization tests with non-zero summit/diplomacy reward rates and near-boundary values.
3. Add a combat invariant test proving specials are enabled strictly per beast unlock state.
4. Add diplomacy stress tests for high count/bonus accumulation with explicit expected clamping behavior.
5. Add a mocked test where `get_collectable_count` returns `0` to confirm no underflow.

---

## Validation Notes

I ran targeted tests to verify harness behavior and baseline execution:

- `scarb test test_crit_chance_zero_luck` (pass)
- `scarb test test_attack_basic` (pass)

I did not run the full suite in this pass.

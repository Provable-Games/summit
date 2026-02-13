# Possible Bugs And Unusual Findings

This list contains potential defects and notable inconsistencies found during review.  
Items are prioritized by production risk and include evidence pointers.

## High-Risk Logic Issues
1. Quest rewards can be marked as fully claimed even when pool is insufficient.
Evidence:
1. `src/systems/summit.cairo:294` writes per-beast claimed value before pool clamp.
2. `src/systems/summit.cairo:303` clamps only global `claimable_amount`.
3. `src/systems/summit.cairo:309` updates total claimed by clamped amount only.
Risk:
1. Users can permanently lose claimable quest rewards.
Validation test:
1. Force near-empty quest pool, claim with multiple beasts, verify per-beast claim state and paid amount stay consistent.

2. Quest claim event may over-report claimed rewards.
Evidence:
1. `src/systems/summit.cairo:295` emits packed `quest_rewards` (full cumulative), not delta or clamped payout.
Risk:
1. Event stream can diverge from token transfers and accounting.
Validation test:
1. Emit and decode event when pool clamps payout; assert event equals actual claimed delta.

3. Diplomacy reward math can underflow when diplomacy count is high.
Evidence:
1. `src/systems/summit.cairo:697` defines `diplomacy_reward_amount = total / 100` (1% base slice).
2. `src/systems/summit.cairo:727` computes `total - (diplomacy_reward_amount * diplomacy_count)`.
Risk:
1. For `diplomacy_count > 100`, subtraction can underflow/panic.
Validation test:
1. Use direct storage to set high diplomacy count and run finalization path.

4. Diplomacy reward accumulation lacks overflow guard.
Evidence:
1. `src/systems/summit.cairo:713` does `rewards_earned += diplomacy_reward_amount_u32` without cap check.
2. Summit owner path has explicit cap guard at `src/systems/summit.cairo:732`.
Risk:
1. Overflow panic in long-running/high-reward scenarios.
Validation test:
1. Seed `rewards_earned` near `u32::MAX` and trigger diplomacy reward mint.

5. `claim_rewards` aggregate total can overflow `u32`.
Evidence:
1. `src/systems/summit.cairo:223` uses `total_claimable: u32`.
2. `src/systems/summit.cairo:243` repeatedly accumulates claimable values.
Risk:
1. Panic if claiming many high-balance beasts in one call.
Validation test:
1. Direct-storage setup of many beasts near `MAX_U32`, then batch claim.

6. Poison stack count update can overflow `u16`.
Evidence:
1. `src/systems/summit.cairo:443` writes `current_count + count` with no bound check.
Risk:
1. Overflow panic at high stack counts.
Validation test:
1. Initialize poison count near `65535`, apply additional poison.

## Medium-Risk Behavioral Ambiguities
1. Extra-life semantics differ between combat and poison paths.
Evidence:
1. Combat consumes one life immediately on death: `src/logic/combat.cairo:64`.
2. Poison computes consumed lives by full-health chunks only: `src/logic/poison.cairo:81`, `src/logic/poison.cairo:96`.
Risk:
1. Inconsistent game behavior and economic edge cases.
Validation test:
1. Same input state under combat death and poison death-crossing should match intended design.

2. Specials inclusion flag appears asymmetrical across attacker/defender calculations.
Evidence:
1. Attacker outcome uses attacker flag for both specs: `src/systems/summit.cairo:818`, `src/systems/summit.cairo:819`.
2. Defender outcome uses defender flag for both specs: `src/systems/summit.cairo:824`, `src/systems/summit.cairo:825`.
Risk:
1. One side’s unlocked specials may be ignored depending on attack direction.
Validation test:
1. Matrix tests for `{attacker specials on/off} x {defender specials on/off}` and compare expected damage profiles.

3. Battle event damage fields look like “last hit” values, not totals.
Evidence:
1. `src/systems/summit.cairo:919`, `src/systems/summit.cairo:916`, `src/systems/summit.cairo:943`, `src/systems/summit.cairo:940` overwrite damage variables each round.
2. Event includes both counts and damage fields at `src/systems/summit.cairo:976`.
Risk:
1. Off-chain analytics may misinterpret combat outcomes.
Validation test:
1. Multi-round deterministic battle with known sequence; verify event semantics.

4. `set_start_timestamp` guard is tied to wall-clock relative start timestamp, not actual summit-started state.
Evidence:
1. `src/systems/summit.cairo:474` asserts `start_timestamp > now`.
Risk:
1. Owner may be unable to recover schedule if start time passes before summit starts.
Validation test:
1. Advance block time beyond start without calling `start_summit`, then attempt update.

5. Death-history fetch assumes `num_deaths >= 1`.
Evidence:
1. `src/systems/summit.cairo:1099` handles only `num_deaths == 1`.
2. Else branch uses `num_deaths - 1` index at `src/systems/summit.cairo:1103`.
Risk:
1. Underflow or invalid read when count is `0`.
Validation test:
1. Mock beast data system with zero collectables and run attack path.

6. Diplomacy bonus conversion to `u8` can panic.
Evidence:
1. `src/systems/summit.cairo:1198` does `(bonus / 250).try_into().unwrap()`.
Risk:
1. Panic if computed bonus exceeds `255`.
Validation test:
1. Seed strong diplomacy cluster and run bonus calculation.

## Testing Framework / Process Risks
1. Integration suite is dormant.
Evidence:
1. Active run executes only inline `src/` tests.
2. `snforge test test_attack_basic` collected `0` tests.
3. Large suite exists at `tests_backup/test_summit.cairo`.
Risk:
1. Critical contract paths are not actively protected in CI.

2. Backup tests are heavily API-drifted and likely stale.
Evidence:
1. Outdated constructor/test naming in `tests_backup/test_summit.cairo:37`, `tests_backup/test_summit.cairo:39`, `tests_backup/test_summit.cairo:429`, `tests_backup/test_summit.cairo:1009`, `tests_backup/test_summit.cairo:1449`.
Risk:
1. False confidence from historical tests that no longer map to current contract behavior.

3. Coverage output appears contaminated/stale.
Evidence:
1. Coverage list references missing paths (`tests/test_summit.cairo`, `src/logic/rewards.cairo`) while `tests/` and `src/logic/rewards.cairo` are absent.
2. `src/logic/mod.cairo:6` references `rewards`, but `src/lib.cairo:9` inline module registry bypasses `src/logic/mod.cairo`.
Risk:
1. Coverage trend and thresholds are unreliable.

## Comment / Naming Inconsistencies
1. Quest packed-layout comment says 17-bit beast token id, implementation uses 32-bit mask.
Evidence:
1. `src/logic/quest.cairo:1`
2. `src/logic/quest.cairo:69`

2. Beast packing comments disagree on total bit count.
Evidence:
1. `src/models/beast.cairo:47` says 251 bits.
2. `src/models/beast.cairo:95` says 250 bits with `+3` quest flags, but quest has 4 flags.

3. “Max values” test uses max-minus-one for many fields.
Evidence:
1. `src/models/beast.cairo:363`
2. `src/models/beast.cairo:379`

4. Revival docs/tests reference max 31 while production constant is 63.
Evidence:
1. `src/logic/revival.cairo:12`
2. `src/logic/revival.cairo:58`
3. `src/logic/revival.cairo:110`
4. `src/constants.cairo:16`

5. Poison test comments contradict assertions and leave expected result undefined.
Evidence:
1. “Uses one life” comment with unchanged lives in assertion at `src/logic/poison.cairo:159` and `src/logic/poison.cairo:166`.
2. Non-assertive expected behavior in `src/logic/poison.cairo:217`.

6. Summit history docstring references `(id, lost_at)` keying that no longer matches storage type.
Evidence:
1. Storage shape: `src/systems/summit.cairo:106`
2. Outdated doc: `src/systems/summit.cairo:672`

7. Stated “Mint reward” comment does not mint, it accrues internal reward accounting.
Evidence:
1. `src/systems/summit.cairo:693`

## Notes
1. This document is intentionally conservative: several items are “possible” bugs pending explicit game-rule confirmation.
2. Every item above should become a regression test in the next test-suite upgrade phase.

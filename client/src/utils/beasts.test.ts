import { describe, it, expect, vi, afterEach } from "vitest";
import type { Beast, Summit } from "@/types/game";
import {
  normaliseHealth,
  getBeastDetails,
  getLuckCritChancePercent,
  getSpiritRevivalReductionSeconds,
  getBeastRevivalTime,
  getBeastCurrentLevel,
  getBeastCurrentHealth,
  isBeastLocked,
  getBeastLockedTimeRemaining,
  applyPoisonDamage,
  calculateBattleResult,
  calculateOptimalAttackPotions,
  calculateMaxAttackPotions,
  calculateRevivalRequired,
  BEAST_LOCK_DURATION_MS,
} from "./beasts";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Creates a Beast with sensible defaults. Override any field via `overrides`. */
function makeBeast(overrides: Partial<Beast> = {}): Beast {
  return {
    id: 1,
    name: "Warlock",
    prefix: "Agony",
    suffix: "Bane",
    power: 50,
    tier: 1,
    type: "Magic",
    level: 10,
    health: 100,
    shiny: 0,
    animated: 0,
    token_id: 1001,
    current_health: 100,
    bonus_health: 0,
    current_level: 10,
    bonus_xp: 0,
    attack_streak: 0,
    last_death_timestamp: 0,
    revival_count: 0,
    revival_time: 86400000,
    extra_lives: 0,
    captured_summit: false,
    used_revival_potion: false,
    used_attack_potion: false,
    max_attack_streak: false,
    summit_held_seconds: 0,
    spirit: 0,
    luck: 0,
    specials: false,
    wisdom: false,
    diplomacy: false,
    kills_claimed: 0,
    rewards_earned: 0,
    rewards_claimed: 0,
    ...overrides,
  };
}

/** Creates a Summit object wrapping a beast. */
function makeSummit(
  beastOverrides: Partial<Beast> = {},
  summitOverrides: Partial<Summit> = {},
): Summit {
  return {
    beast: makeBeast(beastOverrides),
    block_timestamp: 0,
    owner: "0x0",
    poison_count: 0,
    poison_timestamp: 0,
    ...summitOverrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// normaliseHealth
// ---------------------------------------------------------------------------
describe("normaliseHealth", () => {
  it("returns 50 for (50, 100)", () => {
    expect(normaliseHealth(50, 100)).toBe(50);
  });

  it("returns 100 for (100, 100)", () => {
    expect(normaliseHealth(100, 100)).toBe(100);
  });

  it("caps at 100 for values exceeding max", () => {
    expect(normaliseHealth(200, 100)).toBe(100);
  });

  it("returns 0 for (0, 100)", () => {
    expect(normaliseHealth(0, 100)).toBe(0);
  });

  it("calculates fractional percentage", () => {
    expect(normaliseHealth(25, 200)).toBe(12.5);
  });
});

// ---------------------------------------------------------------------------
// getBeastDetails
// ---------------------------------------------------------------------------
describe("getBeastDetails", () => {
  it("returns correct details for beast id=1 (Warlock, T1 Magic)", () => {
    const details = getBeastDetails(1, 1, 1, 10);
    expect(details.name).toBe("Warlock");
    expect(details.tier).toBe(1);
    expect(details.type).toBe("Magic");
    expect(details.power).toBe((6 - 1) * 10); // 50
    expect(details.prefix).toBe("Agony");
    expect(details.suffix).toBe("Bane");
  });

  it("returns correct details for beast id=29 (Dragon, T1 Hunter)", () => {
    const details = getBeastDetails(29, 2, 3, 5);
    expect(details.name).toBe("Dragon");
    expect(details.tier).toBe(1);
    expect(details.type).toBe("Hunter");
    expect(details.power).toBe((6 - 1) * 5); // 25
    expect(details.prefix).toBe("Apocalypse");
    expect(details.suffix).toBe("Bite");
  });

  it("returns correct details for a T5 beast (Gnome, id=25)", () => {
    const details = getBeastDetails(25, 10, 5, 3);
    expect(details.name).toBe("Gnome");
    expect(details.tier).toBe(5);
    expect(details.type).toBe("Magic");
    // power = (6 - 5) * 3 = 3
    expect(details.power).toBe(3);
  });

  it("returns correct details for a Brute beast (Kraken, id=51)", () => {
    const details = getBeastDetails(51, 5, 10, 8);
    expect(details.name).toBe("Kraken");
    expect(details.tier).toBe(1);
    expect(details.type).toBe("Brute");
    expect(details.power).toBe((6 - 1) * 8); // 40
  });
});

// ---------------------------------------------------------------------------
// getLuckCritChancePercent
// ---------------------------------------------------------------------------
describe("getLuckCritChancePercent", () => {
  it("returns 0 for 0 points", () => {
    expect(getLuckCritChancePercent(0)).toBe(0);
  });

  it("returns 10 for 1 point", () => {
    expect(getLuckCritChancePercent(1)).toBe(10);
  });

  it("returns 14 for 2 points", () => {
    expect(getLuckCritChancePercent(2)).toBe(14);
  });

  it("returns 17 for 3 points", () => {
    expect(getLuckCritChancePercent(3)).toBe(17);
  });

  it("returns 19 for 4 points", () => {
    expect(getLuckCritChancePercent(4)).toBe(19);
  });

  it("returns 20 for 5 points", () => {
    expect(getLuckCritChancePercent(5)).toBe(20);
  });

  it("returns 21 for 6 points (2000 + 100 = 2100, /100 = 21)", () => {
    expect(getLuckCritChancePercent(6)).toBe(21);
  });

  it("returns 25 for 10 points", () => {
    // 2000 + (10 - 5) * 100 = 2500 => 25
    expect(getLuckCritChancePercent(10)).toBe(25);
  });

  it("returns 85 for 70 points", () => {
    // 2000 + (70 - 5) * 100 = 8500 => 85
    expect(getLuckCritChancePercent(70)).toBe(85);
  });

  it("returns 85 for 71 points (8500 + 50 = 8550, floor(8550/100) = 85)", () => {
    expect(getLuckCritChancePercent(71)).toBe(85);
  });

  it("returns 100 for 100 points", () => {
    // 8500 + (100 - 70) * 50 = 8500 + 1500 = 10000 => 100
    expect(getLuckCritChancePercent(100)).toBe(100);
  });

  it("handles negative input (clamped to 0)", () => {
    expect(getLuckCritChancePercent(-5)).toBe(0);
  });

  it("handles fractional input (floored)", () => {
    // 2.9 floors to 2 => 14
    expect(getLuckCritChancePercent(2.9)).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// getSpiritRevivalReductionSeconds
// ---------------------------------------------------------------------------
describe("getSpiritRevivalReductionSeconds", () => {
  it("returns 0 for 0 points", () => {
    expect(getSpiritRevivalReductionSeconds(0)).toBe(0);
  });

  it("returns 7200 for 1 point", () => {
    expect(getSpiritRevivalReductionSeconds(1)).toBe(7200);
  });

  it("returns 14400 for 5 points", () => {
    expect(getSpiritRevivalReductionSeconds(5)).toBe(14400);
  });

  it("returns 15120 for 6 points (14400 + 720)", () => {
    expect(getSpiritRevivalReductionSeconds(6)).toBe(15120);
  });

  it("returns 61200 for 70 points", () => {
    // 14400 + (70 - 5) * 720 = 14400 + 46800 = 61200
    expect(getSpiritRevivalReductionSeconds(70)).toBe(61200);
  });

  it("returns 61560 for 71 points (61200 + 360)", () => {
    expect(getSpiritRevivalReductionSeconds(71)).toBe(61560);
  });

  it("returns 72000 for 100 points", () => {
    // 61200 + (100 - 70) * 360 = 61200 + 10800 = 72000
    expect(getSpiritRevivalReductionSeconds(100)).toBe(72000);
  });

  it("returns 10080 for 2 points", () => {
    expect(getSpiritRevivalReductionSeconds(2)).toBe(10080);
  });

  it("returns 12240 for 3 points", () => {
    expect(getSpiritRevivalReductionSeconds(3)).toBe(12240);
  });

  it("returns 13680 for 4 points", () => {
    expect(getSpiritRevivalReductionSeconds(4)).toBe(13680);
  });

  it("handles negative input (clamped to 0)", () => {
    expect(getSpiritRevivalReductionSeconds(-10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getBeastRevivalTime
// ---------------------------------------------------------------------------
describe("getBeastRevivalTime", () => {
  it("returns 86400000 (24h ms) for spirit=0", () => {
    const beast = makeBeast({ spirit: 0 });
    expect(getBeastRevivalTime(beast)).toBe(86400000);
  });

  it("reduces revival time based on spirit", () => {
    const beast = makeBeast({ spirit: 50 });
    const reduction = getSpiritRevivalReductionSeconds(50) * 1000;
    expect(getBeastRevivalTime(beast)).toBe(86400000 - reduction);
  });

  it("returns 86400000 - 7200000 for spirit=1", () => {
    const beast = makeBeast({ spirit: 1 });
    expect(getBeastRevivalTime(beast)).toBe(86400000 - 7200 * 1000);
  });

  it("returns 86400000 - 72000000 for spirit=100", () => {
    const beast = makeBeast({ spirit: 100 });
    expect(getBeastRevivalTime(beast)).toBe(86400000 - 72000 * 1000);
  });
});

// ---------------------------------------------------------------------------
// getBeastCurrentLevel
// ---------------------------------------------------------------------------
describe("getBeastCurrentLevel", () => {
  it("returns 10 for level=10, bonusXp=0", () => {
    // sqrt(0 + 100) = 10
    expect(getBeastCurrentLevel(10, 0)).toBe(10);
  });

  it("returns 1 for level=1, bonusXp=0", () => {
    // sqrt(0 + 1) = 1
    expect(getBeastCurrentLevel(1, 0)).toBe(1);
  });

  it("returns 6 for level=5, bonusXp=11", () => {
    // sqrt(11 + 25) = sqrt(36) = 6
    expect(getBeastCurrentLevel(5, 11)).toBe(6);
  });

  it("returns 5 for level=5, bonusXp=0", () => {
    // sqrt(0 + 25) = 5
    expect(getBeastCurrentLevel(5, 0)).toBe(5);
  });

  it("floors non-integer sqrt results", () => {
    // level=3, bonusXp=2 => sqrt(2 + 9) = sqrt(11) ~ 3.316 => 3
    expect(getBeastCurrentLevel(3, 2)).toBe(3);
  });

  it("handles large bonus xp", () => {
    // level=1, bonusXp=99 => sqrt(99 + 1) = sqrt(100) = 10
    expect(getBeastCurrentLevel(1, 99)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getBeastCurrentHealth
// ---------------------------------------------------------------------------
describe("getBeastCurrentHealth", () => {
  it("returns health + bonus_health when current_health is null", () => {
    const beast = makeBeast({ health: 100, bonus_health: 50, current_health: null as unknown as number });
    expect(getBeastCurrentHealth(beast)).toBe(150);
  });

  it("returns health + bonus_health when current_health=0 and last_death_timestamp=0", () => {
    const beast = makeBeast({ health: 100, bonus_health: 20, current_health: 0, last_death_timestamp: 0 });
    expect(getBeastCurrentHealth(beast)).toBe(120);
  });

  it("returns health + bonus_health when death time has expired", () => {
    // Beast died long ago, revival time has passed
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    const deathTimestamp = Math.floor((nowMs - 100000000) / 1000); // died 100000s ago
    const beast = makeBeast({
      health: 80,
      bonus_health: 10,
      current_health: 0,
      last_death_timestamp: deathTimestamp,
      revival_time: 86400000, // 24h in ms
    });
    expect(getBeastCurrentHealth(beast)).toBe(90);
  });

  it("returns 0 when beast is dead and revival time has NOT expired", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Beast just died 1 second ago
    const deathTimestamp = Math.floor((nowMs - 1000) / 1000);
    const beast = makeBeast({
      health: 80,
      bonus_health: 10,
      current_health: 0,
      last_death_timestamp: deathTimestamp,
      revival_time: 86400000,
    });
    expect(getBeastCurrentHealth(beast)).toBe(0);
  });

  it("returns current_health when beast is alive", () => {
    const beast = makeBeast({ current_health: 50 });
    expect(getBeastCurrentHealth(beast)).toBe(50);
  });

  it("returns current_health even if very low", () => {
    const beast = makeBeast({ current_health: 1 });
    expect(getBeastCurrentHealth(beast)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// isBeastLocked & getBeastLockedTimeRemaining
// ---------------------------------------------------------------------------
describe("isBeastLocked", () => {
  it("returns false when no last_dm_death_timestamp", () => {
    const beast = makeBeast({ last_dm_death_timestamp: undefined });
    expect(isBeastLocked(beast)).toBe(false);
  });

  it("returns false when last_dm_death_timestamp is 0", () => {
    const beast = makeBeast({ last_dm_death_timestamp: 0 });
    expect(isBeastLocked(beast)).toBe(false);
  });

  it("returns true when death was recent (within 24h)", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Died 1 hour ago
    const deathTimestampSec = Math.floor((nowMs - 3600 * 1000) / 1000);
    const beast = makeBeast({ last_dm_death_timestamp: deathTimestampSec });
    expect(isBeastLocked(beast)).toBe(true);
  });

  it("returns false when death was more than 24h ago", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Died 25 hours ago
    const deathTimestampSec = Math.floor((nowMs - 25 * 3600 * 1000) / 1000);
    const beast = makeBeast({ last_dm_death_timestamp: deathTimestampSec });
    expect(isBeastLocked(beast)).toBe(false);
  });
});

describe("getBeastLockedTimeRemaining", () => {
  it("returns {hours:0, minutes:0} when no last_dm_death_timestamp", () => {
    const beast = makeBeast({ last_dm_death_timestamp: undefined });
    expect(getBeastLockedTimeRemaining(beast)).toEqual({ hours: 0, minutes: 0 });
  });

  it("returns {hours:0, minutes:0} when last_dm_death_timestamp is 0", () => {
    const beast = makeBeast({ last_dm_death_timestamp: 0 });
    expect(getBeastLockedTimeRemaining(beast)).toEqual({ hours: 0, minutes: 0 });
  });

  it("returns remaining time when locked", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Died 1 hour ago => 23 hours remaining
    const deathTimestampSec = Math.floor((nowMs - 3600 * 1000) / 1000);
    const beast = makeBeast({ last_dm_death_timestamp: deathTimestampSec });
    const remaining = getBeastLockedTimeRemaining(beast);
    expect(remaining.hours).toBe(23);
    expect(remaining.minutes).toBe(0);
  });

  it("returns {hours:0, minutes:0} when lock has expired", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Died 25 hours ago
    const deathTimestampSec = Math.floor((nowMs - 25 * 3600 * 1000) / 1000);
    const beast = makeBeast({ last_dm_death_timestamp: deathTimestampSec });
    expect(getBeastLockedTimeRemaining(beast)).toEqual({ hours: 0, minutes: 0 });
  });

  it("returns correct partial hours and minutes", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    // Died 22 hours and 30 minutes ago => 1h 30min remaining
    const elapsedMs = 22 * 3600 * 1000 + 30 * 60 * 1000;
    const deathTimestampSec = Math.floor((nowMs - elapsedMs) / 1000);
    const beast = makeBeast({ last_dm_death_timestamp: deathTimestampSec });
    const remaining = getBeastLockedTimeRemaining(beast);
    expect(remaining.hours).toBe(1);
    expect(remaining.minutes).toBe(30);
  });

  it("confirms BEAST_LOCK_DURATION_MS is 24 hours", () => {
    expect(BEAST_LOCK_DURATION_MS).toBe(24 * 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// applyPoisonDamage
// ---------------------------------------------------------------------------
describe("applyPoisonDamage", () => {
  it("returns current health unchanged when poison_count is 0", () => {
    const summit = makeSummit(
      { current_health: 80, extra_lives: 2, health: 100, bonus_health: 0 },
      { poison_count: 0, poison_timestamp: 0 },
    );
    const result = applyPoisonDamage(summit);
    expect(result.currentHealth).toBe(80);
    expect(result.extraLives).toBe(2);
  });

  it("returns current health unchanged when poison_timestamp is 0", () => {
    const summit = makeSummit(
      { current_health: 80, extra_lives: 1, health: 100, bonus_health: 0 },
      { poison_count: 3, poison_timestamp: 0 },
    );
    const result = applyPoisonDamage(summit);
    expect(result.currentHealth).toBe(80);
    expect(result.extraLives).toBe(1);
  });

  it("reduces health by elapsed_seconds * poison_count", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    const poisonTimestamp = Math.floor(nowMs / 1000) - 10; // 10 seconds ago
    const summit = makeSummit(
      { current_health: 100, extra_lives: 0, health: 100, bonus_health: 0 },
      { poison_count: 2, poison_timestamp: poisonTimestamp },
    );
    const result = applyPoisonDamage(summit);
    // damage = 2 * 10 = 20; totalPool = 0 * 100 + 100 = 100; after = 100 - 20 = 80
    expect(result.currentHealth).toBe(80);
    expect(result.extraLives).toBe(0);
  });

  it("rolls damage over extra lives", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    const poisonTimestamp = Math.floor(nowMs / 1000) - 60; // 60 seconds ago
    const summit = makeSummit(
      { current_health: 50, extra_lives: 2, health: 100, bonus_health: 0 },
      { poison_count: 2, poison_timestamp: poisonTimestamp },
    );
    const result = applyPoisonDamage(summit);
    // damage = 2 * 60 = 120
    // totalPool = 2 * 100 + 50 = 250; after = 250 - 120 = 130
    // extraLivesAfter = floor((130 - 1) / 100) = floor(129/100) = 1
    // currentHealthAfter = 130 - 1*100 = 30
    expect(result.currentHealth).toBe(30);
    expect(result.extraLives).toBe(1);
  });

  it("floors to 1 HP and 0 extra lives on massive damage", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    const poisonTimestamp = Math.floor(nowMs / 1000) - 10000; // 10000 seconds ago
    const summit = makeSummit(
      { current_health: 50, extra_lives: 1, health: 100, bonus_health: 0 },
      { poison_count: 5, poison_timestamp: poisonTimestamp },
    );
    const result = applyPoisonDamage(summit);
    // damage = 5 * 10000 = 50000
    // totalPool = 1 * 100 + 50 = 150; after = 150 - 50000 < 0
    expect(result.currentHealth).toBe(1);
    expect(result.extraLives).toBe(0);
  });

  it("handles zero current_health with extra lives", () => {
    const nowMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(nowMs);

    const poisonTimestamp = Math.floor(nowMs / 1000) - 5;
    const summit = makeSummit(
      { current_health: 0, extra_lives: 3, health: 100, bonus_health: 0 },
      { poison_count: 1, poison_timestamp: poisonTimestamp },
    );
    const result = applyPoisonDamage(summit);
    // damage = 1 * 5 = 5
    // totalPool = 3 * 100 + 0 = 300; after = 300 - 5 = 295
    // extraLivesAfter = floor((295 - 1) / 100) = floor(294/100) = 2
    // currentHealthAfter = 295 - 2*100 = 95
    expect(result.currentHealth).toBe(95);
    expect(result.extraLives).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// calculateBattleResult
// ---------------------------------------------------------------------------
describe("calculateBattleResult", () => {
  it("same type (no elemental advantage) uses 1x multiplier", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 50 * 1 = 50; beastDamage = max(4, floor(50 - 30)) = 20
    expect(combat.attack).toBe(20);
  });

  it("Hunter vs Magic gives 1.5x attack damage", () => {
    const attacker = makeBeast({ type: "Hunter", power: 40, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 20, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 40 * 1.5 = 60; beastDamage = max(4, floor(60 - 20)) = 40
    expect(combat.attack).toBe(40);
  });

  it("Magic vs Brute gives 1.5x attack damage", () => {
    const attacker = makeBeast({ type: "Magic", power: 40, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Brute", power: 20, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 40 * 1.5 = 60; beastDamage = max(4, floor(60 - 20)) = 40
    expect(combat.attack).toBe(40);
  });

  it("Brute vs Hunter gives 1.5x attack damage", () => {
    const attacker = makeBeast({ type: "Brute", power: 40, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Hunter", power: 20, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    expect(combat.attack).toBe(40);
  });

  it("Hunter vs Brute gives 0.5x (weak) attack damage", () => {
    const attacker = makeBeast({ type: "Hunter", power: 40, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Brute", power: 20, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 40 * 0.5 = 20; beastDamage = max(4, floor(20 - 20)) = max(4, 0) = 4
    expect(combat.attack).toBe(4);
  });

  it("enforces MINIMUM_DAMAGE=4 when calculated damage is lower", () => {
    const attacker = makeBeast({ type: "Magic", power: 10, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 100, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 10 * 1 = 10; beastDamage = max(4, floor(10 - 100)) = max(4, -90) = 4
    expect(combat.attack).toBe(4);
  });

  it("applies attack potions bonus", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 5);
    // elemental = 50; beastDamage = max(4, floor(50 * (1 + 0.5) - 30)) = max(4, floor(75 - 30)) = 45
    expect(combat.attack).toBe(45);
    expect(combat.attackPotions).toBe(5);
  });

  it("returns combat object with expected shape", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    expect(combat).toHaveProperty("attack");
    expect(combat).toHaveProperty("defense");
    expect(combat).toHaveProperty("attackCritDamage");
    expect(combat).toHaveProperty("defenseCritDamage");
    expect(combat).toHaveProperty("score");
    expect(combat).toHaveProperty("estimatedDamage");
    expect(combat.score).toBe(combat.attack - combat.defense);
  });

  it("calculates crit damage when luck > 0", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 5, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // critDamage = max(4, floor((50*2) * 1 - 30)) = max(4, 70) = 70
    expect(combat.attackCritDamage).toBe(70);
  });

  it("returns 0 crit damage when luck is 0", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    expect(combat.attackCritDamage).toBe(0);
  });

  it("applies diplomacy bonus to summit defense", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, health: 100, bonus_health: 0, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
      { diplomacy: { beasts: [], totalPower: 0, bonus: 10 } },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // summitElemental = 30 * 1 = 30; summitDamage = max(4, floor(30 * (1 + 1.0)) - 50) = max(4, floor(60) - 50) = max(4, 10) = 10
    expect(combat.defense).toBe(10);
  });

  it("applies prefix name-match bonus (2x elemental) when specials=true and prefixes match", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, prefix: "Agony", suffix: "Bane", specials: true, luck: 0 });
    const summit = makeSummit(
      { type: "Magic", power: 30, prefix: "Agony", suffix: "Grasp", current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 50; nameMatch = 50*2 = 100 (prefix match)
    // beastDamage = max(4, floor(50 + 100 - 30)) = 120
    expect(combat.attack).toBe(120);
  });

  it("applies suffix name-match bonus (8x elemental) when specials=true and suffixes match", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, prefix: "Agony", suffix: "Bane", specials: true, luck: 0 });
    const summit = makeSummit(
      { type: "Magic", power: 30, prefix: "Death", suffix: "Bane", current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 50; nameMatch = 50*8 = 400 (suffix match)
    // beastDamage = max(4, floor(50 + 400 - 30)) = 420
    expect(combat.attack).toBe(420);
  });

  it("applies both prefix+suffix name-match bonuses when specials=true and both match", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, prefix: "Agony", suffix: "Bane", specials: true, luck: 0 });
    const summit = makeSummit(
      { type: "Magic", power: 30, prefix: "Agony", suffix: "Bane", current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // elemental = 50; nameMatch = 50*2 + 50*8 = 100 + 400 = 500
    // beastDamage = max(4, floor(50 + 500 - 30)) = 520
    expect(combat.attack).toBe(520);
  });

  it("does not apply name-match bonus when specials=false even if names match", () => {
    const attacker = makeBeast({ type: "Magic", power: 50, prefix: "Agony", suffix: "Bane", specials: false, luck: 0 });
    const summit = makeSummit(
      { type: "Magic", power: 30, prefix: "Agony", suffix: "Bane", current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );
    const combat = calculateBattleResult(attacker, summit, 0);
    // specials=false -> nameMatch = 0
    // beastDamage = max(4, floor(50 - 30)) = 20
    expect(combat.attack).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// calculateOptimalAttackPotions / calculateMaxAttackPotions
// ---------------------------------------------------------------------------
describe("calculateAttackPotions", () => {
  it("finds the minimum attack potion count needed for estimated damage threshold", () => {
    const beast = makeBeast({ type: "Magic", power: 95, current_health: 100, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 100, health: 100, bonus_health: 0, current_health: 100, extra_lives: 0, luck: 0, specials: false },
    );

    const selected: [Beast, number, number] = [beast, 1, 0];
    expect(calculateOptimalAttackPotions(selected, summit, 5)).toBe(2);
  });

  it("returns maxAllowed when optimal threshold is unreachable", () => {
    const beast = makeBeast({ type: "Magic", power: 95, current_health: 100, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 100, health: 10000, bonus_health: 0, current_health: 10000, extra_lives: 0, luck: 0, specials: false },
    );

    const selected: [Beast, number, number] = [beast, 1, 0];
    expect(calculateOptimalAttackPotions(selected, summit, 2)).toBe(2);
  });

  it("finds minimum max-potions for multi-attack threshold", () => {
    const beast = makeBeast({ type: "Magic", power: 50, current_health: 100, luck: 0, specials: false });
    const summit = makeSummit(
      { type: "Magic", power: 30, health: 100, bonus_health: 0, current_health: 70, extra_lives: 0, luck: 0, specials: false },
    );

    const selected: [Beast, number, number] = [beast, 2, 0];
    expect(calculateMaxAttackPotions(selected, summit, 5)).toBe(3);
  });

  it("returns maxAllowed when attacker is dead", () => {
    const beast = makeBeast({ current_health: 0 });
    const summit = makeSummit();

    const selected: [Beast, number, number] = [beast, 1, 0];
    expect(calculateMaxAttackPotions(selected, summit, 4)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// calculateRevivalRequired
// ---------------------------------------------------------------------------
describe("calculateRevivalRequired", () => {
  it("returns 0 for single alive beast with 1 attack", () => {
    const beast = makeBeast({ current_health: 100, revival_count: 0 });
    const selection: [Beast, number, number][] = [[beast, 1, 0]];
    expect(calculateRevivalRequired(selection)).toBe(0);
  });

  it("returns revival_count + 1 for single dead beast with 1 attack", () => {
    const beast = makeBeast({ current_health: 0, revival_count: 3 });
    const selection: [Beast, number, number][] = [[beast, 1, 0]];
    // dead: sum + (1 * 3) + (1 * 2 / 2) = 3 + 1 = 4
    expect(calculateRevivalRequired(selection)).toBe(4);
  });

  it("returns 0 for alive beast with revival_count > 0 and 1 attack", () => {
    const beast = makeBeast({ current_health: 50, revival_count: 5 });
    const selection: [Beast, number, number][] = [[beast, 1, 0]];
    // alive: revivals = attacks - 1 = 0; sum + (0 * 5) + (0 * 1 / 2) = 0
    expect(calculateRevivalRequired(selection)).toBe(0);
  });

  it("calculates correctly for alive beast with multiple attacks", () => {
    const beast = makeBeast({ current_health: 50, revival_count: 2 });
    const selection: [Beast, number, number][] = [[beast, 3, 0]];
    // alive: revivals = 3 - 1 = 2; sum + (2 * 2) + (2 * 3 / 2) = 4 + 3 = 7
    expect(calculateRevivalRequired(selection)).toBe(7);
  });

  it("calculates correctly for dead beast with multiple attacks", () => {
    const beast = makeBeast({ current_health: 0, revival_count: 1 });
    const selection: [Beast, number, number][] = [[beast, 3, 0]];
    // dead: sum + (3 * 1) + (3 * 4 / 2) = 3 + 6 = 9
    expect(calculateRevivalRequired(selection)).toBe(9);
  });

  it("sums across multiple beasts", () => {
    const alive = makeBeast({ current_health: 50, revival_count: 0 });
    const dead = makeBeast({ current_health: 0, revival_count: 2 });
    const selection: [Beast, number, number][] = [
      [alive, 1, 0],
      [dead, 1, 0],
    ];
    // alive: revivals = 0; 0
    // dead: (1 * 2) + (1 * 2 / 2) = 2 + 1 = 3
    expect(calculateRevivalRequired(selection)).toBe(3);
  });

  it("returns 0 for empty selection", () => {
    expect(calculateRevivalRequired([])).toBe(0);
  });
});

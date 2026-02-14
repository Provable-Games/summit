import { describe, it, expect } from "vitest";
import {
  BEAST_NAMES,
  BEAST_TIERS,
  BEAST_TYPES,
  ITEM_NAME_PREFIXES,
  ITEM_NAME_SUFFIXES,
} from "./beastData.js";

describe("BEAST_NAMES", () => {
  it("should have all 75 entries (keys 1-75)", () => {
    for (let i = 1; i <= 75; i++) {
      expect(BEAST_NAMES[i]).toBeDefined();
    }
    expect(Object.keys(BEAST_NAMES).length).toBe(75);
  });

  it("should have no undefined values", () => {
    for (const [, name] of Object.entries(BEAST_NAMES)) {
      expect(name).toBeDefined();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("should have correct known beast names", () => {
    expect(BEAST_NAMES[1]).toBe("Warlock");
    expect(BEAST_NAMES[29]).toBe("Dragon");
    expect(BEAST_NAMES[75]).toBe("Skeleton");
    expect(BEAST_NAMES[51]).toBe("Kraken");
    expect(BEAST_NAMES[28]).toBe("Phoenix");
    expect(BEAST_NAMES[50]).toBe("Rat");
  });
});

describe("BEAST_TIERS", () => {
  it("should have all 75 entries (keys 1-75)", () => {
    for (let i = 1; i <= 75; i++) {
      expect(BEAST_TIERS[i]).toBeDefined();
    }
    expect(Object.keys(BEAST_TIERS).length).toBe(75);
  });

  it("should only contain values 1-5", () => {
    for (const [, tier] of Object.entries(BEAST_TIERS)) {
      expect(tier).toBeGreaterThanOrEqual(1);
      expect(tier).toBeLessThanOrEqual(5);
    }
  });

  it("should follow the tier pattern: groups of 5 cycle through T1-T5", () => {
    // Magical beasts: 1-5 are T1, 6-10 are T2, 11-15 are T3, 16-20 are T4, 21-25 are T5
    for (let i = 1; i <= 5; i++) expect(BEAST_TIERS[i]).toBe(1);
    for (let i = 6; i <= 10; i++) expect(BEAST_TIERS[i]).toBe(2);
    for (let i = 11; i <= 15; i++) expect(BEAST_TIERS[i]).toBe(3);
    for (let i = 16; i <= 20; i++) expect(BEAST_TIERS[i]).toBe(4);
    for (let i = 21; i <= 25; i++) expect(BEAST_TIERS[i]).toBe(5);

    // Hunter beasts: 26-30 are T1, 31-35 are T2, etc.
    for (let i = 26; i <= 30; i++) expect(BEAST_TIERS[i]).toBe(1);
    for (let i = 31; i <= 35; i++) expect(BEAST_TIERS[i]).toBe(2);
    for (let i = 36; i <= 40; i++) expect(BEAST_TIERS[i]).toBe(3);
    for (let i = 41; i <= 45; i++) expect(BEAST_TIERS[i]).toBe(4);
    for (let i = 46; i <= 50; i++) expect(BEAST_TIERS[i]).toBe(5);

    // Brute beasts: 51-55 are T1, 56-60 are T2, etc.
    for (let i = 51; i <= 55; i++) expect(BEAST_TIERS[i]).toBe(1);
    for (let i = 56; i <= 60; i++) expect(BEAST_TIERS[i]).toBe(2);
    for (let i = 61; i <= 65; i++) expect(BEAST_TIERS[i]).toBe(3);
    for (let i = 66; i <= 70; i++) expect(BEAST_TIERS[i]).toBe(4);
    for (let i = 71; i <= 75; i++) expect(BEAST_TIERS[i]).toBe(5);
  });
});

describe("BEAST_TYPES", () => {
  it("should have all 75 entries (keys 1-75)", () => {
    for (let i = 1; i <= 75; i++) {
      expect(BEAST_TYPES[i]).toBeDefined();
    }
    expect(Object.keys(BEAST_TYPES).length).toBe(75);
  });

  it("should only contain valid type values", () => {
    const validTypes = ["Magic", "Hunter", "Brute"];
    for (const [, type] of Object.entries(BEAST_TYPES)) {
      expect(validTypes).toContain(type);
    }
  });

  it("should assign types by ID range: 1-25 Magic, 26-50 Hunter, 51-75 Brute", () => {
    for (let i = 1; i <= 25; i++) expect(BEAST_TYPES[i]).toBe("Magic");
    for (let i = 26; i <= 50; i++) expect(BEAST_TYPES[i]).toBe("Hunter");
    for (let i = 51; i <= 75; i++) expect(BEAST_TYPES[i]).toBe("Brute");
  });
});

describe("ITEM_NAME_PREFIXES", () => {
  it("should have all 69 entries (keys 1-69)", () => {
    for (let i = 1; i <= 69; i++) {
      expect(ITEM_NAME_PREFIXES[i]).toBeDefined();
    }
    expect(Object.keys(ITEM_NAME_PREFIXES).length).toBe(69);
  });

  it("should have no undefined or empty values", () => {
    for (const [, prefix] of Object.entries(ITEM_NAME_PREFIXES)) {
      expect(prefix).toBeDefined();
      expect(typeof prefix).toBe("string");
      expect(prefix.length).toBeGreaterThan(0);
    }
  });

  it("should contain known prefix names", () => {
    expect(ITEM_NAME_PREFIXES[1]).toBe("Agony");
    expect(ITEM_NAME_PREFIXES[29]).toBe("Ghoul");
    expect(ITEM_NAME_PREFIXES[69]).toBe("Shimmering");
  });
});

describe("ITEM_NAME_SUFFIXES", () => {
  it("should have all 18 entries (keys 1-18)", () => {
    for (let i = 1; i <= 18; i++) {
      expect(ITEM_NAME_SUFFIXES[i]).toBeDefined();
    }
    expect(Object.keys(ITEM_NAME_SUFFIXES).length).toBe(18);
  });

  it("should have no undefined or empty values", () => {
    for (const [, suffix] of Object.entries(ITEM_NAME_SUFFIXES)) {
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe("string");
      expect(suffix.length).toBeGreaterThan(0);
    }
  });

  it("should contain known suffix names", () => {
    expect(ITEM_NAME_SUFFIXES[1]).toBe("Bane");
    expect(ITEM_NAME_SUFFIXES[5]).toBe("Roar");
    expect(ITEM_NAME_SUFFIXES[18]).toBe("Moon");
  });
});

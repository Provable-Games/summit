import { describe, it, expect } from "vitest";
import {
  getSpiritRevivalReductionSeconds,
  getBeastRevivalTime,
  getBeastCurrentLevel,
  normalizeAddress,
} from "./helpers.js";

describe("getSpiritRevivalReductionSeconds", () => {
  describe("switch-case values (0-5 spirit points)", () => {
    it("should return 0 for 0 points", () => {
      expect(getSpiritRevivalReductionSeconds(0)).toBe(0);
    });

    it("should return 7200 for 1 point", () => {
      expect(getSpiritRevivalReductionSeconds(1)).toBe(7200);
    });

    it("should return 10080 for 2 points", () => {
      expect(getSpiritRevivalReductionSeconds(2)).toBe(10080);
    });

    it("should return 12240 for 3 points", () => {
      expect(getSpiritRevivalReductionSeconds(3)).toBe(12240);
    });

    it("should return 13680 for 4 points", () => {
      expect(getSpiritRevivalReductionSeconds(4)).toBe(13680);
    });

    it("should return 14400 for 5 points", () => {
      expect(getSpiritRevivalReductionSeconds(5)).toBe(14400);
    });
  });

  describe("linear range (6-70 spirit points)", () => {
    it("should return 15120 for 6 points (14400 + 1*720)", () => {
      expect(getSpiritRevivalReductionSeconds(6)).toBe(15120);
    });

    it("should return 18000 for 10 points (14400 + 5*720)", () => {
      expect(getSpiritRevivalReductionSeconds(10)).toBe(18000);
    });

    it("should return 36000 for 35 points (14400 + 30*720)", () => {
      expect(getSpiritRevivalReductionSeconds(35)).toBe(36000);
    });

    it("should return 61200 for 70 points (boundary: 14400 + 65*720)", () => {
      expect(getSpiritRevivalReductionSeconds(70)).toBe(61200);
    });
  });

  describe("high range (71+ spirit points)", () => {
    it("should return 61560 for 71 points (61200 + 1*360)", () => {
      expect(getSpiritRevivalReductionSeconds(71)).toBe(61560);
    });

    it("should return 72000 for 100 points (61200 + 30*360)", () => {
      expect(getSpiritRevivalReductionSeconds(100)).toBe(72000);
    });
  });

  describe("edge cases", () => {
    it("should treat negative values as 0", () => {
      expect(getSpiritRevivalReductionSeconds(-1)).toBe(0);
      expect(getSpiritRevivalReductionSeconds(-100)).toBe(0);
    });

    it("should floor fractional values (3.7 -> 3)", () => {
      expect(getSpiritRevivalReductionSeconds(3.7)).toBe(12240);
    });

    it("should floor fractional values (5.9 -> 5)", () => {
      expect(getSpiritRevivalReductionSeconds(5.9)).toBe(14400);
    });

    it("should floor 0.5 to 0", () => {
      expect(getSpiritRevivalReductionSeconds(0.5)).toBe(0);
    });
  });
});

describe("getBeastRevivalTime", () => {
  const FULL_REVIVAL_TIME = 86400000; // 24 hours in ms

  it("should return full 24h for spirit=0", () => {
    expect(getBeastRevivalTime(0)).toBe(FULL_REVIVAL_TIME);
  });

  it("should reduce revival time for spirit=1", () => {
    // 86400000 - 7200*1000 = 79200000
    expect(getBeastRevivalTime(1)).toBe(79200000);
  });

  it("should reduce revival time for spirit=5", () => {
    // 86400000 - 14400*1000 = 72000000
    expect(getBeastRevivalTime(5)).toBe(72000000);
  });

  it("should reduce revival time for spirit=50", () => {
    // getSpiritRevivalReductionSeconds(50) = 14400 + (50-5)*720 = 14400 + 32400 = 46800
    // 86400000 - 46800*1000 = 39600000
    expect(getBeastRevivalTime(50)).toBe(39600000);
  });

  it("should reduce revival time for spirit=100", () => {
    // getSpiritRevivalReductionSeconds(100) = 72000
    // 86400000 - 72000*1000 = 14400000
    expect(getBeastRevivalTime(100)).toBe(14400000);
  });

  it("should return full 24h for negative spirit (treated as 0 by the guard)", () => {
    // spirit <= 0 means no reduction
    expect(getBeastRevivalTime(-1)).toBe(FULL_REVIVAL_TIME);
  });
});

describe("getBeastCurrentLevel", () => {
  it("should return base level when bonusXp is 0", () => {
    expect(getBeastCurrentLevel(10, 0)).toBe(10);
    expect(getBeastCurrentLevel(1, 0)).toBe(1);
    expect(getBeastCurrentLevel(25, 0)).toBe(25);
  });

  it("should return 0 for level=0 and bonusXp=0", () => {
    expect(getBeastCurrentLevel(0, 0)).toBe(0);
  });

  it("should increase level with bonus XP", () => {
    // level=5, bonusXp=11 -> sqrt(11 + 25) = sqrt(36) = 6
    expect(getBeastCurrentLevel(5, 11)).toBe(6);
  });

  it("should floor non-integer results", () => {
    // level=3, bonusXp=2 -> sqrt(2 + 9) = sqrt(11) ~ 3.31 -> 3
    expect(getBeastCurrentLevel(3, 2)).toBe(3);
  });

  it("should handle large values", () => {
    // level=100, bonusXp=0 -> sqrt(10000) = 100
    expect(getBeastCurrentLevel(100, 0)).toBe(100);
    // level=100, bonusXp=201 -> sqrt(10201) = 101
    expect(getBeastCurrentLevel(100, 201)).toBe(101);
  });

  it("should handle level=0 with bonusXp > 0", () => {
    // level=0, bonusXp=100 -> sqrt(100) = 10
    expect(getBeastCurrentLevel(0, 100)).toBe(10);
    // level=0, bonusXp=1 -> sqrt(1) = 1
    expect(getBeastCurrentLevel(0, 1)).toBe(1);
  });
});

describe("normalizeAddress", () => {
  it("should pad short addresses with leading zeros", () => {
    expect(normalizeAddress("0x1")).toBe("0x" + "0".repeat(63) + "1");
  });

  it("should lowercase uppercase hex characters", () => {
    expect(normalizeAddress("0xABC")).toBe("0x" + "0".repeat(61) + "abc");
  });

  it("should leave already-padded 66-char addresses unchanged", () => {
    const full = "0x" + "a".repeat(64);
    expect(normalizeAddress(full)).toBe(full);
  });

  it("should handle addresses without 0x prefix", () => {
    expect(normalizeAddress("abc")).toBe("0x" + "0".repeat(61) + "abc");
  });

  it("should normalize mixed-case addresses", () => {
    expect(normalizeAddress("0xAbCdEf")).toBe("0x" + "0".repeat(58) + "abcdef");
  });

  it("should handle the zero address", () => {
    expect(normalizeAddress("0x0")).toBe("0x" + "0".repeat(64));
  });

  it("should handle a full-length Starknet address", () => {
    const addr = "0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa";
    expect(normalizeAddress(addr)).toBe(addr);
    expect(normalizeAddress(addr).length).toBe(66);
  });

  it("should handle a shorter real-world address", () => {
    const addr = "0x455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa";
    const expected = "0x0455c73741519a2d661cad966913ee5ccb24596c518ad67dd1d189b49c15d4fa";
    expect(normalizeAddress(addr)).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";

import { fadeVariant, slideVariant } from "./variants";

describe("slideVariant", () => {
  it("enters from the left for negative direction and right otherwise", () => {
    expect(slideVariant.enter(-1)).toEqual({ x: -1000, opacity: 0 });
    expect(slideVariant.enter(0)).toEqual({ x: 1000, opacity: 0 });
    expect(slideVariant.enter(1)).toEqual({ x: 1000, opacity: 0 });
  });

  it("exits according to direction sign", () => {
    expect(slideVariant.exit(-1)).toEqual({ zIndex: 0, x: 1000, opacity: 0 });
    expect(slideVariant.exit(1)).toEqual({ zIndex: 0, x: -1000, opacity: 0 });
  });
});

describe("fadeVariant", () => {
  it("keeps expected transition defaults", () => {
    expect(fadeVariant.initial.opacity).toBe(1);
    expect(fadeVariant.enter.transition.duration).toBe(0.5);
    expect(fadeVariant.exit.transition.duration).toBe(1);
  });
});

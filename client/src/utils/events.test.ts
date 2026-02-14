import { describe, expect, it } from "vitest";

import { processGameEvent } from "./events";

describe("processGameEvent", () => {
  it("returns unknown when event variant is missing", () => {
    expect(processGameEvent({})).toEqual({ type: "unknown" });
    expect(processGameEvent({ details: {} })).toEqual({ type: "unknown" });
  });

  it("maps attack event payload", () => {
    expect(
      processGameEvent({
        details: {
          variant: {
            attack: {
              attacker: "0x1",
              amount: 42,
            },
          },
        },
      }),
    ).toEqual({
      type: "attack",
      attacker: "0x1",
      amount: 42,
    });
  });

  it("maps summit and feed payloads with null-safe spreads", () => {
    expect(
      processGameEvent({
        details: {
          variant: {
            summit: undefined,
          },
        },
      }),
    ).toEqual({ type: "summit" });

    expect(
      processGameEvent({
        details: {
          variant: {
            feed: {
              target: "0x2",
            },
          },
        },
      }),
    ).toEqual({
      type: "feed",
      target: "0x2",
    });
  });
});

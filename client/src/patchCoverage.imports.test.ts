import { describe, expect, it, vi } from "vitest";
import { shuffle } from "@/utils/utils";

describe("lint-touched module imports", () => {
  it("loads modules with top-level runtime deltas", async () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });

    const modules = [
      "@/components/BeastCard",
      "@/components/BeastCollection",
      "@/components/AttackingBeasts",
      "@/components/GameNotificationFeed",
      "@/components/dialogs/AutopilotConfigModal",
      "@/components/dialogs/BeastDexModal",
      "@/components/dialogs/EventHistoryModal",
      "@/components/dialogs/BeastUpgradeModal",
      "@/components/dialogs/SummitGiftModal",
      "@/components/FinalShowdown",
      "@/contexts/QuestGuide",
      "@/contexts/sound",
      "@/utils/utils",
    ];

    for (const modulePath of modules) {
      await expect(import(modulePath)).resolves.toBeTruthy();
    }

    expect(shuffle([1, 2, 3]).length).toBe(3);
  });
});

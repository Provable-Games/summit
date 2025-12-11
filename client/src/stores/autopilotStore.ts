import { create } from 'zustand';

export type AttackStrategy = 'guaranteed' | 'all_out';

interface AutopilotConfig {
  // When to initiate attacks
  attackStrategy: AttackStrategy;
}

interface AutopilotState extends AutopilotConfig {
  setAttackStrategy: (attackStrategy: AttackStrategy) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'summit_autopilot_config_v1';

const DEFAULT_CONFIG: AutopilotConfig = {
  attackStrategy: 'guaranteed',
};

function loadConfigFromStorage(): AutopilotConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutopilotConfig>;
    return {
      attackStrategy: (parsed.attackStrategy as AttackStrategy) ?? DEFAULT_CONFIG.attackStrategy,
    };
  } catch {
    return null;
  }
}

export const useAutopilotStore = create<AutopilotState>((set, get) => {
  const persisted = loadConfigFromStorage();
  const initial: AutopilotConfig = persisted ?? DEFAULT_CONFIG;

  const persist = (partial: Partial<AutopilotConfig>): AutopilotConfig => {
    const next: AutopilotConfig = {
      attackStrategy: partial.attackStrategy ?? get().attackStrategy,
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // ignore storage errors
    }

    return next;
  };

  return {
    ...initial,
    setAttackStrategy: (attackStrategy: AttackStrategy) =>
      set(() => persist({ attackStrategy })),
    resetToDefaults: () =>
      set(() => persist({ ...DEFAULT_CONFIG })),
  };
});


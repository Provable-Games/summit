import { create } from 'zustand';

export type AttackStrategy = 'guaranteed' | 'all_out';

export type ExtraLifeStrategy = 'disabled' | 'after_capture' | 'aggressive';
export type PoisonStrategy = 'disabled' | 'conservative' | 'aggressive';

type AutopilotSessionCounters = {
  revivePotionsUsed: number;
  attackPotionsUsed: number;
  extraLifePotionsUsed: number;
  poisonPotionsUsed: number;
};

interface AutopilotConfig {
  // When to initiate attacks
  attackStrategy: AttackStrategy;

  // Whether Autopilot is allowed to spend revive potions on attacks
  useRevivePotions: boolean;
  revivePotionMax: number;
  // Maximum revive potions Autopilot may spend on a single beast (1..32)
  revivePotionMaxPerBeast: number;

  // Whether Autopilot is allowed to spend attack potions on attacks
  useAttackPotions: boolean;
  attackPotionMax: number;

  // Whether / when Autopilot is allowed to spend extra life potions
  extraLifeStrategy: ExtraLifeStrategy;
  // How many Extra Life potions to apply when you capture the Summit (0..4000)
  extraLifeMax: number;
  // Cap Summit extra lives after capture (1..4000)
  extraLifeTotalMax: number;
  // For aggressive strategy: replenish Summit extra lives up to this value (1..4000)
  extraLifeReplenishTo: number;

  // Whether / when Autopilot is allowed to spend poison potions
  poisonStrategy: PoisonStrategy;
  // Cap total poison potions Autopilot may spend per autopilot session (0 = unlimited)
  poisonTotalMax: number;
  // Conservative: only use poison when Summit has more than X extra lives
  poisonConservativeExtraLivesTrigger: number;
  // Poison amount to apply for conservative strategy
  poisonConservativeAmount: number;
  // Poison amount to apply for aggressive strategy
  poisonAggressiveAmount: number;
}

type AutopilotPersistedConfig = AutopilotConfig;

interface AutopilotState extends AutopilotPersistedConfig, AutopilotSessionCounters {
  setAttackStrategy: (attackStrategy: AttackStrategy) => void;
  setUseRevivePotions: (useRevivePotions: boolean) => void;
  setRevivePotionMax: (revivePotionMax: number) => void;
  setRevivePotionMaxPerBeast: (revivePotionMaxPerBeast: number) => void;

  setUseAttackPotions: (useAttackPotions: boolean) => void;
  setAttackPotionMax: (attackPotionMax: number) => void;

  setExtraLifeStrategy: (extraLifeStrategy: ExtraLifeStrategy) => void;
  setExtraLifeMax: (extraLifeMax: number) => void;
  setExtraLifeTotalMax: (extraLifeTotalMax: number) => void;
  setExtraLifeReplenishTo: (extraLifeReplenishTo: number) => void;

  setPoisonStrategy: (poisonStrategy: PoisonStrategy) => void;
  setPoisonTotalMax: (poisonTotalMax: number) => void;
  setPoisonConservativeExtraLivesTrigger: (poisonConservativeExtraLivesTrigger: number) => void;
  setPoisonConservativeAmount: (poisonConservativeAmount: number) => void;
  setPoisonAggressiveAmount: (poisonAggressiveAmount: number) => void;
  /**
   * "Used" fields are counters.
   * - If passed a number, it is treated as an amount to ADD.
   * - If passed a function, it is treated as a React-style updater: (prev) => next.
   */
  setRevivePotionsUsed: (revivePotionsUsed: number | ((prev: number) => number)) => void;
  setAttackPotionsUsed: (attackPotionsUsed: number | ((prev: number) => number)) => void;
  setExtraLifePotionsUsed: (extraLifePotionsUsed: number | ((prev: number) => number)) => void;
  setPoisonPotionsUsed: (poisonPotionsUsed: number | ((prev: number) => number)) => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'summit_autopilot_config_v1';

const DEFAULT_CONFIG: AutopilotPersistedConfig = {
  attackStrategy: 'guaranteed',
  useRevivePotions: false,
  revivePotionMax: 0,
  revivePotionMaxPerBeast: 32,
  useAttackPotions: false,
  attackPotionMax: 0,
  extraLifeStrategy: 'disabled',
  extraLifeMax: 0,
  extraLifeTotalMax: 0,
  extraLifeReplenishTo: 1000,
  poisonStrategy: 'disabled',
  poisonTotalMax: 0,
  poisonConservativeExtraLivesTrigger: 0,
  poisonConservativeAmount: 0,
  poisonAggressiveAmount: 0,
};

const DEFAULT_SESSION_COUNTERS: AutopilotSessionCounters = {
  revivePotionsUsed: 0,
  attackPotionsUsed: 0,
  extraLifePotionsUsed: 0,
  poisonPotionsUsed: 0,
};

function sanitizeNonNegativeInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function clampNonNegativeInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function clampIntRange(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isAttackStrategy(value: unknown): value is AttackStrategy {
  return value === 'guaranteed' || value === 'all_out';
}

function isExtraLifeStrategy(value: unknown): value is ExtraLifeStrategy {
  return value === 'disabled' || value === 'after_capture' || value === 'aggressive';
}

function isPoisonStrategy(value: unknown): value is PoisonStrategy {
  return value === 'disabled' || value === 'conservative' || value === 'aggressive';
}

function loadConfigFromStorage(): AutopilotPersistedConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutopilotPersistedConfig> & { poisonMax?: unknown };

    // Back-compat: older configs stored a single poisonMax; treat it as both strategy amounts.
    const poisonMaxLegacy = sanitizeNonNegativeInt(parsed.poisonMax, 0);
    return {
      attackStrategy: isAttackStrategy(parsed.attackStrategy) ? parsed.attackStrategy : DEFAULT_CONFIG.attackStrategy,

      useRevivePotions:
        typeof parsed.useRevivePotions === 'boolean'
          ? parsed.useRevivePotions
          : DEFAULT_CONFIG.useRevivePotions,
      revivePotionMax: sanitizeNonNegativeInt(parsed.revivePotionMax, DEFAULT_CONFIG.revivePotionMax),
      revivePotionMaxPerBeast: clampIntRange(
        (parsed as any).revivePotionMaxPerBeast,
        1,
        32,
        DEFAULT_CONFIG.revivePotionMaxPerBeast,
      ),

      useAttackPotions:
        typeof parsed.useAttackPotions === 'boolean'
          ? parsed.useAttackPotions
          : DEFAULT_CONFIG.useAttackPotions,
      attackPotionMax: sanitizeNonNegativeInt(parsed.attackPotionMax, DEFAULT_CONFIG.attackPotionMax),

      extraLifeStrategy: isExtraLifeStrategy(parsed.extraLifeStrategy)
        ? parsed.extraLifeStrategy
        : DEFAULT_CONFIG.extraLifeStrategy,
      extraLifeMax: clampIntRange(parsed.extraLifeMax, 0, 4000, DEFAULT_CONFIG.extraLifeMax),
      extraLifeTotalMax: clampIntRange(
        (parsed as any).extraLifeTotalMax,
        1,
        4000,
        DEFAULT_CONFIG.extraLifeTotalMax,
      ),
      extraLifeReplenishTo: clampIntRange(
        (parsed as any).extraLifeReplenishTo,
        1,
        4000,
        DEFAULT_CONFIG.extraLifeReplenishTo,
      ),

      poisonStrategy: isPoisonStrategy(parsed.poisonStrategy)
        ? parsed.poisonStrategy
        : DEFAULT_CONFIG.poisonStrategy,
      poisonTotalMax: sanitizeNonNegativeInt(
        (parsed as any).poisonTotalMax,
        DEFAULT_CONFIG.poisonTotalMax,
      ),
      poisonConservativeExtraLivesTrigger: sanitizeNonNegativeInt(
        parsed.poisonConservativeExtraLivesTrigger,
        DEFAULT_CONFIG.poisonConservativeExtraLivesTrigger,
      ),
      poisonConservativeAmount: sanitizeNonNegativeInt(
        parsed.poisonConservativeAmount,
        poisonMaxLegacy || DEFAULT_CONFIG.poisonConservativeAmount,
      ),
      poisonAggressiveAmount: sanitizeNonNegativeInt(
        parsed.poisonAggressiveAmount,
        poisonMaxLegacy || DEFAULT_CONFIG.poisonAggressiveAmount,
      ),
    };
  } catch {
    return null;
  }
}

export const useAutopilotStore = create<AutopilotState>((set, get) => {
  const persisted = loadConfigFromStorage();
  const initial: AutopilotPersistedConfig = persisted ?? DEFAULT_CONFIG;

  const persist = (partial: Partial<AutopilotPersistedConfig>): AutopilotPersistedConfig => {
    const next: AutopilotPersistedConfig = {
      attackStrategy: partial.attackStrategy ?? get().attackStrategy,
      useRevivePotions: partial.useRevivePotions ?? get().useRevivePotions,
      revivePotionMax: sanitizeNonNegativeInt(
        partial.revivePotionMax ?? get().revivePotionMax,
        DEFAULT_CONFIG.revivePotionMax,
      ),
      revivePotionMaxPerBeast: clampIntRange(
        partial.revivePotionMaxPerBeast ?? get().revivePotionMaxPerBeast,
        1,
        32,
        DEFAULT_CONFIG.revivePotionMaxPerBeast,
      ),

      useAttackPotions: partial.useAttackPotions ?? get().useAttackPotions,
      attackPotionMax: sanitizeNonNegativeInt(
        partial.attackPotionMax ?? get().attackPotionMax,
        DEFAULT_CONFIG.attackPotionMax,
      ),

      extraLifeStrategy: partial.extraLifeStrategy ?? get().extraLifeStrategy,
      extraLifeMax: clampIntRange(
        partial.extraLifeMax ?? get().extraLifeMax,
        0,
        4000,
        DEFAULT_CONFIG.extraLifeMax,
      ),
      extraLifeTotalMax: clampIntRange(
        partial.extraLifeTotalMax ?? get().extraLifeTotalMax,
        1,
        4000,
        DEFAULT_CONFIG.extraLifeTotalMax,
      ),
      extraLifeReplenishTo: clampIntRange(
        partial.extraLifeReplenishTo ?? get().extraLifeReplenishTo,
        1,
        4000,
        DEFAULT_CONFIG.extraLifeReplenishTo,
      ),

      poisonStrategy: partial.poisonStrategy ?? get().poisonStrategy,
      poisonTotalMax: sanitizeNonNegativeInt(
        partial.poisonTotalMax ?? get().poisonTotalMax,
        DEFAULT_CONFIG.poisonTotalMax,
      ),
      poisonConservativeExtraLivesTrigger: sanitizeNonNegativeInt(
        partial.poisonConservativeExtraLivesTrigger ?? get().poisonConservativeExtraLivesTrigger,
        DEFAULT_CONFIG.poisonConservativeExtraLivesTrigger,
      ),
      poisonConservativeAmount: sanitizeNonNegativeInt(
        partial.poisonConservativeAmount ?? get().poisonConservativeAmount,
        DEFAULT_CONFIG.poisonConservativeAmount,
      ),
      poisonAggressiveAmount: sanitizeNonNegativeInt(
        partial.poisonAggressiveAmount ?? get().poisonAggressiveAmount,
        DEFAULT_CONFIG.poisonAggressiveAmount,
      ),
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

  type CounterKey = keyof AutopilotSessionCounters;
  type CounterUpdate = number | ((prev: number) => number);

  const updateCounter = (key: CounterKey, update: CounterUpdate) => {
    set((state) => {
      const prev = state[key];
      const nextRaw = typeof update === 'function' ? update(prev) : prev + update;
      const next = clampNonNegativeInt(nextRaw, prev);
      return { [key]: next } as Pick<AutopilotState, CounterKey>;
    });
  };

  return {
    ...initial,
    ...DEFAULT_SESSION_COUNTERS,
    setAttackStrategy: (attackStrategy: AttackStrategy) =>
      set(() => persist({ attackStrategy })),
    setUseRevivePotions: (useRevivePotions: boolean) =>
      set(() => persist({ useRevivePotions })),
    setRevivePotionMax: (revivePotionMax: number) =>
      set(() => persist({ revivePotionMax })),
    setRevivePotionMaxPerBeast: (revivePotionMaxPerBeast: number) =>
      set(() => persist({ revivePotionMaxPerBeast })),

    setUseAttackPotions: (useAttackPotions: boolean) =>
      set(() => persist({ useAttackPotions })),
    setAttackPotionMax: (attackPotionMax: number) =>
      set(() => persist({ attackPotionMax })),

    setExtraLifeStrategy: (extraLifeStrategy: ExtraLifeStrategy) =>
      set(() => persist({ extraLifeStrategy })),
    setExtraLifeMax: (extraLifeMax: number) =>
      set(() => persist({ extraLifeMax })),
    setExtraLifeTotalMax: (extraLifeTotalMax: number) =>
      set(() => persist({ extraLifeTotalMax })),
    setExtraLifeReplenishTo: (extraLifeReplenishTo: number) =>
      set(() => persist({ extraLifeReplenishTo })),

    setPoisonStrategy: (poisonStrategy: PoisonStrategy) =>
      set(() => persist({ poisonStrategy })),
    setPoisonTotalMax: (poisonTotalMax: number) =>
      set(() => persist({ poisonTotalMax })),
    setPoisonConservativeExtraLivesTrigger: (poisonConservativeExtraLivesTrigger: number) =>
      set(() => persist({ poisonConservativeExtraLivesTrigger })),
    setPoisonConservativeAmount: (poisonConservativeAmount: number) =>
      set(() => persist({ poisonConservativeAmount })),
    setPoisonAggressiveAmount: (poisonAggressiveAmount: number) =>
      set(() => persist({ poisonAggressiveAmount })),
    setRevivePotionsUsed: (update) => updateCounter('revivePotionsUsed', update),
    setAttackPotionsUsed: (update) => updateCounter('attackPotionsUsed', update),
    setExtraLifePotionsUsed: (update) => updateCounter('extraLifePotionsUsed', update),
    setPoisonPotionsUsed: (update) => updateCounter('poisonPotionsUsed', update),
    resetToDefaults: () =>
      set(() => ({ ...persist({ ...DEFAULT_CONFIG }), ...DEFAULT_SESSION_COUNTERS })),
  };
});


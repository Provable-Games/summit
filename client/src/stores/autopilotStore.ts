import { create } from 'zustand';

export type AttackStrategy = 'never' | 'guaranteed' | 'all_out';

export interface IgnoredPlayer {
  name: string;
  address: string;
}

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
  // Maximum number of beasts to include in a single attack (1..295)
  maxBeastsPerAttack: number;
  // Skip attacking/poisoning if summit beast shares diplomacy prefix+suffix with any of your beasts
  skipSharedDiplomacy: boolean;
  // List of players whose summit beasts should be ignored by autopilot
  ignoredPlayers: IgnoredPlayer[];

  // Whether Autopilot is allowed to spend revive potions on attacks
  useRevivePotions: boolean;
  // Cap total revive potions Autopilot may spend per autopilot session (0..N)
  revivePotionMax: number;
  // Maximum revive potions Autopilot may spend on a single beast (1..32)
  revivePotionMaxPerBeast: number;

  // Whether Autopilot is allowed to spend attack potions on attacks
  useAttackPotions: boolean;
  // Cap total attack potions Autopilot may spend per autopilot session (0..N)
  attackPotionMax: number;
  // Maximum attack potions Autopilot may spend on a single beast (1..255)
  attackPotionMaxPerBeast: number;

  // Whether / when Autopilot is allowed to spend extra life potions
  extraLifeStrategy: ExtraLifeStrategy;
  // How many Extra Life potions to apply when you capture the Summit (0..4000)
  extraLifeMax: number;
  // Cap Summit extra lives after capture (0..4000)
  extraLifeTotalMax: number;
  // For aggressive strategy: replenish Summit extra lives up to this value (1..4000)
  extraLifeReplenishTo: number;

  // Whether / when Autopilot is allowed to spend poison potions
  poisonStrategy: PoisonStrategy;
  // Cap total poison potions Autopilot may spend per autopilot session (0..N)
  poisonTotalMax: number;
  // Conservative: only use poison when Summit has more than X extra lives
  poisonConservativeExtraLivesTrigger: number;
  // Poison amount to apply for conservative strategy
  poisonConservativeAmount: number;
  // Poison amount to apply for aggressive strategy
  poisonAggressiveAmount: number;
}

type AutopilotPersistedConfig = AutopilotConfig;

type AutopilotConfigStorageShape = Partial<AutopilotPersistedConfig> & {
  poisonMax?: unknown;
  maxBeastsPerAttack?: unknown;
  revivePotionMaxPerBeast?: unknown;
  attackPotionMaxPerBeast?: unknown;
  extraLifeTotalMax?: unknown;
  extraLifeReplenishTo?: unknown;
  poisonTotalMax?: unknown;
};

interface AutopilotState extends AutopilotPersistedConfig, AutopilotSessionCounters {
  setAttackStrategy: (attackStrategy: AttackStrategy) => void;
  setMaxBeastsPerAttack: (maxBeastsPerAttack: number) => void;
  setSkipSharedDiplomacy: (skipSharedDiplomacy: boolean) => void;
  addIgnoredPlayer: (player: IgnoredPlayer) => void;
  removeIgnoredPlayer: (address: string) => void;
  setUseRevivePotions: (useRevivePotions: boolean) => void;
  setRevivePotionMax: (revivePotionMax: number) => void;
  setRevivePotionMaxPerBeast: (revivePotionMaxPerBeast: number) => void;

  setUseAttackPotions: (useAttackPotions: boolean) => void;
  setAttackPotionMax: (attackPotionMax: number) => void;
  setAttackPotionMaxPerBeast: (attackPotionMaxPerBeast: number) => void;

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

const STORAGE_KEY = 'summit_autopilot_config_v2';

const DEFAULT_CONFIG: AutopilotPersistedConfig = {
  attackStrategy: 'guaranteed',
  maxBeastsPerAttack: 295,
  skipSharedDiplomacy: false,
  ignoredPlayers: [],
  useRevivePotions: false,
  revivePotionMax: 10,
  revivePotionMaxPerBeast: 1,
  useAttackPotions: false,
  attackPotionMax: 10,
  attackPotionMaxPerBeast: 10,
  extraLifeStrategy: 'disabled',
  extraLifeMax: 1,
  extraLifeTotalMax: 10,
  extraLifeReplenishTo: 1,
  poisonStrategy: 'disabled',
  poisonTotalMax: 100,
  poisonConservativeExtraLivesTrigger: 100,
  poisonConservativeAmount: 100,
  poisonAggressiveAmount: 100,
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
  return value === 'never' || value === 'guaranteed' || value === 'all_out';
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
    const parsed = JSON.parse(raw) as AutopilotConfigStorageShape;

    // Back-compat: older configs stored a single poisonMax; treat it as both strategy amounts.
    const poisonMaxLegacy = sanitizeNonNegativeInt(parsed.poisonMax, 0);
    return {
      attackStrategy: isAttackStrategy(parsed.attackStrategy) ? parsed.attackStrategy : DEFAULT_CONFIG.attackStrategy,
      maxBeastsPerAttack: clampIntRange(parsed.maxBeastsPerAttack, 1, 295, DEFAULT_CONFIG.maxBeastsPerAttack),
      skipSharedDiplomacy:
        typeof parsed.skipSharedDiplomacy === 'boolean'
          ? parsed.skipSharedDiplomacy
          : DEFAULT_CONFIG.skipSharedDiplomacy,
      ignoredPlayers: Array.isArray(parsed.ignoredPlayers)
        ? parsed.ignoredPlayers.filter(
            (p): p is IgnoredPlayer =>
              typeof p === 'object' && p !== null && typeof p.name === 'string' && typeof p.address === 'string',
          )
        : DEFAULT_CONFIG.ignoredPlayers,

      useRevivePotions:
        typeof parsed.useRevivePotions === 'boolean'
          ? parsed.useRevivePotions
          : DEFAULT_CONFIG.useRevivePotions,
      revivePotionMax: sanitizeNonNegativeInt(parsed.revivePotionMax, DEFAULT_CONFIG.revivePotionMax),
      revivePotionMaxPerBeast: clampIntRange(
        parsed.revivePotionMaxPerBeast,
        1,
        32,
        DEFAULT_CONFIG.revivePotionMaxPerBeast,
      ),

      useAttackPotions:
        typeof parsed.useAttackPotions === 'boolean'
          ? parsed.useAttackPotions
          : DEFAULT_CONFIG.useAttackPotions,
      attackPotionMax: sanitizeNonNegativeInt(parsed.attackPotionMax, DEFAULT_CONFIG.attackPotionMax),
      attackPotionMaxPerBeast: clampIntRange(
        parsed.attackPotionMaxPerBeast,
        1,
        255,
        DEFAULT_CONFIG.attackPotionMaxPerBeast,
      ),

      extraLifeStrategy: isExtraLifeStrategy(parsed.extraLifeStrategy)
        ? parsed.extraLifeStrategy
        : DEFAULT_CONFIG.extraLifeStrategy,
      extraLifeMax: clampIntRange(parsed.extraLifeMax, 0, 4000, DEFAULT_CONFIG.extraLifeMax),
      extraLifeTotalMax: clampIntRange(
        parsed.extraLifeTotalMax,
        0,
        4000,
        DEFAULT_CONFIG.extraLifeTotalMax,
      ),
      extraLifeReplenishTo: clampIntRange(
        parsed.extraLifeReplenishTo,
        1,
        4000,
        DEFAULT_CONFIG.extraLifeReplenishTo,
      ),

      poisonStrategy: isPoisonStrategy(parsed.poisonStrategy)
        ? parsed.poisonStrategy
        : DEFAULT_CONFIG.poisonStrategy,
      poisonTotalMax: sanitizeNonNegativeInt(
        parsed.poisonTotalMax,
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
      maxBeastsPerAttack: clampIntRange(
        partial.maxBeastsPerAttack ?? get().maxBeastsPerAttack,
        1,
        295,
        DEFAULT_CONFIG.maxBeastsPerAttack,
      ),
      skipSharedDiplomacy: partial.skipSharedDiplomacy ?? get().skipSharedDiplomacy,
      ignoredPlayers: partial.ignoredPlayers ?? get().ignoredPlayers,
      useRevivePotions: partial.useRevivePotions ?? get().useRevivePotions,
      revivePotionMax: sanitizeNonNegativeInt(
        partial.revivePotionMax ?? get().revivePotionMax,
        DEFAULT_CONFIG.revivePotionMax,
      ),
      revivePotionMaxPerBeast: clampIntRange(
        partial.revivePotionMaxPerBeast ?? get().revivePotionMaxPerBeast,
        1,
        64,
        DEFAULT_CONFIG.revivePotionMaxPerBeast,
      ),

      useAttackPotions: partial.useAttackPotions ?? get().useAttackPotions,
      attackPotionMax: sanitizeNonNegativeInt(
        partial.attackPotionMax ?? get().attackPotionMax,
        DEFAULT_CONFIG.attackPotionMax,
      ),
      attackPotionMaxPerBeast: clampIntRange(
        partial.attackPotionMaxPerBeast ?? get().attackPotionMaxPerBeast,
        1,
        255,
        DEFAULT_CONFIG.attackPotionMaxPerBeast,
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
        0,
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
    setMaxBeastsPerAttack: (maxBeastsPerAttack: number) =>
      set(() => persist({ maxBeastsPerAttack })),
    setSkipSharedDiplomacy: (skipSharedDiplomacy: boolean) =>
      set(() => persist({ skipSharedDiplomacy })),
    addIgnoredPlayer: (player: IgnoredPlayer) =>
      set(() => {
        const current = get().ignoredPlayers;
        const normalized = player.address.replace(/^0x0+/, '0x').toLowerCase();
        if (current.some((p) => p.address === normalized)) return {};
        return persist({ ignoredPlayers: [...current, { name: player.name, address: normalized }] });
      }),
    removeIgnoredPlayer: (address: string) =>
      set(() => {
        const normalized = address.replace(/^0x0+/, '0x').toLowerCase();
        return persist({ ignoredPlayers: get().ignoredPlayers.filter((p) => p.address !== normalized) });
      }),
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
    setAttackPotionMaxPerBeast: (attackPotionMaxPerBeast: number) =>
      set(() => persist({ attackPotionMaxPerBeast })),

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
      set(() => {
        return { ...persist({ ...DEFAULT_CONFIG }), ...DEFAULT_SESSION_COUNTERS };
      }),
  };
});

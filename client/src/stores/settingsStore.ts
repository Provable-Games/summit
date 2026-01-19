import { create } from 'zustand';

const STORAGE_KEY = 'summit_settings_v1';

const DEFAULT_BULK_ATTACK_LIMIT = 75;
const MIN_BULK_ATTACK_LIMIT = 1;
const MAX_BULK_ATTACK_LIMIT = 500;

interface SettingsPersistedConfig {
  bulkAttackLimit: number;
}

interface SettingsState extends SettingsPersistedConfig {
  setBulkAttackLimit: (limit: number) => void;
  resetToDefaults: () => void;
}

function clampBulkAttackLimit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return DEFAULT_BULK_ATTACK_LIMIT;
  return Math.min(MAX_BULK_ATTACK_LIMIT, Math.max(MIN_BULK_ATTACK_LIMIT, Math.floor(n)));
}

function loadConfigFromStorage(): SettingsPersistedConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SettingsPersistedConfig>;
    return {
      bulkAttackLimit: clampBulkAttackLimit(parsed.bulkAttackLimit),
    };
  } catch {
    return null;
  }
}

const DEFAULT_CONFIG: SettingsPersistedConfig = {
  bulkAttackLimit: DEFAULT_BULK_ATTACK_LIMIT,
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persisted = loadConfigFromStorage();
  const initial: SettingsPersistedConfig = persisted ?? DEFAULT_CONFIG;

  const persist = (partial: Partial<SettingsPersistedConfig>): SettingsPersistedConfig => {
    const next: SettingsPersistedConfig = {
      bulkAttackLimit: clampBulkAttackLimit(partial.bulkAttackLimit ?? get().bulkAttackLimit),
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
    setBulkAttackLimit: (limit: number) => set(() => persist({ bulkAttackLimit: limit })),
    resetToDefaults: () => set(() => persist({ ...DEFAULT_CONFIG })),
  };
});

export { MIN_BULK_ATTACK_LIMIT, MAX_BULK_ATTACK_LIMIT, DEFAULT_BULK_ATTACK_LIMIT };

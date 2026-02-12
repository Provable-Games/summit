import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SoundName = "roar" | "blade" | "bludgeon" | "wand" | "poison";

const SOUNDS: Record<SoundName, string> = {
  roar: "/audio/roar.mp3",
  blade: "/audio/blade.mp3",
  bludgeon: "/audio/bludgeon.mp3",
  wand: "/audio/wand.mp3",
  poison: "/audio/poison.mp3",
};

type PlayOptions = {
  volume?: number;
  rate?: number;
  allowOverlap?: boolean;
};

type SoundContextValue = {
  play: (name: SoundName, opts?: PlayOptions) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  unlocked: boolean;
};

const SoundContext = createContext<SoundContextValue | null>(null);

const STORAGE_KEYS = {
  muted: "sound:muted",
  volume: "sound:volume",
};

export function SoundProvider({ children }: PropsWithChildren) {
  const [muted, setMutedState] = useState<boolean>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.muted) : null;
    return stored ? stored === "1" : false;
  });
  const [volume, setVolumeState] = useState<number>(0.1);

  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => setUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    try {
      localStorage.setItem(STORAGE_KEYS.muted, m ? "1" : "0");
    } catch { /* intentionally empty */ }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(clamped));
    } catch { /* intentionally empty */ }
  }, []);

  const pendingRef = useRef<Array<{ name: SoundName; opts?: PlayOptions }>>([]);

  const playNow = useCallback((name: SoundName, opts?: PlayOptions) => {
    if (muted) return;
    const a = new Audio(SOUNDS[name]);
    a.volume = opts?.volume ?? volume;
    if (opts?.rate && Number.isFinite(opts.rate)) {
      try { a.playbackRate = opts.rate; } catch { /* intentionally empty */ }
    }
    void a.play().catch(() => { });
  }, [muted, volume]);

  useEffect(() => {
    if (!unlocked || pendingRef.current.length === 0) return;
    const items = pendingRef.current.splice(0, pendingRef.current.length);
    for (const it of items) playNow(it.name, it.opts);
  }, [unlocked, playNow]);

  const play = useCallback((name: SoundName, opts?: PlayOptions) => {
    if (!unlocked) {
      pendingRef.current.push({ name, opts });
      return;
    }
    playNow(name, opts);
  }, [unlocked, playNow]);

  const value = useMemo(
    () => ({ play, muted, setMuted, volume, setVolume, unlocked }),
    [play, muted, setMuted, volume, setVolume, unlocked]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSound = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
};



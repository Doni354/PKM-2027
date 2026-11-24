import { useEffect, useState } from 'react';

export type ResolvedScheme = 'light' | 'dark';
export type StoredScheme = 'light' | 'dark' | null;

const STORAGE_KEY = 'color-scheme';

function getSystemScheme(): ResolvedScheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredScheme(): StoredScheme {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

function applyMetaScheme(stored: StoredScheme): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = stored ?? 'light dark';
  }
}

/**
 * Two-state dark mode toggle following modern-web-guidance:
 * - Default follows OS preference (`light dark`).
 * - Toggling to the opposite of OS stores the literal scheme; toggling back to match OS removes storage.
 * - Keeps tabs in sync via `storage` event and reacts to OS changes without erasing explicit overrides.
 */
export function useColorScheme() {
  const [stored, setStored] = useState<StoredScheme>(() => readStoredScheme());
  const [system, setSystem] = useState<ResolvedScheme>(() => getSystemScheme());

  const resolved: ResolvedScheme = stored ?? system;

  useEffect(() => {
    applyMetaScheme(stored);
  }, [stored]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = (e: MediaQueryListEvent) => {
      setSystem(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onMqChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null;
        setStored(next);
        applyMetaScheme(next);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mq.removeEventListener('change', onMqChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggleScheme = () => {
    const currentSystem = getSystemScheme();
    const currentResolved = stored ?? currentSystem;
    const target: ResolvedScheme = currentResolved === 'dark' ? 'light' : 'dark';

    const nextStored: StoredScheme = target === currentSystem ? null : target;
    setStored(nextStored);
    applyMetaScheme(nextStored);

    try {
      if (nextStored === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, nextStored);
      }
    } catch {
      // Theme still applies even when storage is blocked
    }
  };

  return { resolved, stored, isDark: resolved === 'dark', toggleScheme };
}


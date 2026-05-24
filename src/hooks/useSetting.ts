import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/**
 * useSetting — returns [value, setValue] for any setting key in the store.
 * Uses Zustand selectors for fine-grained re-renders.
 */
export function useSetting<K extends keyof ReturnType<typeof useSettingsStore>>(
  key: K
): [ReturnType<typeof useSettingsStore>[K], (value: ReturnType<typeof useSettingsStore>[K]) => void] {
  const value = useSettingsStore((state) => state[key]);

  const setterKey = `set${String(key).charAt(0).toUpperCase()}${String(key).slice(1)}` as keyof ReturnType<typeof useSettingsStore>;
  const rawSetter = useSettingsStore((state) => state[setterKey]);

  const setter = useCallback(
    (v: ReturnType<typeof useSettingsStore>[K]) => {
      if (typeof rawSetter === 'function') {
        (rawSetter as any)(v);
      } else {
        useSettingsStore.setState({ [key]: v } as any);
      }
    },
    [rawSetter, key]
  );

  return [value, setter];
}

/**
 * useIpcSetting — syncs a setting with the main process.
 * Fetches initial value via IPC on mount and subscribes to changes.
 * Returns [value, setValue] where setValue updates both store and IPC.
 */
export function useIpcSetting<T>(
  getter: () => Promise<T>,
  setter: (value: T) => Promise<any>,
  onChanged?: (callback: (value: T) => void) => (() => void) | undefined
): [T | undefined, (value: T) => Promise<void>] {
  const [value, setLocalValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getter().then((v) => {
      if (!cancelled) setLocalValue(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [getter]);

  useEffect(() => {
    if (!onChanged) return;
    const unsubscribe = onChanged((newValue) => {
      setLocalValue(newValue);
    });
    return () => unsubscribe?.();
  }, [onChanged]);

  const updateValue = useCallback(async (newValue: T) => {
    setLocalValue(newValue);
    await setter(newValue);
  }, [setter]);

  return [value, updateValue];
}

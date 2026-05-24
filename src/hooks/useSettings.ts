import { useSettingsStore, type SettingsStore } from '../store/settingsStore';

/**
 * useSettings — returns the full settings store.
 * Use this in components that need to read or write many settings at once.
 * For single-setting access, prefer useSetting() for better re-render performance.
 */
export function useSettings(): SettingsStore {
  return useSettingsStore();
}

import { create } from 'zustand';
import { AppSettings } from '../shared/types';

interface SettingsStoreState {
  settings: AppSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: {
    theme: 'dark',
    appName: 'Crafted Studio Code',
    version: '1.0.0',
    logoPath: undefined,
  },
  isLoading: true,

  fetchSettings: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const settings = await window.craftedAPI.getSettings();
        set({ settings, isLoading: false });
      } catch (err) {
        console.error('[settingsStore] Error loading settings:', err);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const success = await window.craftedAPI.setSetting(key, value);
        if (success) {
          set({
            settings: {
              ...get().settings,
              [key]: value,
            },
          });
        }
        return success;
      } catch (err) {
        console.error(`[settingsStore] Error updating setting ${key}:`, err);
        return false;
      }
    }
    return false;
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';
/** Which AI app "ask AI" buttons open. */
export type AiApp = 'claude' | 'chatgpt' | 'gemini';

interface PreferencesState {
  theme: ThemePreference;
  aiApp: AiApp;
  setTheme: (theme: ThemePreference) => void;
  setAiApp: (aiApp: AiApp) => void;
}

/** Device-local copy of users/{uid}/settings/app, so preferences apply before sign-in resolves. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      aiApp: 'claude',
      setTheme: (theme) => set({ theme }),
      setAiApp: (aiApp) => set({ aiApp }),
    }),
    { name: 'nook:preferences', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

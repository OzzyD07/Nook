import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebase } from '@/lib/firebase';
import { usePreferences, type AiApp, type ThemePreference } from '@/store/preferences';

const settingsRef = (uid: string) => doc(firebase().db, 'users', uid, 'settings', 'app');

/** Mirrors users/{uid}/settings/app into the local preferences store. */
export function syncSettings(uid: string): () => void {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => {
      const data = snapshot.data();
      const preferences = usePreferences.getState();
      if (data?.theme === 'system' || data?.theme === 'light' || data?.theme === 'dark') preferences.setTheme(data.theme);
      if (data?.aiApp === 'claude' || data?.aiApp === 'chatgpt' || data?.aiApp === 'gemini') preferences.setAiApp(data.aiApp);
    },
    () => undefined,
  );
}

export async function saveTheme(uid: string, theme: ThemePreference): Promise<void> {
  usePreferences.getState().setTheme(theme);
  await setDoc(settingsRef(uid), { theme, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveAiApp(uid: string, aiApp: AiApp): Promise<void> {
  usePreferences.getState().setAiApp(aiApp);
  await setDoc(settingsRef(uid), { aiApp, updatedAt: serverTimestamp() }, { merge: true });
}

import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebase } from '@/lib/firebase';
import { usePreferences, type ThemePreference } from '@/store/preferences';

const settingsRef = (uid: string) => doc(firebase().db, 'users', uid, 'settings', 'app');

/** Mirrors users/{uid}/settings/app into the local preferences store. */
export function syncSettings(uid: string): () => void {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => {
      const theme = snapshot.data()?.theme;
      if (theme === 'system' || theme === 'light' || theme === 'dark') {
        usePreferences.getState().setTheme(theme);
      }
    },
    () => undefined,
  );
}

export async function saveTheme(uid: string, theme: ThemePreference): Promise<void> {
  usePreferences.getState().setTheme(theme);
  await setDoc(settingsRef(uid), { theme, updatedAt: serverTimestamp() }, { merge: true });
}

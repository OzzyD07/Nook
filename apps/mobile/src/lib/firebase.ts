import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

import { env } from '@/lib/env';

let instances: { auth: Auth; db: Firestore } | undefined;

/** Lazily initialized so the app can still start (and explain) when Firebase is not configured. */
export function firebase(): { auth: Auth; db: Firestore } {
  if (instances) return instances;
  const isNew = getApps().length === 0;
  const app = isNew ? initializeApp(env.firebase) : getApp();
  instances = {
    auth: isNew
      ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
      : getAuth(app),
    // WebChannel streaming is unreliable on React Native; let the SDK fall back to long polling.
    db: isNew ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : getFirestore(app),
  };
  return instances;
}

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { env } from '@/lib/env';

let instances: { auth: Auth; db: Firestore } | undefined;

export function firebase(): { auth: Auth; db: Firestore } {
  if (instances) return instances;
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  instances = { auth: getAuth(app), db: getFirestore(app) };
  return instances;
}

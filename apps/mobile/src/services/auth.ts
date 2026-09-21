import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { clearCache } from '@/lib/cache';
import { firebase } from '@/lib/firebase';
import { useDashboard } from '@/store/dashboard';
import { useSession } from '@/store/session';

export function watchAuth(): () => void {
  return onAuthStateChanged(firebase().auth, (user) => {
    useSession.getState().setUser(user ? { uid: user.uid, email: user.email } : null);
  });
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
}

export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(firebase().auth, email.trim(), password);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebase().auth, email.trim());
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebase().auth);
  useDashboard.getState().reset();
  await clearCache();
}

export async function idToken(): Promise<string> {
  const user = firebase().auth.currentUser;
  if (!user) throw new Error('Not signed in');
  return user.getIdToken();
}

/** Maps Firebase auth error codes to readable messages. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    default:
      return error instanceof Error ? error.message : 'Something went wrong.';
  }
}

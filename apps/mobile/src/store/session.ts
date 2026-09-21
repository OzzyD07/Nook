import { create } from 'zustand';

export interface SessionUser {
  uid: string;
  email: string | null;
}

interface SessionState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
}

export const useSession = create<SessionState>()((set) => ({
  status: 'loading',
  user: null,
  setUser: (user) => set({ user, status: user ? 'signedIn' : 'signedOut' }),
}));

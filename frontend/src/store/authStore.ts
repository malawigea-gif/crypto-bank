import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  kycStatus: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'crypto-bank-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

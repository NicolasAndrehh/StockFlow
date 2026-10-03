import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from './auth.api';
import { setAuthToken } from '../../services/apiClient';

export type Role = 'Administrator' | 'Cashier' | 'Waiter';

interface AuthUser {
  role: Role;
  locationId: number | null; // sede fija para Cashier/Waiter
  name: string;
}

interface ActiveLocation {
  id: number;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  activeLocation: ActiveLocation | null;
  login: (code: string, password: string) => Promise<void>;
  logout: () => void;
  selectLocation: (location: ActiveLocation) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = () => {
    setUser(null);
    setActiveLocation(null);
    setAuthToken(null);
  };

  const resetTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (user) timerRef.current = setTimeout(logout, INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => events.forEach((e) => window.removeEventListener(e, resetTimer));
  }, [user]);

  const login = async (code: string, password: string) => {
    const res = await authApi.login(code, password);
    setAuthToken(res.token);
    setUser({ role: res.role, locationId: res.locationId, name: res.name });

    // Cashier/Waiter ya tienen sede fija asignada — no pasan por el selector
    if (res.role !== 'Administrator' && res.locationId != null && res.locationName) {
      setActiveLocation({ id: res.locationId, name: res.locationName });
    }
  };

  const selectLocation = (location: ActiveLocation) => {
    setActiveLocation(location);
  };

  return (
    <AuthContext.Provider value={{ user, activeLocation, login, logout, selectLocation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
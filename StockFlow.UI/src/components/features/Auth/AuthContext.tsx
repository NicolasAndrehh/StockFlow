import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from './auth.api';
import { setAuthToken } from '../../services/apiClient';

export type Role = 'Administrator' | 'Cashier' | 'Waiter';
export type OperatingRole = 'Administrator' | 'Cashier' | 'Waiter';

interface AuthUser {
  role: Role;
  locationId: number | null; // Sede fija asignada para Cashier y Waiter
  name: string;
}

export interface ActiveLocation {
  id: number;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  activeLocation: ActiveLocation | null;
  operatingRole: OperatingRole;
  login: (code: string, password: string) => Promise<void>;
  logout: () => void;
  selectLocation: (location: ActiveLocation) => void;
  selectOperatingRole: (role: OperatingRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);
  const [operatingRole, setOperatingRole] = useState<OperatingRole>('Administrator');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = () => {
    setUser(null);
    setActiveLocation(null);
    setOperatingRole('Administrator');
    setAuthToken(null);
  };

  // Reinicio el contador de 3 minutos cada vez que detecto actividad del usuario (HU-19)
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

    if (res.role !== 'Administrator' && res.locationId != null && res.locationName) {
      // Cajeros y Meseros entran directamente con su única sede asignada y su rol operativo fijo
      setActiveLocation({ id: res.locationId, name: res.locationName });
      setOperatingRole(res.role === 'Waiter' ? 'Waiter' : 'Cashier');
    } else {
      // El Administrador entra por defecto en su vista general de administración y elige su sede activa (HU-06)
      setActiveLocation(null);
      setOperatingRole('Administrator');
    }
  };

  const selectLocation = (location: ActiveLocation) => {
    setActiveLocation(location);
  };

  const selectOperatingRole = (role: OperatingRole) => {
    setOperatingRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeLocation,
        operatingRole,
        login,
        logout,
        selectLocation,
        selectOperatingRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

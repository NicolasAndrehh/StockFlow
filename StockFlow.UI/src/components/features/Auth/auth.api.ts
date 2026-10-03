import { api } from '../../services/apiClient';
import type { Role } from './AuthContext';

export interface LoginResponse {
  message: string;
  token: string;
  role: Role;
  locationId: number | null;
  locationName: string | null;
  name: string;
}

export const authApi = {
  login: (code: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { code, password }),
};
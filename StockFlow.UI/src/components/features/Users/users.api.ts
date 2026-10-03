import { api } from '../../services/apiClient';
import type { Location } from '../Locations/locations.api';

export interface User {
  id: number;
  code: string;
  name: string;
  role: string;
  locationId?: number | null;
  location?: Location | null;
  status: boolean;
}

export interface UserPayload {
  id?: number;
  code: string;
  name: string;
  role: string;
  locationId?: number | null;
  status: boolean;
  password?: string; // solo se manda al crear o al cambiar la contraseña
}

interface UserMutationResponse {
  message: string;
  user: User;
}

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  create: (payload: UserPayload) => api.post<UserMutationResponse>('/users', payload),
  update: (id: number, payload: UserPayload) => api.put<UserMutationResponse>(`/users/${id}`, payload),
};
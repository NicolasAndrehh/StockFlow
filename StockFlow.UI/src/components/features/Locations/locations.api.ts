import { api } from '../../services/apiClient';

export interface Location {
  id: number;
  code: string;
  name: string;
  address: string;
}

export interface LocationPayload {
  id?: number;
  code: string;
  name: string;
  address: string;
}

interface LocationMutationResponse {
  message: string;
  location: Location;
}

export const locationsApi = {
  getAll: () => api.get<Location[]>('/locations'),
  create: (payload: LocationPayload) => api.post<LocationMutationResponse>('/locations', payload),
  update: (id: number, payload: LocationPayload) => api.put<LocationMutationResponse>(`/locations/${id}`, payload),
};
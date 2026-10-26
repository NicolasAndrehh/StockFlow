import { api } from '../../services/apiClient';

export interface RestaurantTable {
  id: number;
  number: number;
  status: 'Available' | 'Occupied';
  locationId: number;
}

interface TableMutationResponse {
  message: string;
  table: RestaurantTable;
}

export const tablesApi = {
  getByLocation: (locationId: number) =>
    api.get<RestaurantTable[]>(`/tables?locationId=${locationId}`),
  updateStatus: (id: number, status: 'Available' | 'Occupied') =>
    api.put<TableMutationResponse>(`/tables/${id}/status`, { status }),
  create: (locationId: number, number: number) =>
    api.post<TableMutationResponse>('/tables', { locationId, number, status: 'Available' }),
};
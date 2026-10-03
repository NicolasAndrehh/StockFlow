import { api } from '../../services/apiClient';

export interface Supplier {
  id: number;
  name: string;
}

export interface SupplierPayload {
  id?: number;
  name: string;
}

interface SupplierMutationResponse {
  message: string;
  supplier: Supplier;
}

export const suppliersApi = {
  getAll: () => api.get<Supplier[]>('/suppliers'),
  create: (payload: SupplierPayload) => api.post<SupplierMutationResponse>('/suppliers', payload),
  update: (id: number, payload: SupplierPayload) => api.put<SupplierMutationResponse>(`/suppliers/${id}`, payload),
};
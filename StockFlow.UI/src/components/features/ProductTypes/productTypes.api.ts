import { api } from '../../services/apiClient';

export interface ProductType {
  id: number;
  name: string;
  associatedProducts: number;
} 

export interface ProductTypePayload {
  id?: number;
  name: string;
}

interface ProductTypeMutationResponse {
  message: string;
  productType: ProductType;
}

export const productTypesApi = {
  getAll: () => api.get<ProductType[]>('/product-types'),
  create: (payload: ProductTypePayload) => api.post<ProductTypeMutationResponse>('/product-types', payload),
  update: (id: number, payload: ProductTypePayload) => api.put<ProductTypeMutationResponse>(`/product-types/${id}`, payload),
};
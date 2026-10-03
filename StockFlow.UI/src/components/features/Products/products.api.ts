import { api } from '../../services/apiClient';

export interface ProductType {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  productTypeId: number;
  productType?: ProductType;
  supplierId: number;
  supplier?: Supplier;
}

export interface ProductPayload {
  id?: number;
  code: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  productTypeId: number;
  supplierId: number;
}

interface ProductMutationResponse {
  message: string;
  product: Product;
}

export const productsApi = {
  getAll: () => api.get<Product[]>('/products'),
  create: (payload: ProductPayload) => api.post<ProductMutationResponse>('/products', payload),
  update: (id: number, payload: ProductPayload) => api.put<ProductMutationResponse>(`/products/${id}`, payload),
};
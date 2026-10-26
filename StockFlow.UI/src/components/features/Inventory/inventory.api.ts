import { api } from '../../services/apiClient';

export interface LocationInventoryItem {
  id: number;
  locationId: number;
  productId: number;
  productCode: string;
  productName: string;
  productTypeName: string;
  supplierName: string;
  salePrice: number;
  availableQuantity: number;
}

export interface InventoryEntryPayload {
  locationId: number;
  productId: number;
  quantity: number;
}

interface InventoryEntryResponse {
  message: string;
  availableQuantity: number;
}

export const inventoryApi = {
  getByLocation: (locationId: number) =>
    api.get<LocationInventoryItem[]>(`/inventory?locationId=${locationId}`),
  registerEntry: (payload: InventoryEntryPayload) =>
    api.post<InventoryEntryResponse>('/inventory/entry', payload),
};
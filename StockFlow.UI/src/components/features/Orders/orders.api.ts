import { api } from '../../services/apiClient';

export interface OrderDetailItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ActiveOrderResponse {
  id: number;
  status: string;
  openingDate: string;
  tableId: number;
  tableNumber: number;
  waiterName: string;
  details: OrderDetailItem[];
  total: number;
}

export interface CreateOrderPayload {
  locationId: number;
  tableId: number;
  items: {
    productId: number;
    quantity: number;
  }[];
}

interface SaveOrderResponse {
  message: string;
  orderId: number;
}

export const ordersApi = {
  getActiveByTable: (tableId: number) =>
    api.get<ActiveOrderResponse | null>(`/orders/active?tableId=${tableId}`),
  saveOrder: (payload: CreateOrderPayload) =>
    api.post<SaveOrderResponse>('/orders', payload),
};
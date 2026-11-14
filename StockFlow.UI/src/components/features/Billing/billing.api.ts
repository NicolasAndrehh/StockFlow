import { api } from '../../services/apiClient';
import type { OrderDetailItem } from '../Orders/orders.api';

export interface CashDenominationItem {
  denomination: number;
  count: number;
  kind: string;
  subtotal: number;
}

export interface LocationOrderSummary {
  id: number;
  status: 'Open' | 'Closed';
  openingDate: string;
  tableId: number;
  tableNumber: number;
  locationId: number;
  locationName: string;
  waiterName: string;
  total: number;
  paymentMethod?: string | null;
  invoiceNumber?: string | null;
  details: OrderDetailItem[];
}

export interface InvoiceReceipt {
  orderId: number;
  tableNumber: number;
  locationName: string;
  waiterName: string;
  cashierName: string;
  invoiceNumber: string;
  issuedDate: string;
  paymentMethod: string;
  totalPaid: number;
  items: OrderDetailItem[];
  cashBreakdown?: CashDenominationItem[];
}

export interface CheckoutOrderResponse {
  message: string;
  invoice: InvoiceReceipt;
}

export const billingApi = {
  // Consulto las órdenes abiertas y cerradas de la sede activa para el flujo de cierre del Cajero (HU-12)
  getOrdersByLocation: (locationId: number) =>
    api.get<LocationOrderSummary[]>(`/orders/location?locationId=${locationId}`),

  // Cierro el pedido registrando un único medio de pago sin recargos y generando la factura física (HU-12, HU-13, HU-14)
  checkoutOrder: (orderId: number, paymentMethod: string) =>
    api.post<CheckoutOrderResponse>(`/orders/${orderId}/checkout`, { paymentMethod }),

  // Obtengo los datos de la factura física no electrónica para su visualización o impresión (HU-14)
  getInvoiceByOrder: (orderId: number) =>
    api.get<InvoiceReceipt>(`/orders/${orderId}/invoice`),
};

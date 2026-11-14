import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { DataTable } from '../../common/DataTable/DataTable';
import { Badge } from '../../common/Badge/Badge';
import { Button } from '../../common/Button/Button';
import { PayOption } from '../../common/PayOption/PayOption';
import { TicketSummary } from '../../common/TicketSummary/TicketSummary';
import { StepBar } from '../../common/StepBar/StepBar';
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../../common/Toast/ToastContext';
import { billingApi } from './billing.api';
import type { InvoiceReceipt, LocationOrderSummary } from './billing.api';

type BillingStep = 'list' | 'payment' | 'invoice';
type PaymentMethodType = 'Cash' | 'Credit Card' | 'Debit Card';

const PAYMENT_METHODS: PaymentMethodType[] = ['Cash', 'Credit Card', 'Debit Card'];

const formatMoney = (n: number) => `$${n.toLocaleString('es-CO')}`;

export default function BillingView() {
  const { activeLocation } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<LocationOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<BillingStep>('list');
  const [selectedOrder, setSelectedOrder] = useState<LocationOrderSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceReceipt | null>(null);

  const loadOrders = () => {
    if (!activeLocation?.id) return;
    setLoading(true);
    billingApi
      .getOrdersByLocation(activeLocation.id)
      .then(setOrders)
      .catch(() => showToast('Failed to load orders for this location.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setStep('list');
    setSelectedOrder(null);
    setActiveInvoice(null);
    loadOrders();
  }, [activeLocation?.id]);

  // Inicio el proceso de cierre seleccionando un pedido abierto de la sede (HU-12 -> HU-13)
  const handleStartCloseOrder = (order: LocationOrderSummary) => {
    setSelectedOrder(order);
    setPaymentMethod('Cash');
    setStep('payment');
  };

  // Permito consultar e imprimir la factura física de un pedido que ya fue cerrado previamente (HU-14)
  const handleViewExistingInvoice = async (order: LocationOrderSummary) => {
    try {
      const invoice = await billingApi.getInvoiceByOrder(order.id);
      setActiveInvoice(invoice);
      setStep('invoice');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load invoice.');
    }
  };

  // Confirmo el pago único sin recargos, cierro la orden, libero la mesa y paso al comprobante físico (HU-12, HU-13, HU-14)
  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const res = await billingApi.checkoutOrder(selectedOrder.id, paymentMethod);
      showToast(res.message);
      setActiveInvoice(res.invoice);
      setStep('invoice');
      loadOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error processing order checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  // Disparo la ventana nativa de impresión del navegador para entregar la factura física (HU-14)
  const handlePrintInvoice = () => {
    window.print();
  };

  const currentStepNumber = step === 'list' ? 1 : step === 'payment' ? 2 : 3;

  return (
    <div>
      <StepBar
        current={currentStepNumber}
        labels={[
          'Select Open Order (HU-12)',
          'Receive Payment (HU-13)',
          'Physical Invoice (HU-14)',
        ]}
      />

      {step === 'list' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <h3 style={{ margin: 0 }}>
              Open orders in location — {activeLocation?.name ?? ''}
            </h3>
            <Button variant="mini" onClick={loadOrders} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <DataTable
            columns={['Table', 'Waiter', 'Total', 'Status', '']}
            rows={orders}
            ariaLabel="Orders in location"
            renderRow={(o) => (
              <tr key={o.id}>
                <td><strong>#{o.tableNumber}</strong></td>
                <td>{o.waiterName}</td>
                <td><strong>{formatMoney(o.total)}</strong></td>
                <td>
                  <Badge
                    status={o.status === 'Open' ? 'open' : 'closed'}
                    label={o.status}
                  />
                </td>
                <td>
                  {o.status === 'Open' ? (
                    <Button
                      variant="mini"
                      onClick={() => handleStartCloseOrder(o)}
                    >
                      Close Order
                    </Button>
                  ) : (
                    <Button
                      variant="mini"
                      onClick={() => handleViewExistingInvoice(o)}
                    >
                      View Invoice
                    </Button>
                  )}
                </td>
              </tr>
            )}
          />
        </Card>
      )}

      {step === 'payment' && selectedOrder && (
        <SplitLayout
          left={
            <Card>
              <h3 style={{ marginTop: 0 }}>Order — Table #{selectedOrder.tableNumber}</h3>
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.4rem' }}>
                Waiter: <strong>{selectedOrder.waiterName}</strong> · Location: <strong>{selectedOrder.locationName}</strong>
              </div>
              <hr style={{ border: 0, borderTop: '1px dashed var(--line2)', margin: '.6rem 0' }} />
              <TicketSummary
                items={selectedOrder.details.map((d) => ({
                  id: d.id,
                  name: `${d.quantity} × ${d.productName}`,
                  price: d.subtotal,
                }))}
                formatMoney={formatMoney}
              />
            </Card>
          }
          right={
            <Card>
              <h3 style={{ marginTop: 0 }}>Payment method</h3>
              {PAYMENT_METHODS.map((method) => (
                <PayOption
                  key={method}
                  name="payMethod"
                  label={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
              ))}

              <div style={{ fontSize: '.78rem', color: 'var(--dim)', marginTop: '.4rem', marginBottom: '.8rem' }}>
                Single payment per order · No surcharges applied for card or cash payments.
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <Button
                  variant="primary"
                  onClick={handleConfirmPayment}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Processing...'
                    : `Confirm payment ${formatMoney(selectedOrder.total)}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedOrder(null);
                    setStep('list');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          }
        />
      )}

      {step === 'invoice' && activeInvoice && (
        <SplitLayout
          left={
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
                <h3 style={{ margin: 0 }}>Sales Invoice</h3>
                <Badge status="closed" label={activeInvoice.invoiceNumber} />
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.25rem' }}>
                StockFlow · {activeInvoice.locationName} · Table #{activeInvoice.tableNumber}
              </div>
              <div style={{ fontSize: '.76rem', color: 'var(--dim)' }}>
                Issued: {new Date(activeInvoice.issuedDate).toLocaleString('en-US')} · Waiter: {activeInvoice.waiterName}
              </div>
              <hr style={{ border: 0, borderTop: '1px dashed var(--line2)', margin: '.6rem 0' }} />
              <TicketSummary
                items={activeInvoice.items.map((item) => ({
                  id: item.id,
                  name: `${item.quantity} × ${item.productName}`,
                  price: item.subtotal,
                }))}
                formatMoney={formatMoney}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '.82rem',
                  color: 'var(--muted)',
                  marginTop: '.5rem',
                  paddingTop: '.4rem',
                  borderTop: '1px dashed var(--line2)',
                }}
              >
                <span>Payment method</span>
                <strong>{activeInvoice.paymentMethod}</strong>
              </div>

              {/* Pie del comprobante físico con el desglose óptimo de denominaciones COP calculado por el Algoritmo Voraz (HU-13 / HU-14) */}
              {activeInvoice.paymentMethod === 'Cash' &&
                activeInvoice.cashBreakdown &&
                activeInvoice.cashBreakdown.length > 0 && (
                  <div
                    style={{
                      marginTop: '.6rem',
                      paddingTop: '.5rem',
                      borderTop: '1px dashed var(--line2)',
                      fontSize: '.75rem',
                      color: 'var(--dim)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--muted)', marginBottom: '.25rem' }}>
                      Optimal Cash Breakdown (COP Denominations):
                    </div>
                    {activeInvoice.cashBreakdown.map((b) => (
                      <div
                        key={b.denomination}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '.08rem 0' }}
                      >
                        <span>
                          {b.count} × {formatMoney(b.denomination)} ({b.kind})
                        </span>
                        <span>{formatMoney(b.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </Card>
          }
          right={
            <Card>
              <h3 style={{ marginTop: 0 }}>Invoice actions</h3>
              <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.85rem' }}>
                Physical receipt (non-electronic)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                <Button variant="primary" onClick={handlePrintInvoice}>
                  Print invoice
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setActiveInvoice(null);
                    setSelectedOrder(null);
                    setStep('list');
                  }}
                >
                  Back to orders
                </Button>
              </div>
            </Card>
          }
        />
      )}
    </div>
  );
}

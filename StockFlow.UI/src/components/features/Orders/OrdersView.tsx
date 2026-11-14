import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { Badge } from '../../common/Badge/Badge';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { TicketSummary } from '../../common/TicketSummary/TicketSummary';
import { StepBar } from '../../common/StepBar/StepBar';
import { useToast } from '../../common/Toast/ToastContext';
import { useAuth } from '../Auth/AuthContext';
import { inventoryApi } from '../Inventory/inventory.api';
import type { LocationInventoryItem } from '../Inventory/inventory.api';
import { tablesApi } from '../Tables/tables.api';
import type { RestaurantTable } from '../Tables/tables.api';
import { ordersApi } from './orders.api';
import type { ActiveOrderResponse } from './orders.api';

interface DraftOrderItem {
  productId: number;
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

const ORDER_STEPS = [
  'Select Free Table',
  'Consult Inventory',
  'Register Products',
  'Save Order',
];

export default function OrdersView() {
  const { activeLocation } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTableId = Number(searchParams.get('tableId')) || 0;

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number>(initialTableId);
  const [inventory, setInventory] = useState<LocationInventoryItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderResponse | null>(null);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const formatMoney = (n: number) => `$${n.toLocaleString('es-CO')}`;

  const loadLocationData = async () => {
    if (!activeLocation) return;
    try {
      const [tbls, inv] = await Promise.all([
        tablesApi.getByLocation(activeLocation.id),
        inventoryApi.getByLocation(activeLocation.id),
      ]);
      setTables(tbls);
      setInventory(inv);

      if (selectedTableId !== 0 && !tbls.some((t) => t.id === selectedTableId)) {
        setSelectedTableId(0);
        setSearchParams({}, { replace: true });
      }
    } catch {
      showToast('Error loading location inventory and tables.');
    }
  };

  const loadActiveOrder = async (tableId: number) => {
    if (!tableId) {
      setActiveOrder(null);
      return;
    }
    try {
      const order = await ordersApi.getActiveByTable(tableId);
      setActiveOrder(order);
    } catch {
      setActiveOrder(null);
    }
  };

  // Cuando cambio de sede limpio el borrador y recargo mesas e inventario de esa sucursal
  useEffect(() => {
    setDraftItems([]);
    loadLocationData();
  }, [activeLocation?.id]);

  // Al seleccionar otra mesa consulto si ya tiene un pedido abierto
  useEffect(() => {
    setDraftItems([]);
    if (selectedTableId > 0) {
      loadActiveOrder(selectedTableId);
    } else {
      setActiveOrder(null);
    }
  }, [selectedTableId]);

  const handleSelectTable = (tableId: number) => {
    setSelectedTableId(tableId);
    if (tableId > 0) {
      setSearchParams({ tableId: String(tableId) });
    } else {
      setSearchParams({});
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const isTableAvailable = selectedTable?.status === 'Available';

  const handleAddProduct = (item: LocationInventoryItem) => {
    if (!selectedTable) {
      showToast('Step 1 mandatory: Please select an Available table first.');
      return;
    }
    if (!isTableAvailable) {
      showToast('New orders can only be started on an Available (Free) table.');
      return;
    }
    if (item.availableQuantity <= 0) {
      showToast('This product is out of stock in the current location.');
      return;
    }

    setDraftItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        if (existing.quantity + 1 > item.availableQuantity) {
          showToast(`Only ${item.availableQuantity} units of ${item.productName} available in stock.`);
          return prev;
        }
        return prev.map((p) =>
          p.productId === item.productId ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          code: item.productCode,
          name: item.productName,
          unitPrice: item.salePrice,
          quantity: 1,
          maxStock: item.availableQuantity,
        },
      ];
    });
  };

  const handleDecreaseDraft = (productId: number) => {
    setDraftItems((prev) =>
      prev
        .map((p) => (p.productId === productId ? { ...p, quantity: p.quantity - 1 } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const handleSaveOrder = async () => {
    if (!activeLocation) {
      showToast('Please select a location first.');
      return;
    }
    if (!selectedTableId || !selectedTable) {
      showToast('Step 1 mandatory: Please select an Available table first.');
      return;
    }
    if (!isTableAvailable) {
      showToast('Orders can only be started on an Available (Free) table.');
      return;
    }
    if (draftItems.length === 0) {
      showToast('Step 3 mandatory: Please add at least one product to the order.');
      return;
    }

    setSaving(true);
    try {
      const res = await ordersApi.saveOrder({
        locationId: activeLocation.id,
        tableId: selectedTableId,
        items: draftItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      showToast(res.message);
      setDraftItems([]);
      await Promise.all([loadLocationData(), loadActiveOrder(selectedTableId)]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving order.');
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(
    (i) =>
      i.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productTypeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculo en qué paso del flujo obligatorio de 4 pasos se encuentra el mesero
  const currentStep = !selectedTable || !isTableAvailable
    ? 1
    : draftItems.length === 0
    ? 2
    : saving
    ? 4
    : 3;

  // Formateo los productos en borrador y los ya guardados para mostrarlos en el resumen del ticket
  const draftTicketItems = draftItems.map((d) => ({
    id: d.productId,
    name: `${d.quantity}x ${d.name}`,
    price: d.quantity * d.unitPrice,
  }));

  const savedTicketItems =
    activeOrder?.details.map((d) => ({
      id: d.id,
      name: `${d.quantity}x ${d.productName}`,
      price: d.subtotal,
    })) ?? [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <h2 style={{ margin: 0 }}>
          Order Taking Flow — {activeLocation?.name ?? 'No location'}
        </h2>
        <Button variant="ghost" onClick={() => navigate('/tables')}>
          ← Step 1: Table Grid
        </Button>
      </div>
      <p className="sub">
        Follow the 4 mandatory steps: 1. Select Free Table → 2. Consult Location Inventory → 3. Register Order Items → 4. Save Order.
      </p>

      <StepBar current={currentStep} labels={ORDER_STEPS} />

      <SplitLayout
        left={
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0 }}>Step 2: Available Location Inventory</h3>
                <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>
                  Showing real-time stock exclusively for {activeLocation?.name}
                </span>
              </div>
              <div style={{ width: '240px' }}>
                <FormField
                  label=""
                  placeholder="Search product or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {!selectedTable && (
              <p style={{ color: 'var(--orange)', fontSize: '.85rem', marginBottom: '1rem' }}>
                Select an Available (Free) table on the right panel (or from the Table Grid) before adding products.
              </p>
            )}

            <DataTable
              columns={['Code', 'Product', 'Type', 'Price', 'Available', '']}
              rows={filteredInventory}
              ariaLabel="Location available inventory"
              renderRow={(item) => {
                const inDraft = draftItems.find((d) => d.productId === item.productId)?.quantity ?? 0;
                const remaining = item.availableQuantity - inDraft;
                const canAdd = Boolean(selectedTable && isTableAvailable && remaining > 0);
                return (
                  <tr key={item.productId}>
                    <td>{item.productCode}</td>
                    <td>{item.productName}</td>
                    <td>{item.productTypeName}</td>
                    <td>{formatMoney(item.salePrice)}</td>
                    <td>
                      <Badge
                        status={remaining > 0 ? 'available' : 'inactive'}
                        label={remaining > 0 ? `${remaining} in stock` : 'Out of stock'}
                      />
                    </td>
                    <td>
                      <Button
                        variant="mini"
                        disabled={!canAdd}
                        onClick={() => handleAddProduct(item)}
                      >
                        + Add
                      </Button>
                    </td>
                  </tr>
                );
              }}
            />
          </Card>
        }
        right={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Card>
              <FormField
                as="select"
                label="Step 1: Operating Table"
                value={selectedTableId === 0 ? '' : String(selectedTableId)}
                onChange={(e) => handleSelectTable(Number(e.target.value))}
                options={[
                  { value: '', label: 'Select an Available table' },
                  ...tables.map((t) => ({
                    value: String(t.id),
                    label: `Table #${t.number} (${t.status === 'Available' ? 'Available / Free' : 'Occupied'})`,
                  })),
                ]}
              />

              {selectedTable && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '.85rem', color: 'var(--dim)' }}>Current Table Status:</span>
                  <Badge
                    status={isTableAvailable ? 'available' : 'occupied'}
                    label={isTableAvailable ? 'Available (Free)' : 'Occupied'}
                  />
                </div>
              )}

              {selectedTable && !isTableAvailable ? (
                <p style={{ color: 'var(--orange)', fontSize: '.83rem', marginBottom: '.5rem' }}>
                  Table #{selectedTable.number} is currently <strong>Occupied</strong> with an Open order. New orders can only be started on an <strong>Available</strong> table.
                </p>
              ) : (
                <>
                  <h3 style={{ marginTop: '.5rem', marginBottom: '.5rem' }}>Step 3: Order Registration (Open)</h3>
                  {draftItems.length > 0 && (
                    <div style={{ marginBottom: '.75rem', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                      {draftItems.map((item) => (
                        <div
                          key={item.productId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--panel2)',
                            padding: '.45rem .65rem',
                            borderRadius: '8px',
                            fontSize: '.85rem',
                          }}
                        >
                          <span>
                            <strong>{item.quantity}x</strong> {item.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Button variant="mini" onClick={() => handleDecreaseDraft(item.productId)}>
                              -
                            </Button>
                            <Button
                              variant="mini"
                              onClick={() => {
                                const invItem = inventory.find((i) => i.productId === item.productId);
                                if (invItem) handleAddProduct(invItem);
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <TicketSummary
                    items={draftTicketItems}
                    formatMoney={formatMoney}
                    emptyLabel="No products added to the order yet."
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <Button
                      onClick={handleSaveOrder}
                      disabled={saving || !isTableAvailable || draftItems.length === 0}
                    >
                      {saving ? 'Saving...' : 'Step 4: Save Order'}
                    </Button>
                    {draftItems.length > 0 && (
                      <Button variant="ghost" onClick={() => setDraftItems([])}>
                        Clear
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card>

            {activeOrder && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                  <h3 style={{ margin: 0 }}>Saved Order (#{activeOrder.id})</h3>
                  <Badge status="open" label="Open Order" />
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--dim)', marginTop: 0, marginBottom: '.75rem' }}>
                  Table #{activeOrder.tableNumber} · Remains Open until Cashier checkout
                </p>
                <TicketSummary
                  items={savedTicketItems}
                  formatMoney={formatMoney}
                  emptyLabel="No saved items."
                />
              </Card>
            )}
          </div>
        }
      />
    </>
  );
}

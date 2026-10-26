import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { Badge } from '../../common/Badge/Badge';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { TicketSummary } from '../../common/TicketSummary/TicketSummary';
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

      if (selectedTableId === 0 && tbls.length > 0) {
        const firstId = tbls[0].id;
        setSelectedTableId(firstId);
        setSearchParams({ tableId: String(firstId) }, { replace: true });
      } else if (selectedTableId !== 0 && !tbls.some((t) => t.id === selectedTableId)) {
        const fallbackId = tbls[0]?.id ?? 0;
        setSelectedTableId(fallbackId);
        if (fallbackId) setSearchParams({ tableId: String(fallbackId) }, { replace: true });
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

  // Al cambiar de sede, limpiamos el borrador y recargamos datos
  useEffect(() => {
    setDraftItems([]);
    loadLocationData();
  }, [activeLocation?.id]);

  // Al cambiar de mesa, cargamos la orden activa de esa mesa
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
    setSearchParams({ tableId: String(tableId) });
  };

  const handleAddProduct = (item: LocationInventoryItem) => {
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
    if (!selectedTableId) {
      showToast('Please select a table first.');
      return;
    }
    if (draftItems.length === 0) {
      showToast('Please add at least one product to the order.');
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

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  const filteredInventory = inventory.filter(
    (i) =>
      i.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productTypeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ítems que se pasan a tu componente TicketSummary
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>
          Take Order — {activeLocation?.name ?? 'No location'}
        </h2>
        <Button variant="ghost" onClick={() => navigate('/tables')}>
          ← Back to Tables
        </Button>
      </div>

      <SplitLayout
        left={
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Available Inventory</h3>
              <div style={{ width: '240px' }}>
                <FormField
                  label=""
                  placeholder="Search product or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <DataTable
              columns={['Code', 'Product', 'Type', 'Price', 'Available', '']}
              rows={filteredInventory}
              renderRow={(item) => {
                const inDraft = draftItems.find((d) => d.productId === item.productId)?.quantity ?? 0;
                const remaining = item.availableQuantity - inDraft;
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
                label="Operating Table"
                value={selectedTableId === 0 ? '' : String(selectedTableId)}
                onChange={(e) => handleSelectTable(Number(e.target.value))}
                options={[
                  { value: '', label: 'Select a table' },
                  ...tables.map((t) => ({
                    value: String(t.id),
                    label: `Table #${t.number} (${t.status})`,
                  })),
                ]}
              />

              {selectedTable && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '.85rem', color: 'var(--dim)' }}>Current Table Status:</span>
                  <Badge
                    status={selectedTable.status === 'Available' ? 'available' : 'occupied'}
                    label={selectedTable.status}
                  />
                </div>
              )}

              <h3 style={{ marginTop: '.5rem', marginBottom: '.5rem' }}>New Order Round</h3>
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
                emptyLabel="No products added to this round yet."
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <Button onClick={handleSaveOrder}>
                  {saving ? 'Saving...' : 'Save Order'}
                </Button>
                {draftItems.length > 0 && (
                  <Button variant="ghost" onClick={() => setDraftItems([])}>
                    Clear
                  </Button>
                )}
              </div>
            </Card>

            {activeOrder && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                  <h3 style={{ margin: 0 }}>Saved Table Ticket (#{activeOrder.id})</h3>
                  <Badge status="open" label="Open Order" />
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--dim)', marginTop: 0, marginBottom: '.75rem' }}>
                  Already sent to bar for Table #{activeOrder.tableNumber}
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
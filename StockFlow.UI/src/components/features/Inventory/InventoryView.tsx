import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { Badge } from '../../common/Badge/Badge';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { useAuth } from '../Auth/AuthContext';
import { inventoryApi } from './inventory.api';
import type { LocationInventoryItem } from './inventory.api';

export default function InventoryView() {
  const { activeLocation } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<LocationInventoryItem[]>([]);
  const [countedByProduct, setCountedByProduct] = useState<Record<number, number>>({});
  const [submittingCheck, setSubmittingCheck] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>('');

  const loadInventory = async () => {
    if (!activeLocation) return;
    try {
      const data = await inventoryApi.getByLocation(activeLocation.id);
      setItems(data);
      // Inicializo el conteo del chequeo completo con las existencias actuales de la sede
      const initialCounts: Record<number, number> = {};
      data.forEach((item) => {
        initialCounts[item.productId] = item.availableQuantity;
      });
      setCountedByProduct(initialCounts);
    } catch {
      showToast('Error loading location inventory.');
    }
  };

  useEffect(() => {
    loadInventory();
  }, [activeLocation?.id]);

  const handleCountChange = (productId: number, rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '');
    const parsed = clean === '' ? 0 : Number(clean);
    setCountedByProduct((prev) => ({
      ...prev,
      [productId]: parsed,
    }));
  };

  // Guardo el chequeo completo de todos los productos de la sede en una sola operación (HU-15)
  const handleSaveFullCheck = async () => {
    if (!activeLocation) {
      showToast('Please select an active location first.');
      return;
    }
    if (items.length === 0) {
      showToast('No products registered in the catalog yet.');
      return;
    }

    setSubmittingCheck(true);
    try {
      const payloadItems = items.map((item) => ({
        productId: item.productId,
        countedQuantity: countedByProduct[item.productId] ?? item.availableQuantity,
      }));

      const res = await inventoryApi.registerFullCheck({
        locationId: activeLocation.id,
        items: payloadItems,
      });

      showToast(res.message);
      await loadInventory();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving full inventory check.');
    } finally {
      setSubmittingCheck(false);
    }
  };

  const handleRegisterEntry = async () => {
    if (!activeLocation) {
      showToast('Please select an active location first.');
      return;
    }
    if (selectedProductId === 0) {
      showToast('Please select a product.');
      return;
    }
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      showToast('Please enter a valid positive whole quantity.');
      return;
    }

    try {
      const res = await inventoryApi.registerEntry({
        locationId: activeLocation.id,
        productId: selectedProductId,
        quantity: parsedQty,
      });
      showToast(res.message);
      setSelectedProductId(0);
      setQuantity('');
      loadInventory();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating inventory.');
    }
  };

  const modifiedCount = items.filter(
    (item) => (countedByProduct[item.productId] ?? item.availableQuantity) !== item.availableQuantity
  ).length;

  return (
    <>
      <h2>Inventory Management — {activeLocation?.name ?? 'No location selected'}</h2>
      <p className="sub">
        Perform a complete physical inventory check for {activeLocation?.name ?? 'this location'}. Each branch maintains independent stock.
      </p>

      <SplitLayout
        left={
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem', flexWrap: 'wrap', gap: '.5rem' }}>
              <h3 style={{ margin: 0 }}>Full Inventory Check Sheet</h3>
              <Badge
                status={modifiedCount > 0 ? 'open' : 'available'}
                label={modifiedCount > 0 ? `${modifiedCount} count(s) adjusted` : 'All counts synced'}
              />
            </div>

            <DataTable
              columns={['Code', 'Product', 'Type', 'Sale Price', 'System Stock', 'Counted Stock', 'Status']}
              rows={items}
              ariaLabel="Location inventory check sheet"
              renderRow={(item) => {
                const counted = countedByProduct[item.productId] ?? item.availableQuantity;
                const diff = counted - item.availableQuantity;
                return (
                  <tr key={item.productId}>
                    <td>{item.productCode}</td>
                    <td>{item.productName}</td>
                    <td>{item.productTypeName}</td>
                    <td>${item.salePrice.toLocaleString('es-CO')}</td>
                    <td style={{ fontWeight: 700 }}>{item.availableQuantity}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Counted stock for ${item.productName}`}
                        value={counted}
                        onChange={(e) => handleCountChange(item.productId, e.target.value)}
                        style={{
                          width: '86px',
                          padding: '.35rem .5rem',
                          background: 'var(--panel2)',
                          border: `1px solid ${diff !== 0 ? 'var(--cyan)' : 'var(--line2)'}`,
                          borderRadius: '8px',
                          color: 'var(--ink)',
                          fontWeight: 600,
                        }}
                      />
                    </td>
                    <td>
                      <Badge
                        status={counted > 0 ? 'available' : 'inactive'}
                        label={counted > 0 ? 'In stock' : 'Out of stock'}
                      />
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
              <h3>Complete Inventory Check</h3>
              <p style={{ color: 'var(--dim)', fontSize: '.82rem', marginTop: '-.3rem', marginBottom: '1rem' }}>
                Confirm the physical count of all <strong>{items.length}</strong> catalog products for <strong>{activeLocation?.name ?? 'current location'}</strong>.
              </p>
              <div style={{ fontSize: '.85rem', marginBottom: '1rem', color: 'var(--muted)' }}>
                <div>Products in check: <strong>{items.length}</strong></div>
                <div>Adjusted items: <strong>{modifiedCount}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button onClick={handleSaveFullCheck} disabled={submittingCheck}>
                  {submittingCheck ? 'Saving check…' : 'Submit Full Check'}
                </Button>
                {modifiedCount > 0 && (
                  <Button variant="ghost" onClick={loadInventory}>
                    Reset Counts
                  </Button>
                )}
              </div>
            </Card>

            <Card>
              <h3>Quick Restock (+ Units)</h3>
              <p style={{ color: 'var(--dim)', fontSize: '.82rem', marginTop: '-.3rem', marginBottom: '1rem' }}>
                Add incoming units to a specific product in <strong>{activeLocation?.name ?? 'current location'}</strong>.
              </p>
              <FormField
                as="select"
                label="Product"
                value={selectedProductId === 0 ? '' : String(selectedProductId)}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                options={[
                  { value: '', label: 'Select a product' },
                  ...items.map((i) => ({
                    value: String(i.productId),
                    label: `${i.productCode} - ${i.productName} (Current: ${i.availableQuantity})`,
                  })),
                ]}
              />
              <FormField
                label="Quantity to add"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="ghost" onClick={handleRegisterEntry}>
                  + Add Stock
                </Button>
                {selectedProductId !== 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedProductId(0);
                      setQuantity('');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Card>
          </div>
        }
      />
    </>
  );
}

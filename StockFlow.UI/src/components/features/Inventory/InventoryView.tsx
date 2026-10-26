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
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<string>('');

  const loadInventory = async () => {
    if (!activeLocation) return;
    try {
      const data = await inventoryApi.getByLocation(activeLocation.id);
      setItems(data);
    } catch {
      showToast('Error loading location inventory.');
    }
  };

  useEffect(() => {
    loadInventory();
  }, [activeLocation?.id]);

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

  return (
    <>
      <h2>Inventory — {activeLocation?.name ?? 'No location selected'}</h2>
      <SplitLayout
        left={
          <Card>
            <DataTable
              columns={['Code', 'Product', 'Type', 'Sale Price', 'Stock', 'Status']}
              rows={items}
              renderRow={(item) => (
                <tr key={item.productId}>
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td>{item.productTypeName}</td>
                  <td>${item.salePrice.toLocaleString('es-CO')}</td>
                  <td style={{ fontWeight: 700 }}>{item.availableQuantity}</td>
                  <td>
                    <Badge
                      status={item.availableQuantity > 0 ? 'available' : 'inactive'}
                      label={item.availableQuantity > 0 ? 'In stock' : 'Out of stock'}
                    />
                  </td>
                  <td>
                    <Button
                      variant="mini"
                      onClick={() => setSelectedProductId(item.productId)}
                    >
                      + Stock
                    </Button>
                  </td>
                </tr>
              )}
            />
          </Card>
        }
        right={
          <Card>
            <h3>Stock entry</h3>
            <p style={{ color: 'var(--dim)', fontSize: '.82rem', marginTop: '-.3rem', marginBottom: '1rem' }}>
              Add incoming units to <strong>{activeLocation?.name ?? 'current location'}</strong>.
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
              <Button onClick={handleRegisterEntry}>Register entry</Button>
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
        }
      />
    </>
  );
}
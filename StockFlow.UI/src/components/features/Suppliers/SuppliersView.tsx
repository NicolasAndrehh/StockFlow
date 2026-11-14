import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { suppliersApi } from './suppliers.api';
import type { Supplier, SupplierPayload } from './suppliers.api';
import { productsApi } from '../Products/products.api';
import type { Product } from '../Products/products.api';

const emptyForm: SupplierPayload = { name: '' };

export default function SupplierView() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierPayload>(emptyForm);

  const loadData = async () => {
    try {
      const [s, p] = await Promise.all([suppliersApi.getAll(), productsApi.getAll()]);
      setSuppliers(s);
      setProducts(p);
    } catch {
      showToast('Error loading suppliers.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ id: s.id, name: s.name });
  };

  // Calculo cuántos productos del catálogo están asociados a cada proveedor
  const countLinkedProducts = (supplierId: number) =>
    products.filter((p) => p.supplierId === supplierId).length;

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Please enter a supplier name.');
      return;
    }

    try {
      if (editingId) {
        const res = await suppliersApi.update(editingId, form);
        showToast(res.message);
      } else {
        const res = await suppliersApi.create(form);
        showToast(res.message);
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving supplier.');
    }
  };

  return (
    <>
      <h2>Suppliers</h2>
      <p className="sub">A product can only be linked to a registered supplier.</p>
      <SplitLayout
        left={
          <Card>
            <DataTable
              columns={['Supplier', 'Linked products', '']}
              rows={suppliers}
              ariaLabel="Registered suppliers"
              renderRow={(s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{countLinkedProducts(s.id)}</td>
                  <td>
                    <Button variant="mini" onClick={() => handleEdit(s)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              )}
            />
            <Button variant="ghost" onClick={resetForm} style={{ marginTop: '1rem' }}>
              + New Supplier
            </Button>
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit supplier' : 'New supplier'}</h3>
            <FormField
              label="Supplier name"
              placeholder="e.g. Diageo Colombia"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>{editingId ? 'Update Supplier' : 'Save'}</Button>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </Card>
        }
      />
    </>
  );
}

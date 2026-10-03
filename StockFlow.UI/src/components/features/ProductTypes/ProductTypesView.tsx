import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { productTypesApi } from './productTypes.api';
import type { ProductType, ProductTypePayload } from './productTypes.api';

const emptyForm: ProductTypePayload = { name: '' };

export default function ProductTypesView() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductTypePayload>(emptyForm);

  const loadData = async () => {
    try {
      const data = await productTypesApi.getAll();
      setTypes(data);
    } catch (error) {
      showToast('Error al cargar tipos de producto');
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (t: ProductType) => {
    setEditingId(t.id);
    setForm({ id: t.id, name: t.name });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const res = await productTypesApi.update(editingId, form);
        showToast(res.message);
      } else {
        const res = await productTypesApi.create(form);
        showToast(res.message);
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving type.');
    }
  };

  return (
    <>
      <h2>Product Types Management</h2>
      <SplitLayout
        left={
          <Card>
            <h3>Product Types</h3>
            <DataTable
              columns={['Type', 'Associated products']}
              rows={types}
              renderRow={(t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.associatedProducts}</td>
                  <td><Button variant="mini" onClick={() => handleEdit(t)}>Edit</Button></td>
                </tr>
              )}
            />
            <Button variant="ghost" onClick={resetForm} style={{ marginTop: '1rem' }}>
              + New Type
            </Button>
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit Type' : 'New Type'}</h3>
            <FormField
              label="Type name" placeholder="Ej. Beer, Wine, Soft Drink" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>{editingId ? 'Update Type' : 'Save Type'}</Button>
              {editingId && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </Card>
        }
      />
    </>
  );
}
import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card.tsx';
import { DataTable } from '../../common/DataTable/DataTable.tsx';
import { FormField } from '../../common/FormField/FormField.tsx';
import { Button } from '../../common/Button/Button.tsx';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout.tsx';
import { useToast } from '../../common/Toast/ToastContext.tsx';
import { productsApi } from './products.api.ts';
import type { Product, ProductPayload } from './products.api.ts';
import { productTypesApi } from '../ProductTypes/productTypes.api.ts';
import type { ProductType } from '../ProductTypes/productTypes.api.ts';
import { suppliersApi } from '../Suppliers/suppliers.api.ts';
import type { Supplier } from '../Suppliers/suppliers.api.ts';

const emptyForm: ProductPayload = {
  code: '', name: '', purchasePrice: 0, salePrice: 0, productTypeId: 0, supplierId: 0,
};

export default function ProductView() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductPayload>(emptyForm);

  const loadData = async () => {
    try {
      const [p, t, s] = await Promise.all([
        productsApi.getAll(), productTypesApi.getAll(), suppliersApi.getAll(),
      ]);
      setProducts(p); setTypes(t); setSuppliers(s);
    } catch (error) {
      showToast('Error loading products');
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      id: p.id,
      code: p.code,
      name: p.name,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      productTypeId: p.productTypeId,
      supplierId: p.supplierId,
    });
  };

  const handleSave = async () => {
    if (form.productTypeId === 0 || form.supplierId === 0) {
      showToast('Please select a product type and a supplier.');
      return;
    }
    try {
      if (editingId) {
        const res = await productsApi.update(editingId, form);
        showToast(res.message);
      } else {
        const res = await productsApi.create(form);
        showToast(res.message);
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving product.');
    }
  };

  return (
    <>
      <h2>Products</h2>
      <SplitLayout
        left={
          <Card>
            <DataTable
              columns={['Code', 'Name', 'Type', 'Supplier', 'Price']}
              rows={products}
              renderRow={(p) => (
                <tr key={p.id}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.productType?.name ?? '—'}</td>
                  <td>{p.supplier?.name ?? '—'}</td>
                  <td>${p.salePrice.toLocaleString('es-CO')}</td>
                  <td><Button variant="mini" onClick={() => handleEdit(p)}>Edit</Button></td>
                </tr>
              )}
            />
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit product' : 'New product'}</h3>
            <FormField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <FormField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormField
              as="select" label="Product type"
              value={form.productTypeId === 0 ? '' : String(form.productTypeId)}
              onChange={(e) => setForm({ ...form, productTypeId: Number(e.target.value) })}
              options={[
                { value: '', label: 'Select a product type' },
                ...types.map((t) => ({ value: String(t.id), label: t.name })),
              ]}
            />
            <FormField
              as="select" label="Supplier"
              value={form.supplierId === 0 ? '' : String(form.supplierId)}
              onChange={(e) => setForm({ ...form, supplierId: Number(e.target.value) })}
              options={[
                { value: '', label: 'Select a supplier' },
                ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
            <FormField
              as="currency" label="Purchase price"
              value={form.purchasePrice}
              onChange={(value) => setForm({ ...form, purchasePrice: value })}
            />
            <FormField
              as="currency" label="Sale price"
              value={form.salePrice}
              onChange={(value) => setForm({ ...form, salePrice: value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>{editingId ? 'Update product' : 'Save'}</Button>
              {editingId && <Button variant="ghost"     onClick={resetForm}>Cancel</Button>}
            </div>
          </Card>
        }
      />
    </> 
  );
}
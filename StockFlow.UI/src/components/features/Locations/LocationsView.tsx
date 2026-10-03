import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { locationsApi } from './locations.api';
import type { Location, LocationPayload } from './locations.api';

const emptyForm: LocationPayload = { code: '', name: '', address: '' };

export default function LocationsView() {
  const { showToast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationPayload>(emptyForm);

  const loadData = async () => {
    try {
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch (error) {
      showToast('Error al cargar sedes');
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({ id: loc.id, code: loc.code, name: loc.name, address: loc.address });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const res = await locationsApi.update(editingId, form);
        showToast(res.message);
      } else {
        const res = await locationsApi.create(form);
        showToast(res.message);
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving location.');
    }
  };

  return (
    <>
      <h2>Location Management</h2>
      <SplitLayout
        left={
          <Card>
            <h3>Registered Locations</h3>
            <DataTable
              columns={['Code', 'Name', 'Address']}
              rows={locations}
              renderRow={(loc) => (
                <tr key={loc.id}>
                  <td>{loc.code}</td>
                  <td>{loc.name}</td>
                  <td>{loc.address}</td>
                  <td><Button variant="mini" onClick={() => handleEdit(loc)}>Edit</Button></td>
                </tr>
              )}
            />
            <Button variant="ghost" onClick={resetForm} style={{ marginTop: '1rem' }}>
              + New Location
            </Button>
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit Location' : 'New Location'}</h3>
            <FormField
              label="Code (unique)" placeholder="S04" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <FormField
              label="Name" placeholder="Uptown Branch" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FormField
              label="Address" placeholder="123 Main St" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>{editingId ? 'Update Location' : 'Save Location'}</Button>
              {editingId && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </Card>
        }
      />
    </>
  );
}
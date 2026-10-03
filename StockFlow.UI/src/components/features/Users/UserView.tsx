import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { usersApi, type User, type UserPayload } from './users.api';
import { locationsApi, type Location } from '../Locations/locations.api';

const ROLES = ['Administrator', 'Cashier', 'Waiter'];

const emptyForm: UserPayload = {
  code: '', name: '', role: 'Cashier', locationId: undefined, status: true, password: '',
};

export default function UserView() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserPayload>(emptyForm);

  const loadData = async () => {
    try {
      const [u, l] = await Promise.all([usersApi.getAll(), locationsApi.getAll()]);
      setUsers(u);
      setLocations(l);
    } catch (error) {
      showToast('Error loading users');
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      code: u.code, name: u.name, role: u.role,
      locationId: u.locationId ?? undefined, status: u.status, password: '',
    });
  };

  const isAdmin = form.role === 'Administrator';

  const handleSave = async () => {
    try {
      if (editingId) {
        const res = await usersApi.update(editingId, { ...form, id: editingId });
        showToast(res.message);
      } else {
        const res = await usersApi.create(form);
        showToast(res.message);
      }
      resetForm();
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error saving user.');
    }
  };

  return (
    <>
      <h2>Users</h2>
      <SplitLayout
        left={
          <Card>
            <DataTable
              columns={['Code', 'Name', 'Role', 'Location']}
              rows={users}
              renderRow={(u) => (
                <tr key={u.id}>
                  <td>{u.code}</td><td>{u.name}</td><td>{u.role}</td>
                  <td>{u.location?.name ?? '—'}</td>
                  <td><Button variant="mini" onClick={() => handleEdit(u)}>Edit</Button></td>
                </tr>
              )}
            />
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit user' : 'New user'}</h3>
            <FormField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <FormField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormField
              label="Password" type="password" value={form.password}
              placeholder={editingId ? 'Leave blank to keep current password' : ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <FormField
              as="select" label="Role" value={form.role}
              onChange={(e) => setForm({
                ...form,
                role: e.target.value,
                locationId: e.target.value === 'Administrator' ? undefined : form.locationId,
              })}
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            {!isAdmin && (
              <FormField
                as="select" label="Location"
                value={String(form.locationId ?? '')}
                onChange={(e) => setForm({ ...form, locationId: Number(e.target.value) })}
                options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
              />
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>Save</Button>
              {editingId && <Button variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </Card>
        }
      />
    </>
  );
}
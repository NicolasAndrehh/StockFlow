import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { Badge } from '../../common/Badge/Badge';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { usersApi, type User, type UserPayload } from './users.api';
import { locationsApi, type Location } from '../Locations/locations.api';

const ROLES = ['Administrator', 'Cashier', 'Waiter'];

const emptyForm: UserPayload = {
  code: '',
  name: '',
  role: 'Cashier',
  locationId: undefined,
  status: true,
  password: '',
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
    } catch {
      showToast('Error loading users.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      code: u.code,
      name: u.name,
      role: u.role,
      locationId: u.locationId ?? undefined,
      status: u.status,
      password: '',
    });
  };

  // Permito activar o desactivar rápidamente un usuario desde la tabla (HU-01)
  const handleToggleUserStatus = async (u: User) => {
    try {
      const res = await usersApi.update(u.id, {
        id: u.id,
        code: u.code,
        name: u.name,
        role: u.role,
        locationId: u.locationId ?? undefined,
        status: !u.status,
      });
      showToast(res.message);
      loadData();
      if (editingId === u.id) {
        setForm((prev) => ({ ...prev, status: !u.status }));
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating user status.');
    }
  };

  const isAdmin = form.role === 'Administrator';

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Please enter both user code and name.');
      return;
    }

    if (!editingId && (!form.password || !form.password.trim())) {
      showToast('Please enter a password for the new user.');
      return;
    }

    if (!isAdmin && !form.locationId) {
      showToast('Non-Administrator users must be assigned to a single location.');
      return;
    }

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
      <h2>Users Management</h2>
      <p className="sub">Every user, except the Administrator, must be assigned to a single location.</p>
      <SplitLayout
        left={
          <Card>
            <DataTable
              columns={['Code', 'Name', 'Role', 'Location', 'Status', '']}
              rows={users}
              ariaLabel="System users"
              renderRow={(u) => (
                <tr key={u.id}>
                  <td>{u.code}</td>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>{u.location?.name ?? 'Global (All)'}</td>
                  <td>
                    <Badge
                      status={u.status ? 'active' : 'inactive'}
                      label={u.status ? 'Active' : 'Inactive'}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="mini" onClick={() => handleEdit(u)}>
                        Edit
                      </Button>
                      <Button variant="mini" onClick={() => handleToggleUserStatus(u)}>
                        {u.status ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            />
            <Button variant="ghost" onClick={resetForm} style={{ marginTop: '1rem' }}>
              + New User
            </Button>
          </Card>
        }
        right={
          <Card>
            <h3>{editingId ? 'Edit user' : 'New user'}</h3>
            <FormField
              label="Code"
              placeholder="e.g. CSH04"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <FormField
              label="Name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FormField
              label="Password"
              type="password"
              value={form.password}
              placeholder={editingId ? 'Leave blank to keep current password' : 'Enter password'}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <FormField
              as="select"
              label="Role"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                  locationId: e.target.value === 'Administrator' ? undefined : form.locationId,
                })
              }
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            {!isAdmin && (
              <FormField
                as="select"
                label="Assigned Location"
                value={form.locationId ? String(form.locationId) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    locationId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                options={[
                  { value: '', label: 'Select a location' },
                  ...locations.map((l) => ({ value: String(l.id), label: l.name })),
                ]}
              />
            )}
            <FormField
              as="select"
              label="Account Status"
              value={form.status ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, status: e.target.value === 'active' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleSave}>{editingId ? 'Update User' : 'Save User'}</Button>
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

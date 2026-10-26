import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../common/Card/Card';
import { Badge } from '../../common/Badge/Badge';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { useToast } from '../../common/Toast/ToastContext';
import { useAuth } from '../Auth/AuthContext';
import { tablesApi } from './tables.api';
import type { RestaurantTable } from './tables.api';

export default function TablesView() {
  const { activeLocation, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const loadTables = async () => {
    if (!activeLocation) return;
    try {
      const data = await tablesApi.getByLocation(activeLocation.id);
      setTables(data);
      if (selectedTable) {
        const updated = data.find((t) => t.id === selectedTable.id) ?? null;
        setSelectedTable(updated);
      }
    } catch {
      showToast('Error loading tables for this location.');
    }
  };

  useEffect(() => {
    setSelectedTable(null);
    loadTables();
  }, [activeLocation?.id]);

  const handleToggleStatus = async (table: RestaurantTable) => {
    const nextStatus = table.status === 'Available' ? 'Occupied' : 'Available';
    try {
      const res = await tablesApi.updateStatus(table.id, nextStatus);
      showToast(res.message);
      loadTables();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating table status.');
    }
  };

  const handleAddTable = async () => {
    if (!activeLocation) return;
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    try {
      const res = await tablesApi.create(activeLocation.id, nextNumber);
      showToast(res.message);
      loadTables();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error creating table.');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Tables — {activeLocation?.name ?? 'No location'}</h2>
        {user?.role === 'Administrator' && (
          <Button variant="mini" onClick={handleAddTable}>+ Add Table</Button>
        )}
      </div>

      <SplitLayout
        left={
          <Card>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '.85rem',
              }}
            >
              {tables.map((t) => {
                const isSelected = selectedTable?.id === t.id;
                const isAvailable = t.status === 'Available';
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    style={{
                      textAlign: 'left',
                      background: isSelected ? 'var(--blue-tint)' : 'var(--panel2)',
                      border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--line2)'}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      color: 'var(--ink)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '.45rem' }}>
                      Table #{t.number}
                    </div>
                    <Badge
                      status={isAvailable ? 'available' : 'occupied'}
                      label={t.status}
                    />
                  </button>
                );
              })}
            </div>
          </Card>
        }
        right={
          <Card>
            <h3>Table details</h3>
            {selectedTable ? (
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '.4rem' }}>
                  Table #{selectedTable.number}
                </p>
                <div style={{ marginBottom: '1.2rem' }}>
                  <Badge
                    status={selectedTable.status === 'Available' ? 'available' : 'occupied'}
                    label={selectedTable.status}
                  />
                </div>
                <p style={{ color: 'var(--dim)', fontSize: '.85rem', marginBottom: '1.2rem' }}>
                  Location: <strong>{activeLocation?.name}</strong>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Button onClick={() => navigate(`/orders?tableId=${selectedTable.id}`)}>
                    {selectedTable.status === 'Occupied' ? 'View / Add to Order' : 'Take Order'}
                  </Button>
                  <Button variant="ghost" onClick={() => handleToggleStatus(selectedTable)}>
                    {selectedTable.status === 'Available' ? 'Mark Occupied' : 'Release Table'}
                  </Button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--dim)', fontSize: '.88rem' }}>
                Select a table from the grid to take an order or manage its status.
              </p>
            )}
          </Card>
        }
      />
    </>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../common/Card/Card';
import { Badge } from '../../common/Badge/Badge';
import { Button } from '../../common/Button/Button';
import { SplitLayout } from '../../common/SplitLayout/SplitLayout';
import { StepBar } from '../../common/StepBar/StepBar';
import { useToast } from '../../common/Toast/ToastContext';
import { useAuth } from '../Auth/AuthContext';
import { tablesApi } from './tables.api';
import type { RestaurantTable } from './tables.api';

const ORDER_STEPS = [
  'Select Free Table',
  'Consult Inventory',
  'Register Products',
  'Save Order',
];

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

  // Solo permito iniciar el flujo de pedido si la mesa seleccionada está libre (HU-08)
  const handleStartOrder = (table: RestaurantTable) => {
    if (table.status !== 'Available') {
      showToast('Orders can only be started on an Available (Free) table.');
      return;
    }
    navigate(`/orders?tableId=${table.id}`);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <h2 style={{ margin: 0 }}>Step 1: Table Selection — {activeLocation?.name ?? 'No location'}</h2>
        {user?.role === 'Administrator' && (
          <Button variant="mini" onClick={handleAddTable}>+ Add Table</Button>
        )}
      </div>
      <p className="sub">
        Select an Available (Free) table to begin the 4-step order-taking flow.
      </p>

      <StepBar current={1} labels={ORDER_STEPS} />

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
                      label={isAvailable ? 'Available (Free)' : 'Occupied'}
                    />
                  </button>
                );
              })}
            </div>
          </Card>
        }
        right={
          <Card>
            <h3>Selected Table</h3>
            {selectedTable ? (
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '.4rem' }}>
                  Table #{selectedTable.number}
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <Badge
                    status={selectedTable.status === 'Available' ? 'available' : 'occupied'}
                    label={selectedTable.status === 'Available' ? 'Available (Free)' : 'Occupied'}
                  />
                </div>
                <p style={{ color: 'var(--dim)', fontSize: '.85rem', marginBottom: '1.2rem' }}>
                  Location: <strong>{activeLocation?.name}</strong>
                </p>

                {selectedTable.status === 'Available' ? (
                  <Button onClick={() => handleStartOrder(selectedTable)}>
                    Proceed to Step 2: Check Inventory →
                  </Button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                    <p style={{ color: 'var(--orange)', fontSize: '.84rem', margin: 0 }}>
                      This table already has an Open order and will become Available once the Cashier closes it.
                    </p>
                    <Button variant="ghost" onClick={() => navigate(`/orders?tableId=${selectedTable.id}`)}>
                      View Open Order Ticket
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--dim)', fontSize: '.88rem' }}>
                Select an Available table from the grid to start taking a new order.
              </p>
            )}
          </Card>
        }
      />
    </>
  );
}

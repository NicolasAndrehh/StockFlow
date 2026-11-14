import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../common/AuthLayout/AuthLayout';
import { SelectionCard } from '../../common/SelectionCard/SelectionCard';
import { Button } from '../../common/Button/Button';
import { useAuth } from './AuthContext';
import { locationsApi } from '../Locations/locations.api';
import type { Location } from '../Locations/locations.api';

export default function LocationPickerView() {
  const { selectLocation, selectOperatingRole } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    locationsApi.getAll().then(setLocations).catch(() => setLocations([]));
  }, []);

  // Al escoger la sede inicial, el Administrador entra por defecto a su vista general de Administración
  const handlePick = (loc: Location) => {
    selectLocation({ id: loc.id, name: loc.name });
    selectOperatingRole('Administrator');
    navigate('/products', { replace: true });
  };

  return (
    <AuthLayout>
      <h3 style={{ marginTop: 0 }}>Select working location</h3>
      <p style={{ color: 'var(--dim)', fontSize: '.85rem', marginTop: '-.5rem', marginBottom: '1rem' }}>
        Choose a base location. You will enter the general Administrator view and can switch to Cashier or Waiter anytime from the top bar.
      </p>

      {locations.map((loc) => (
        <SelectionCard
          key={loc.id}
          title={`${loc.code} · ${loc.name}`}
          description={loc.address}
          onClick={() => handlePick(loc)}
        />
      ))}

      {locations.length === 0 && (
        <Button variant="ghost" onClick={() => navigate('/locations', { replace: true })}>
          Go to Locations Catalog
        </Button>
      )}
    </AuthLayout>
  );
}

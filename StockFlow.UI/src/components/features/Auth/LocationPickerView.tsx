import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../common/AuthLayout/AuthLayout';
import { SelectionCard } from '../../common/SelectionCard/SelectionCard';
import { useAuth } from './AuthContext';
import { locationsApi } from '../Locations/locations.api';
import type { Location } from '../Locations/locations.api';

export default function LocationPickerView() {
  const { selectLocation } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    locationsApi.getAll().then(setLocations).catch(() => setLocations([]));
  }, []);

  const handlePick = (loc: Location) => {
    selectLocation({ id: loc.id, name: loc.name });
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout>
      <h3 style={{ marginTop: 0 }}>Select a location</h3>
      <p style={{ color: 'var(--dim)', fontSize: '.85rem', marginTop: '-.5rem' }}>
        Choose which location you'll operate as Administrator.
      </p>
      {locations.map((loc) => (
        <SelectionCard
          key={loc.id}
          title={loc.name}
          description={loc.address}
          onClick={() => handlePick(loc)}
        />
      ))}
    </AuthLayout>
  );
}
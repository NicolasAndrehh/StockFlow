import { useState } from 'react';
import LocationsView from './components/features/Locations/LocationsView';
import ProductTypesView from './components/features/ProductTypes/ProductTypesView';

export default function App() {
  // Vista base para pruebas rápidas de componentes aislados
  const [currentView, setCurrentView] = useState<'locations' | 'productTypes'>('productTypes');

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', padding: '20px' }}>
      <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
        <button
          onClick={() => setCurrentView('locations')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentView === 'locations' ? '#f0ad4e' : '#222',
            color: currentView === 'locations' ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Locations
        </button>
        <button
          onClick={() => setCurrentView('productTypes')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentView === 'productTypes' ? '#f0ad4e' : '#222',
            color: currentView === 'productTypes' ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Product Types
        </button>
      </nav>

      {currentView === 'locations' && <LocationsView />}
      {currentView === 'productTypes' && <ProductTypesView />}
    </div>
  );
}

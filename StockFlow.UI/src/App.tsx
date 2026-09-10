import { useState } from 'react';
import LocationsView from './views/LocationsView'; 
import ProductTypesView from './views/ProductTypesView';

export default function App() {
  // Estado para controlar qué pantalla se está mostrando
  const [currentView, setCurrentView] = useState<'locations' | 'productTypes'>('productTypes');

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', padding: '20px' }}>
      
      {/* Menú de navegación temporal */}
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
            fontWeight: 'bold'
          }}
        >
          Sedes
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
            fontWeight: 'bold'
          }}
        >
          Tipos de Producto
        </button>
      </nav>

      {/* Renderizado condicional: Muestra el componente según el estado */}
      {currentView === 'locations' && <LocationsView />}
      {currentView === 'productTypes' && <ProductTypesView />}
      
    </div>
  );
}
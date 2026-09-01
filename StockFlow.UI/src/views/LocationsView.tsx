import { useState, useEffect } from 'react';
import './LocationsView.scss';

interface Location {
  id?: number;
  codigo: string;
  nombre: string;
  direccion: string;
}

export default function LocationsView() {
  const [formData, setFormData] = useState<Location>({ codigo: '', nombre: '', direccion: '' });
  const [message, setMessage] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:5082/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5082/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Error saving location.');
        return;
      }

      setMessage('Location created successfully!');
      setFormData({ codigo: '', nombre: '', direccion: '' });
      fetchLocations();

    } catch (error) {
      setMessage('Network error. Is the backend running?');
    }
  };

  return (
    <div className="locations-view">
      <h2 className="locations-view__title">Location Management</h2>

      <div className="locations-view__layout">
        <div className="locations-view__frame">
          <div className="locations-view__frame-body">
            <h3 className="locations-view__subtitle">Registered Locations</h3>
            <table className="locations-view__table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, index) => (
                  <tr key={index}>
                    <td className="mono">{loc.codigo}</td>
                    <td className="strong">{loc.nombre}</td>
                    <td>{loc.direccion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="locations-view__panel">
          <h3 className="locations-view__panel-title">New / Edit Location</h3>
          <form onSubmit={handleSubmit} className="locations-view__form">
            <div className="locations-view__field">
              <label htmlFor="codigo">Code (unique)</label>
              <input
                id="codigo"
                type="text"
                placeholder="S04"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                required
              />
            </div>

            <div className="locations-view__field">
              <label htmlFor="nombre">Name</label>
              <input
                id="nombre"
                type="text"
                placeholder="Uptown Branch"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="locations-view__field">
              <label htmlFor="direccion">Address</label>
              <input
                id="direccion"
                type="text"
                placeholder="123 Main St"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="locations-view__btn locations-view__btn--primary">
              Save Location
            </button>

            {message && (
              <p
                className={
                  'locations-view__message ' +
                  (message.includes('successfully')
                    ? 'locations-view__message--success'
                    : 'locations-view__message--error')
                }
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

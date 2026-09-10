import { useState, useEffect } from 'react';
import './LocationsView.scss'; 

interface ProductType {
  id?: number;
  nombre: string;
}

export default function ProductTypesView() {
  const [formData, setFormData] = useState<ProductType>({ nombre: '' });
  const [message, setMessage] = useState<string>('');
  const [types, setTypes] = useState<ProductType[]>([]);

  const fetchTypes = async () => {
    try {
      const response = await fetch('http://localhost:5082/api/product-types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleEditClick = (type: ProductType) => {
    setFormData(type);
    setMessage('');
  };

  const handleNewClick = () => {
    setFormData({ nombre: '' });
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEditing = !!formData.id; 
    const url = isEditing 
      ? `http://localhost:5082/api/product-types/${formData.id}` 
      : 'http://localhost:5082/api/product-types';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      let data = null;
      if (response.status !== 204) {
        try {
          data = await response.json();
        } catch (err) {
          console.warn('No JSON in response');
        }
      }

      if (!response.ok) {
        setMessage((data && data.message) ? data.message : 'Error saving type.');
        return;
      }

      setFormData({ nombre: '' });
      fetchTypes();
      setMessage(isEditing ? 'Type updated successfully!' : 'Type created successfully!');

    } catch (error) {
      setMessage('Network error. Is the backend running?');
    }
  };

  return (
    <div className="locations-view">
      <h2 className="locations-view__title">Product Types Management</h2>

      <div className="locations-view__layout">
        <div className="locations-view__frame">
          <div className="locations-view__frame-body">
            <h3 className="locations-view__subtitle">Product Types</h3>
            <table className="locations-view__table">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>ASSOCIATED PRODUCTS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type, index) => (
                  <tr key={index}>
                    <td className="strong">{type.nombre}</td>
                    {/* Placeholder estático hasta que hagamos la HU-03 */}
                    <td>0</td> 
                    <td>
                      <button 
                        onClick={() => handleEditClick(type)} 
                        className="locations-view__btn-text"
                        style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        [Edit]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={handleNewClick} 
                className="locations-view__btn locations-view__btn--primary"
              >
                + New Type
              </button>
            </div>
          </div>
        </div>

        <div className="locations-view__panel">
          <h3 className="locations-view__panel-title">
            {formData.id ? 'Edit Type' : 'New Type'}
          </h3>
          <form onSubmit={handleSubmit} className="locations-view__form">
            
            <div className="locations-view__field">
            <label htmlFor="nombre">TYPE NAME</label>
              <input
                id="nombre"
                type="text"
                placeholder="Ej. Beer, Wine, Soft Drink"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="locations-view__btn locations-view__btn--primary">
                {formData.id ? 'Update Type' : 'Save Type'}
              </button>
              
              {formData.id && (
                <button 
                  type="button" 
                  onClick={handleNewClick}
                  className="locations-view__btn"
                >
                  Cancel
                </button>
              )}
            </div>

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
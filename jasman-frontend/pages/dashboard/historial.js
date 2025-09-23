import { useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../components/auth/withAuth';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import styles from '../../styles/Historial/historial.module.css';

export default function Historial() {
  const { user, logout } = useAuth();
  const [plateInput, setPlateInput] = useState('');
  const [searchType, setSearchType] = useState('plate');
  const [vinInput, setVinInput] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchVehicles = async ({ plate, vin_sn }) => {
    try {
      setError('');
      setSearching(true);
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      if (!token) {
        logout();
        return;
      }

      const queryParams = new URLSearchParams();
      if (plate) queryParams.append('plate', plate);
      if (vin_sn) queryParams.append('vin_sn', vin_sn);

      const response = await fetch(`/api/odoo/vehicles?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      setError(`Error al buscar vehículos: ${error.message}`);
      setVehicles([]);
    } finally {
      setSearching(false);
    }
  };

  const searchServices = async (e) => {
    e.preventDefault();
  
    if (
      (!plateInput || plateInput.length < 3) &&
      (!vinInput || vinInput.length < 3)
    ) {
      setError('Ingresa al menos 3 caracteres en placa o VIN para buscar servicios.');
      return;
    }
  
    try {
      setError('');
      setLoading(true);
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      if (!token) {
        logout();
        return;
      }
  
      const queryParams = new URLSearchParams();
      if (plateInput) queryParams.append('plate', plateInput);
      if (vinInput) queryParams.append('vin_sn', vinInput);
  
      const response = await fetch(`/api/odoo/services?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
  
      const data = await response.json();
      setServices(data);
      if (data.length === 0) {
        setError('No se encontraron servicios para esta búsqueda.');
      }
    } catch (error) {
      setError(`Error al buscar servicios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <ProtectedRoute>
      <div className={styles.dashboardContainer}>
        <Head>
          <title>Historial de Servicios - All For Tires</title>
        </Head>
  
        <Navigation />
        <DynamicBreadcrumbs />
  
        <main className={styles.mainContent}>
          <div className={styles.historyContainer}>
            <h1>Historial de Servicios</h1>
  
            {/* Selector de tipo de búsqueda */}
            <div className={styles.radioSelector}>
              <label>
                <input
                  type="radio"
                  name="searchType"
                  value="plate"
                  checked={searchType === 'plate'}
                  onChange={() => {
                    setSearchType('plate');
                    setVinInput('');
                    setSelectedVehicle(null);
                    setVehicles([]);
                  }}
                />
                Buscar por Placa
              </label>
              <label>
                <input
                  type="radio"
                  name="searchType"
                  value="vin"
                  checked={searchType === 'vin'}
                  onChange={() => {
                    setSearchType('vin');
                    setPlateInput('');
                    setSelectedVehicle(null);
                    setVehicles([]);
                  }}
                />
                Buscar por VIN
              </label>
            </div>
  
            {/* Campo de búsqueda según tipo */}
            {searchType === 'plate' && (
              <div className={styles.searchSection}>
                <label>Placa del vehículo</label>
                <input
                  type="text"
                  value={plateInput}
                  onChange={(e) => {
                    const plate = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setPlateInput(plate);
                    if (plate.length >= 3) {
                      searchVehicles({ plate });
                    } else {
                      setVehicles([]);
                    }
                  }}
                  placeholder="Ej. ABC123"
                />
              </div>
            )}
  
            {searchType === 'vin' && (
              <div className={styles.searchSection}>
                <label>VIN del vehículo</label>
                <input
                  type="text"
                  value={vinInput}
                  onChange={(e) => {
                    const vin = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setVinInput(vin);
                    if (vin.length >= 3) {
                      searchVehicles({ vin_sn: vin });
                    } else {
                      setVehicles([]);
                    }
                  }}
                  placeholder="Ej. 1HGCM82633A000000"
                />
              </div>
            )}
  
            {searching && <div className={styles.loadingText}>Buscando vehículos...</div>}
  
            {/* Lista de vehículos sugeridos */}
            {vehicles.length > 0 && (
              <div className={styles.vehiclesList}>
                <ul>
                  {vehicles.map((vehicle) => (
                    <li
                      key={vehicle.id}
                      onClick={() => {
                        setPlateInput(vehicle.license_plate);
                        setVinInput(vehicle.vin_sn || '');
                        setSelectedVehicle(vehicle);
                        setVehicles([]);
                      }}
                    >
                      <strong>{vehicle.license_plate}</strong> - {vehicle.model_id[1]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
  
            {/* Información del vehículo seleccionado */}
            {selectedVehicle && (
              <div className={styles.vehicleInfo}>
                <h2>Información del Vehículo</h2>
                <div className={styles.vehicleDetails}>
                  <p><span>Placa:</span> {selectedVehicle.license_plate}</p>
                  <p><span>Modelo:</span> {selectedVehicle.model_id[1]}</p>
                  <p><span>Año:</span> {selectedVehicle.model_year}</p>
                  <p><span>Color:</span> {selectedVehicle.color}</p>
                  <p><span>VIN:</span> {selectedVehicle.vin_sn}</p>
                  <p><span>N. Motor:</span> {selectedVehicle.engine_number}</p>
                </div>
              </div>
            )}
  
            {/* Botón para buscar historial */}
            <form onSubmit={searchServices} className={styles.searchForm}>
              <button
                type="submit"
                disabled={loading || !(plateInput || vinInput)}
                className={loading ? styles.loadingButton : ''}
              >
                {loading ? 'Buscando servicios...' : 'Buscar Historial'}
              </button>
            </form>
  
            {/* Mensaje de error */}
            {error && (
              <div className={styles.errorMessage}>
                <strong>Error:</strong> {error}
              </div>
            )}
  
            {/* Tabla de resultados */}
            {services.length > 0 && (
              <div className={styles.servicesTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Kilometraje</th>
                      <th>Movimiento</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id}>
                        <td>{new Date(service.date).toLocaleDateString('es-MX')}</td>
                        <td>{service.vehicle_odometer} km</td>
                        <td>{service.move_name}</td>
                        <td>{service.product_id[1]}</td>
                        <td>{service.quantity}</td>
                        <td>${service.price_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );  
}

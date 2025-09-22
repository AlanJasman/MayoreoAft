import { useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../components/auth/withAuth';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import SupplierSearch from '../../components/inventory/SupplierSearch.js';
import SupplierTable from '../../components/inventory/SupplierTable.js';
import styles from '../../styles/Inventory/Inventory.module.css';

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const validateParams = (params) => {
    const errors = {};
    const { width, ratio, diameter } = params;

    if (!width || !ratio || !diameter) {
      errors.general = 'Debes ingresar todos los campos';
      return errors;
    }

    if (!/^\d+$/.test(width)) {
      errors.width = 'El ancho debe contener solo números';
    }

    if (!/^\d+$/.test(ratio)) {
      errors.ratio = 'El perfil debe contener solo números';
    }

    if (!/^\d+$/.test(diameter)) {
      errors.diameter = 'El diámetro debe contener solo números';
    }

    return errors;
  };

  const handleSearch = async (searchParams) => {
    setError('');
    setFormErrors({});

    const errors = validateParams(searchParams);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const token = user?.token || localStorage.getItem('jasman_auth_token');

      if (!token) {
        logout();
        return;
      }

      const res = await fetch(
        `/api/existencia/search?width=${searchParams.width}&ratio=${searchParams.ratio}&diameter=${searchParams.diameter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || "Error en el servidor");
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error al buscar en el inventario de proveedores');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Existencias Proveedores - JasmanApp</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs customItems={[{ name: 'Proveedores', path: '/inventory/suppliers' }]} />

        <div className={styles.mainContent}>
          <div className="inventory-container">
            <h1>Existencias en Proveedores</h1>
            
            <SupplierSearch
              onSearch={handleSearch}
              loading={loading}
              errors={formErrors}
            />

            {error && (
              <div className={`${styles.errorMessage} ${styles.fadeIn}`}>
                {error}
              </div>
            )}

            <SupplierTable
              data={results}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
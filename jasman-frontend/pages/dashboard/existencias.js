import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/withAuth';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import InventorySearch from '../../components/inventory/InventorySearch';
import DeniedTireModal from '../../components/inventory/DeniedTireModal';
import styles from '../../styles/Inventory/Inventory.module.css';
import InventoryTableAll from '../../components/inventory/InventoryTableAll';

export default function InventoryDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // Loguear el rol del usuario para debugging
  useEffect(() => {
    if (!authLoading && user) {
      console.log("Rol del usuario:", user.role);
    }
  }, [user, authLoading]);

  const [results, setResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchParams, setSearchParams] = useState(null);

  const validateParams = (params) => {
    const errors = {};
    const { piso, serie, rin } = params;

    if (!piso && !serie && !rin) {
      errors.general = 'Debes ingresar al menos un criterio de búsqueda';
      return errors;
    }

    if (piso && !/^\d+$/.test(piso)) {
      errors.piso = 'El piso debe contener solo números';
    }

    if (serie && !/^\d+$/.test(serie)) {
      errors.serie = 'La serie debe contener solo números';
    }

    if (rin && !/^R?\d+$/i.test(rin)) {
      errors.rin = 'Formato de rin inválido (ej: 15 o R15)';
    }

    return errors;
  };

  const handleSearch = async (params) => {
    setError('');
    setFormErrors({});
    setSearchParams(params);

    const errors = validateParams(params);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSearchLoading(true);
    try {
      const normalizedParams = {
        piso: params.piso?.trim() || '',
        serie: params.serie?.trim() || '',
        rin: params.rin?.trim().toUpperCase() || ''
      };

      const query = new URLSearchParams(normalizedParams).toString();
      const token = user?.token || localStorage.getItem('jasman_auth_token');

      if (!token) {
        logout();
        return;
      }

      const res = await fetch(`/api/inventory/search?${query}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-App-Version': 'aft' }
      });

      if (!res.ok) throw new Error("Error en el servidor");

      const data = await res.json();
      setResults(data);

      if (data.data?.length === 0) {
        handleOpenDeniedModal({
          name: `[NUEVA] ${normalizedParams.piso}/${normalizedParams.serie} R${normalizedParams.rin.replace('R', '')}`
        });
      }
    } catch (err) {
      setError(err.message || 'Error al buscar en el inventario');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddToQuotation = (items) => {
    const encodedItems = encodeURIComponent(JSON.stringify(items));
    router.push({
      pathname: '/dashboard/cotizar',
      query: { items: encodedItems }
    });
  };

  const handleOpenDeniedModal = (modeOrProduct) => {
    let mode;
    let product = null;

    if (modeOrProduct === 'manual') {
      mode = 'manual';
    } else if (modeOrProduct && modeOrProduct.name && modeOrProduct.name.startsWith('[NUEVA]')) {
      mode = 'busqueda';
      product = {
        name: searchParams?.piso && searchParams?.serie && searchParams?.rin
          ? `[NUEVA] ${searchParams.piso}/${searchParams.serie}R${searchParams.rin.replace('R', '')}`
          : 'Nueva llanta no catalogada'
      };
    } else {
      mode = 'tabla';
      product = modeOrProduct;
    }

    setSelectedProduct(product);
    setShowDeniedModal(true);
    return mode;
  };

  const handleCloseDeniedModal = () => {
    setShowDeniedModal(false);
    setSelectedProduct(null);
  };

  useEffect(() => {
    if (!searchLoading && results?.data?.length === 0 && searchParams) {
      const { piso = '', serie = '', rin = '' } = searchParams;
      if (piso || serie || rin) {
        handleOpenDeniedModal({
          name: `[NUEVA] ${piso}/${serie} R${rin.replace('R', '')}`
        });
      }
    }
  }, [searchLoading, results, searchParams]);

  useEffect(() => {
    return () => {
      setError('');
      setFormErrors({});
    };
  }, []);

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Existencias - Mayoreo All for Tires</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.mainContent}>
          <div className="inventory-container">
            <InventorySearch
              onSearch={handleSearch}
              onOpenDeniedModal={() => handleOpenDeniedModal('manual')}
              loading={searchLoading}
              errors={formErrors}
              searchResults={results}
            />

            {error && !showDeniedModal && (
              <div className={`${styles.errorMessage} ${styles.fadeIn}`}>
                {error}
              </div>
            )}

            <InventoryTableAll
              data={results}
              loading={searchLoading}
              onDeniedClick={(item) => handleOpenDeniedModal(item)}
              searchParams={searchParams}
              userBranch={user?.branch_id}
              onAddToQuotation={handleAddToQuotation}
              userRole={user?.role} 
              userName={user?.correo?.trim() || 'Usuario'}      
            />

            <DeniedTireModal
              show={showDeniedModal}
              onClose={(success) => {
                handleCloseDeniedModal();
                if (success) {
                  setSearchParams(null);
                }
              }}
              mode={
                selectedProduct 
                  ? (selectedProduct.codigo ? 'tabla' : 'busqueda') 
                  : 'manual'
              }
              searchParams={searchParams}
              product={selectedProduct}
              key={`denied-modal-${Date.now()}`}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
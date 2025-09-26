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
  const { user, loading, logout } = useAuth(); // Obtener el estado 'loading' del AuthContext

  // Loguear el rol del usuario una vez que esté disponible
  useEffect(() => {
    if (!loading && user) {
      console.log("InventoryDashboard - Rol del usuario (desde useEffect):", user.role);
    } else if (!loading && !user) {
      console.log("InventoryDashboard - No hay usuario autenticado después de la carga inicial.");
    } else if (loading) {
      console.log("InventoryDashboard - Autenticación en proceso de carga...");
    }
  }, [user, loading]);

  const [results, setResults] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false); // Renombrado para evitar conflicto
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchParams, setSearchParams] = useState(null);
  const [isFromSearch, setIsFromSearch] = useState(false); // Esta variable no se usa en el código proporcionado, considera si es necesaria.


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

    setLoadingSearch(true); // Usar loadingSearch
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
        // En el caso de que no se encuentren resultados, abrir el modal de "no disponible"
        handleOpenDeniedModal({
          name: `[NUEVA] ${normalizedParams.piso}/${normalizedParams.serie} R${normalizedParams.rin.replace('R', '')}`
        }); // Modificado: pasar solo el objeto producto, no un segundo argumento booleano
      }
    } catch (err) {
      setError(err.message || 'Error al buscar en el inventario');
    } finally {
      setLoadingSearch(false); // Usar loadingSearch
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
    // Determinar el modo de operación
    let mode;
    let product = null;

    if (modeOrProduct === 'manual') {
      mode = 'manual';
    } else if (modeOrProduct && modeOrProduct.name && modeOrProduct.name.startsWith('[NUEVA]')) {
      // Si el producto viene de una búsqueda sin resultados
      mode = 'busqueda';
      product = {
        name: searchParams?.piso && searchParams?.serie && searchParams?.rin
          ? `[NUEVA] ${searchParams.piso}/${searchParams.serie}R${searchParams.rin.replace('R', '')}`
          : 'Nueva llanta no catalogada'
      };
    } else {
      // Asumimos que es un producto de la tabla
      mode = 'tabla';
      product = modeOrProduct;
    }

    setSelectedProduct(product);
    setShowDeniedModal(true);

    // Se retorna el modo pero no es estrictamente necesario ya que el estado se actualiza
    return mode;
  };


  const handleCloseDeniedModal = () => {
    setShowDeniedModal(false);
    setSelectedProduct(null);
    setIsFromSearch(false);
  };


  // Este useEffect maneja la apertura del modal cuando la búsqueda no encuentra resultados.
  // Es importante que use 'loadingSearch' para reaccionar al final de la búsqueda.
  useEffect(() => {
    if (!loadingSearch && results?.data?.length === 0 && searchParams) {
      const { piso = '', serie = '', rin = '' } = searchParams;

      if (piso || serie || rin) {
        handleOpenDeniedModal({
          name: `[NUEVA] ${piso}/${serie} R${rin.replace('R', '')}`
        });
      }
    }
  }, [loadingSearch, results, searchParams]);

  // Limpiar errores del formulario al desmontar el componente
  useEffect(() => {
    return () => {
      setError('');
      setFormErrors({});
    };
  }, []);

  // --- IMPORTE CLAVE: Esperar a que el AuthContext cargue los datos del usuario ---
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Cargando sesión...</p> {/* Puedes poner un spinner o un mensaje de carga */}
      </div>
    );
  }

  // Si no hay usuario después de que el AuthContext termine de cargar, 
  // ProtectedRoute ya se encargará de redirigir, así que simplemente retornamos null o un loader.
  if (!user) {
    return null; 
  }
console.log("Contenido completo de user:", user);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Existencias - All For Tires</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.mainContent}>
          <div className="inventory-container">
            <InventorySearch
              onSearch={handleSearch}
              // handleOpenDeniedModal(null, true) era para abrir el modal 'manual'
              // Ahora se puede pasar 'manual' directamente o simplemente llamar sin argumentos para el modo búsqueda sin resultados.
              onOpenDeniedModal={() => handleOpenDeniedModal('manual')} // Pasa 'manual' explícitamente
              loading={loadingSearch} // Usar loadingSearch aquí
              errors={formErrors}
            />

            {error && !showDeniedModal && (
              <div className={`${styles.errorMessage} ${styles.fadeIn}`}>
                {error}
              </div>
            )}

            <InventoryTableAll
              data={results}
              loading={loadingSearch} // Usar loadingSearch aquí
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
                setShowDeniedModal(false);
                setSelectedProduct(null);
                if (success) {
                  setSearchParams(null); // Limpiar parámetros de búsqueda si el modal indica éxito (ej. se agregó un nuevo producto)
                }
              }}
              // La lógica para determinar 'mode' en el modal se ha ajustado para ser más robusta
              mode={
                selectedProduct 
                  ? (selectedProduct.codigo ? 'tabla' : 'busqueda') 
                  : 'manual'
              }
              searchParams={searchParams}
              product={selectedProduct}
              key={`denied-modal-${Date.now()}`} // Ayuda a resetear el estado interno del modal cuando se cierra y reabre
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
// file: pages/dashboard/all.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../components/auth/withAuth';
import { useAuth } from '../../context/AuthContext';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import InventoryTable from '../../components/inventory/InventoryTableAll.js';
import styles from '../../styles/Inventory/Inventory.module.css';

export default function AllInventory() {
  const { user, logout } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const [productIds, setProductIds] = useState([]);


  const fetchAllInventory = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
  
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  
    abortControllerRef.current = new AbortController();
  
    setLoading(true);
    setError('');
    setResults([]);
    setProductIds([]);
  
    try {
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      const res = await fetch('/api/inventory/all?line_id=4', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: abortControllerRef.current.signal
      });
  
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || "Error al obtener el inventario completo");
      }
  
      const data = await res.json();
      if (isMountedRef.current) {
        setResults(data);
        setProductIds(data.map(item => item.id));  // <-- Guardamos los IDs para fetch de precios
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message || 'Error al cargar el inventario');
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };
  
  const fetchPrices = async (ids) => {
    try {
      const res = await fetch('/api/inventory/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_ids: ids })
      });
  
      if (!res.ok) return;
  
      const enriched = await res.json();
  
      // Actualizar precios en los resultados actuales
      setResults(prev =>
        prev.map(item => ({
          ...item,
          price: enriched[item.id]?.price || "N/A"
        }))
      );
    } catch (err) {
      console.error("Error al cargar precios:", err);
    }
  };
  
  const handleReload = () => {
    fetchAllInventory();
  };
  useEffect(() => {
    if (productIds.length > 0) {
      fetchPrices(productIds);
    }
  }, [productIds]);
  
  useEffect(() => {
    isMountedRef.current = true;

    if (user?.token) {
      fetchAllInventory();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.token]);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Inventario Completo - JasmanApp</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs 
          additionalPaths={[
            { name: 'Inventario', path: '/inventory' },
            { name: 'Todo el Inventario', path: '/inventory/all' }
          ]} 
        />

        <div className={styles.mainContent}>
          <div className="inventory-container">
            <div className={styles.headerContainer}>
              <h1>Todo el Inventario</h1>
              <button 
                onClick={handleReload} 
                disabled={loading}
                className={styles.reloadButton}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span> Cargando...
                  </>
                ) : (
                  '↻ Recargar Datos'
                )}
              </button>
            </div>
            
            {error && (
              <div className={`${styles.errorMessage} ${styles.fadeIn}`}>
                {error}
              </div>
            )}
            
            <InventoryTable 
              data={results} 
              loading={loading}
              userBranch={user?.branch_id}
              showAll={true}
              userName={user?.name}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

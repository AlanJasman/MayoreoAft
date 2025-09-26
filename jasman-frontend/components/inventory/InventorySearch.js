import { useState, useEffect } from 'react';
import { GiFlatTire } from 'react-icons/gi';
import { FiDownload } from 'react-icons/fi';
import styles from '../../styles/Inventory/InventorySearch.module.css';
import { useAuth } from '../../context/AuthContext';

export default function InventorySearch({ 
  onSearch, 
  onOpenDeniedModal, 
  loading, 
  errors,
  searchResults 
}) {
  const { getToken, user } = useAuth();
  const [searchParams, setSearchParams] = useState({
    piso: '',
    serie: '',
    rin: ''
  });
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const isNotClient = user?.role !== 'cliente';

  useEffect(() => {
    const hasAtLeastOneField = Object.values(searchParams).some(val => val.trim() !== '');
    setIsSubmitDisabled(!hasAtLeastOneField);
  }, [searchParams]);

  const handleChange = (e) => {
    let value = e.target.value;
    
    if (e.target.name === 'rin') {
      if (value.length > 4) return;
      if (value.startsWith('R')) {
        value = 'R' + value.substring(1).replace(/[^0-9]/g, '');
      } else {
        value = value.replace(/[^0-9]/g, '');
      }
    } else {
      if (value.length > 4) return;
      value = value.replace(/[^0-9]/g, '');
    }
    
    setSearchParams({
      ...searchParams,
      [e.target.name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const paramsToSend = Object.fromEntries(
      Object.entries(searchParams)
        .filter(([_, value]) => value.trim() !== '')
    );
    
    onSearch(paramsToSend);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${FASTAPI_URL}/inventory/export/supabase/csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar el inventario');
      }

      const today = new Date();
      const formattedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      let filename = `inventario_jasman_${formattedDate}.csv`;

      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = `inventario_jasman_${formattedDate}_${filenameMatch[1]}`;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error('Error al exportar CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.searchGrid}>
          <div className={styles.searchField}>
            <label className={styles.searchLabel}>Piso</label>
            <input
              type="text"
              name="piso"
              value={searchParams.piso}
              onChange={handleChange}
              className={`${styles.searchInput} ${errors?.piso ? styles.errorInput : ''}`}
              placeholder="195"
              maxLength={4}
              inputMode="numeric"
            />
            {errors?.piso && <span className={styles.errorText}>{errors.piso}</span>}
          </div>        
          <div className={styles.searchField}>
            <label className={styles.searchLabel}>Serie</label>
            <input
              type="text"
              name="serie"
              value={searchParams.serie}
              onChange={handleChange}
              className={`${styles.searchInput} ${errors?.serie ? styles.errorInput : ''}`}
              placeholder="65"
              maxLength={4}
              inputMode="numeric"
            />
            {errors?.serie && <span className={styles.errorText}>{errors.serie}</span>}
          </div>
          <div className={styles.searchField}>
            <label className={styles.searchLabel}>Rin</label>
            <input
              type="number"
              name="rin"
              value={searchParams.rin}
              onChange={handleChange}
              className={`${styles.searchInput} ${errors?.rin ? styles.errorInput : ''}`}
              placeholder="15"
              step="0.1"
            />
            {errors?.rin && <span className={styles.errorText}>{errors.rin}</span>}
          </div>
          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.searchButton}
              disabled={loading || isSubmitDisabled}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <div className={styles.modalButtonContainer}>
            <button
              type="button"
              onClick={() => onOpenDeniedModal('manual')}
              className={styles.modalButton}
              aria-label="Abrir modal de llantas denegadas"
            >
              <GiFlatTire className={styles.modalButtonIcon} />
            </button>
          </div>
        </div>
        
        {errors?.general && (
          <div className={styles.generalError}>{errors.general}</div>
        )}
      </form>

     
    {user?.role === "admin" && user?.zona !== "atizapan" && searchResults?.proveedores && (
      <div className={styles.proveedoresSection}>
        <h3>Información de Proveedores</h3>
        <div className={styles.proveedoresGrid}>
          {Object.entries(searchResults.proveedores)
            .filter(([proveedor, info]) => {
              // Excluir proveedores que contengan "atizapan" (case insensitive)
              // Y solo incluir aquellos que tengan info.created_at
              return !proveedor.toLowerCase().includes('atizapan') && info.created_at;
            })
            .map(([proveedor, info]) => (
              <div key={proveedor} className={styles.proveedorCard}>
                <h4>{proveedor}</h4>
                <p><strong>Última actualización:</strong> {new Date(info.created_at).toLocaleDateString()}</p>
              </div>
            ))}
        </div>
      </div>
    )}
    </div>
  );
}
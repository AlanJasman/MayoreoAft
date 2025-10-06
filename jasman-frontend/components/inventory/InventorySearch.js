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
    
    if (e.target.name === 'piso') {
      // MODIFICACIÓN: Permitir decimales en piso
      // Permitir números, punto y coma (para decimales)
      value = value.replace(/[^0-9.,]/g, '');
      
      // Reemplazar coma por punto para consistencia
      value = value.replace(',', '.');
      
      // Limitar longitud total
      if (value.length > 6) return;
      
      // Validar que solo haya un punto decimal
      const decimalParts = value.split('.');
      if (decimalParts.length > 2) {
        value = decimalParts[0] + '.' + decimalParts.slice(1).join('');
      }
      
    } else if (e.target.name === 'rin') {
      // MODIFICACIÓN: Permitir decimales en rin también
      // Permitir "R" opcional y números con decimales
      if (value.startsWith('R') || value.startsWith('r')) {
        // Si empieza con R, mantener la R y permitir decimales después
        const rest = value.substring(1);
        const cleanedRest = rest.replace(/[^0-9.,]/g, '');
        value = 'R' + cleanedRest.replace(',', '.');
      } else {
        // Si no empieza con R, solo números y decimales
        value = value.replace(/[^0-9.,]/g, '').replace(',', '.');
      }
      
      // Limitar longitud
      if (value.length > 6) return;
      
    } else if (e.target.name === 'serie') {
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
        .map(([key, value]) => {
          // MODIFICACIÓN: Para piso y rin, asegurar formato consistente
          if ((key === 'piso' || key === 'rin') && value) {
            return [key, value.replace(',', '.')]; // Siempre usar punto como separador decimal
          }
          return [key, value];
        })
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
              placeholder="195, 195.5, 195.50"
              maxLength={6}
              inputMode="decimal"
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
              type="text"
              name="rin"
              value={searchParams.rin}
              onChange={handleChange}
              className={`${styles.searchInput} ${errors?.rin ? styles.errorInput : ''}`}
              placeholder="16, 16.5"
              maxLength={6}
              inputMode="decimal"
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
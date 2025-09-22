import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Inventory/DynamicFilters.module.css';

export default function DynamicFilters({ onFilterChange, inventoryData }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [filterOptions, setFilterOptions] = useState({
    pisos: [],
    series: [],
    rines: [],
    marcas: []
  });
  const [loading, setLoading] = useState(false);

  // Extraer opciones de filtro directamente de los datos del inventario
  useEffect(() => {
    if (!inventoryData || inventoryData.length === 0) return;

    setLoading(true);
    
    try {
      // Procesar datos para extraer opciones de filtro
      const pisos = new Set();
      const series = new Set();
      const rines = new Set();
      const marcas = new Set();

      inventoryData.forEach(item => {
        if (item.piso) pisos.add(item.piso);
        if (item.serie) series.add(item.serie);
        if (item.rin) rines.add(item.rin);
        
        // Extraer marca del nombre del producto
        const marcaMatch = item.name?.match(/\[.*?\]\s.*?\s([A-Za-zÁ-ú]+)/i);
        if (marcaMatch && marcaMatch[1]) {
          marcas.add(marcaMatch[1].trim().toUpperCase());
        }
      });

      setFilterOptions({
        pisos: Array.from(pisos).sort(),
        series: Array.from(series).sort(),
        rines: Array.from(rines).sort(),
        marcas: Array.from(marcas).sort()
      });

    } catch (error) {
      console.error('Error al generar opciones de filtro:', error);
    } finally {
      setLoading(false);
    }
  }, [inventoryData]);

  const handleFilterSelect = (field, value) => {
    onFilterChange({ [field]: value });
  };

  if (loading) {
    return <div className={styles.loading}>Generando filtros...</div>;
  }

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filterGroup}>
        <label>Piso:</label>
        <select
          onChange={(e) => handleFilterSelect('piso', e.target.value)}
          defaultValue=""
        >
          <option value="">Todos</option>
          {filterOptions.pisos.map(piso => (
            <option key={piso} value={piso}>{piso}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Serie:</label>
        <select
          onChange={(e) => handleFilterSelect('serie', e.target.value)}
          defaultValue=""
        >
          <option value="">Todos</option>
          {filterOptions.series.map(serie => (
            <option key={serie} value={serie}>{serie}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Rin:</label>
        <select
          onChange={(e) => handleFilterSelect('rin', e.target.value)}
          defaultValue=""
        >
          <option value="">Todos</option>
          {filterOptions.rines.map(rin => (
            <option key={rin} value={rin}>{rin}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Marca:</label>
        <select
          onChange={(e) => handleFilterSelect('marca', e.target.value)}
          defaultValue=""
        >
          <option value="">Todas</option>
          {filterOptions.marcas.map(marca => (
            <option key={marca} value={marca}>{marca}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
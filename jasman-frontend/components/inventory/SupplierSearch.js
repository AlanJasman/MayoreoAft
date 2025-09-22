import { useState } from 'react';
import styles from '../../styles/Inventory/InventorySearch.module.css';

export default function SupplierSearch({ onSearch, loading, errors }) {
  const [searchParams, setSearchParams] = useState({
    width: '',
    ratio: '',
    diameter: ''
  });

  const handleChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setSearchParams({
      ...searchParams,
      [e.target.name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchParams.width || !searchParams.ratio || !searchParams.diameter) {
      return;
    }
    onSearch(searchParams);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchForm}>
      <div className={styles.searchGrid}>
        {/* Campo Ancho */}
        <div className={styles.searchField}>
          <label className={styles.searchLabel}>Piso</label>
          <input
            type="text"
            name="width"
            value={searchParams.width}
            onChange={handleChange}
            className={`${styles.searchInput} ${errors?.width ? styles.errorInput : ''}`}
            placeholder="165"
            maxLength={4}
            required
            inputMode="numeric"
          />
          {errors?.width && <span className={styles.errorText}>{errors.width}</span>}
        </div>
        
        {/* Campo Perfil */}
        <div className={styles.searchField}>
          <label className={styles.searchLabel}>Serie</label>
          <input
            type="text"
            name="ratio"
            value={searchParams.ratio}
            onChange={handleChange}
            className={`${styles.searchInput} ${errors?.ratio ? styles.errorInput : ''}`}
            placeholder="70"
            maxLength={4}
            required
            inputMode="numeric"
          />
          {errors?.ratio && <span className={styles.errorText}>{errors.ratio}</span>}
        </div>
        
        {/* Campo Diámetro */}
        <div className={styles.searchField}>
          <label className={styles.searchLabel}>Rin</label>
          <input
            type="text"
            name="diameter"
            value={searchParams.diameter}
            onChange={handleChange}
            className={`${styles.searchInput} ${errors?.diameter ? styles.errorInput : ''}`}
            placeholder="13"
            maxLength={4}
            required
            inputMode="numeric"
          />
          {errors?.diameter && <span className={styles.errorText}>{errors.diameter}</span>}
        </div>

        {/* Botón Buscar */}
        <div className={styles.buttonContainer}>
          <button
            type="submit"
            className={styles.searchButton}
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>
      
      {errors?.general && (
        <div className={styles.generalError}>{errors.general}</div>
      )}
    </form>
  );
}
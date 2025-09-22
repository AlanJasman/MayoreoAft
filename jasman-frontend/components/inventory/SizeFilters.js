import styles from '../../styles/Inventory/InventoryTableAll.module.css';

export default function SizeFilters({ sizes, activeSizeFilter, onSizeFilterClick, onClearFilters }) {
  return (
    <div className={styles.sizeFilters}>
      <div className={styles.filterTitle}>
        <span>Filtrar por medida (R{activeSizeFilter ? ' disponibles):' : ':'}</span>
      </div>
      <div className={styles.filterButtons}>
        {sizes.map(size => (
          <button
            key={size}
            onClick={() => onSizeFilterClick(size)}
            className={`${styles.filterButton} ${styles.sizeButton} ${activeSizeFilter === size ? styles.activeFilter : ''}`}
          >
            {size}
          </button>
        ))}
        {activeSizeFilter && (
          <button
            onClick={() => {
              onSizeFilterClick(null);
              onClearFilters();
            }}
            className={styles.clearFiltersButton}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
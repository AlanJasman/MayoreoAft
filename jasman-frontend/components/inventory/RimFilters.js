import styles from '../../styles/Inventory/InventoryTable.module.css';

export default function RimFilters({ rims, activeRimFilter, onRimFilterClick, onClearFilters }) {
  return (
    <div className={styles.rimFilters}>
      <div className={styles.filterTitle}>
        <span>Filtrar por rin:</span>
      </div>
      <div className={styles.filterButtons}>
        {rims.map(rim => (
          <button
            key={rim}
            onClick={() => onRimFilterClick(rim)}
            className={`${styles.filterButton} ${styles.rimButton} ${activeRimFilter === rim ? styles.activeFilter : ''}`}
          >
            R{rim}
          </button>
        ))}
        {activeRimFilter && (
          <button
            onClick={onClearFilters}
            className={styles.clearFiltersButton}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
import styles from '../../styles/InventoryResults.module.css';

export default function InventoryResults({ data, loading, onDeniedClick, userBranch }) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.resultsContainer}>
      <table className={styles.resultsTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Existencia</th>
            <th>Región 1</th>
            <th>Región 2</th>
            <th>Región 3</th>
            <th>Región 4</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.warehouse_exist}</td>
                <td>{item.region1}</td>
                <td>{item.region2}</td>
                <td>{item.region3}</td>
                <td>{item.region4}</td>
                <td>
                  {item.warehouse_exist === 0 && (
                    <button
                      onClick={() => onDeniedClick(item)}
                      className={styles.deniedButton}
                    >
                      Registrar no disponible
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className={styles.noResults}>
                {data.length === 0 && !loading ? 'No se encontraron resultados' : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
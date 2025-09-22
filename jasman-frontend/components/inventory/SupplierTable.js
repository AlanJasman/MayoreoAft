import styles from '../../styles/Inventory/InventoryTable.module.css';
import LoadingWheel from '../nav/LoadingWheel';

export default function SupplierTable({ data, loading }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const formattedDate = date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    return {
      text: formattedDate,
      isOld: diffDays > 2
    };
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingWheel />
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.inventoryTable}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Descripción</th>
            <th>Fabricante</th>
            <th>Marca</th>
            <th>Existencia</th>
            <th>Almacén</th>
            <th>fecha de actualizacion</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item) => {
              const dateInfo = formatDate(item.created_at);
              return (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.description}</td>
                  <td>{item.manufacturer}</td>
                  <td>{item.brand}</td>
                  <td>{item.on_hand}</td>
                  <td>{item.warehouse}</td>
                  <td className={dateInfo.isOld ? styles.oldDate : ''}>
                    {dateInfo.text}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className={styles.noResults}>
                No se encontraron resultados para esta medida
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
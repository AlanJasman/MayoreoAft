import React from 'react';
import styles from '../../styles/Inventory/ZoneModal.module.css';

const ZONE_NAMES = {
  '1': 'México',
  '2': 'Monterrey',
  '3': 'Guadalajara',
  '4': 'Guanajuato',
};

export default function ZoneModal({ zoneKey, data = [], onClose }) {
  const total = data.reduce((sum, a) => sum + (a.cantidad || 0), 0);
  const zoneName = ZONE_NAMES[zoneKey] || `Zona ${zoneKey}`;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Sucursales – {zoneName}</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.tableContainer}>
          {data.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.map((almacen) => (
                  <tr key={almacen.almacen_id}>
                    <td>{almacen.nombre}</td>
                    <td className={styles.center}>{almacen.cantidad}</td>
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td><strong>Total</strong></td>
                  <td className={styles.center}><strong>{total}</strong></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyContainer}>
              <p className={styles.empty}>No hay sucursales registradas para esta zona.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
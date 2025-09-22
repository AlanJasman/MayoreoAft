'use client';

import { useState } from 'react';
import styles from '../../styles/Cotizaciones/CotizacionesList.module.css';

const ESTADOS = {
  nueva: { label: 'Nueva', color: '#ffeb3b', textColor: '#000' },
  vista: { label: 'Vista', color: '#2196f3', textColor: '#fff' },
  aceptada: { label: 'Aceptada', color: '#4caf50', textColor: '#fff' },
  rechazada: { label: 'Rechazada', color: '#f44336', textColor: '#fff' },
  en_proceso: { label: 'En Proceso', color: '#ff9800', textColor: '#000' },
  pagada: { label: 'Pagada', color: '#4caf50', textColor: '#fff' },
  cerrada: { label: 'Cerrada', color: '#607d8b', textColor: '#fff' },
  cancelada: { label: 'Cancelada', color: '#f44336', textColor: '#fff' }
};

export default function CotizacionesList({
  cotizaciones,
  loading,
  onEdit,
  onView,
  onDelete,
  filters,
  pagination,
  onFilterChange,
  onPageChange,
  user
}) {
  const [selectedEstado, setSelectedEstado] = useState(filters.estado || '');

  const handleEstadoChange = (estado) => {
    setSelectedEstado(estado);
    onFilterChange({ estado: estado || undefined, page: 1 });
  };

const formatDate = (dateString) => {
  // Forzamos UTC agregando la Z si no la trae
  const utcString = dateString.endsWith("Z") ? dateString : dateString + "Z";

  return new Date(utcString).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });
};

    const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
    };

  if (loading) {
    return <div className={styles.loading}>Cargando cotizaciones...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Cotizaciones</h1>
        
        <div className={styles.filters}>
          <select
            value={selectedEstado}
            onChange={(e) => handleEstadoChange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.cotizacionesGrid}>
        {cotizaciones.map((cotizacion) => (
          <div key={cotizacion.id} className={styles.cotizacionCard}>
            <div className={styles.cardHeader}>
              <span className={styles.codigo}>#{cotizacion.id_cotizacion || cotizacion.id.slice(-8)}</span>
              <span
                className={styles.estado}
                style={{
                  backgroundColor: ESTADOS[cotizacion.estado]?.color || '#666',
                  color: ESTADOS[cotizacion.estado]?.textColor || '#fff'
                }}
              >
                {ESTADOS[cotizacion.estado]?.label || cotizacion.estado}
              </span>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.clienteInfo}>
                <h3>{cotizacion.cliente_nombre}</h3>
                <p>{cotizacion.cliente_email}</p>
                <p>{cotizacion.cliente_telefono}</p>
              </div>

              <div className={styles.detalles}>
                <div className={styles.detalleRow}>
                  <span>Fecha:</span>
                  <span>{formatDate(cotizacion.fecha_creacion)}</span>
                </div>
                <div className={styles.detalleRow}>
                  <span>Productos:</span>
                  <span>{cotizacion.detalle_cotizacion.length}</span>
                </div>
                <div className={styles.detalleRow}>
                  <span>Total:</span>
                  <span className={styles.total}>
                    {formatCurrency(cotizacion.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button
                onClick={() => onView(cotizacion)}
                className={styles.btnPrimary}
              >
                Ver Detalles
              </button>
              
              {(user?.role === 'admin' || user?.role === 'sistemas') && (
                <button
                  onClick={() => onDelete(cotizacion.id)}
                  className={styles.btnDanger}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cotizaciones.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p>No se encontraron cotizaciones</p>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className={styles.pagination}>
          <button
            disabled={filters.page === 1}
            onClick={() => onPageChange(filters.page - 1)}
            className={styles.paginationBtn}
          >
            Anterior
          </button>
          
          <span className={styles.pageInfo}>
            Página {filters.page} de {pagination.total_pages}
          </span>
          
          <button
            disabled={filters.page === pagination.total_pages}
            onClick={() => onPageChange(filters.page + 1)}
            className={styles.paginationBtn}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
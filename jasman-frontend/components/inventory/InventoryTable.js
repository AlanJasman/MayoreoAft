'use client';
import { useState, useMemo } from 'react';
import React from 'react';
import styles from '../../styles/Inventory/InventoryTable.module.css';
import LoadingWheel from '../nav/LoadingWheel';
import { GiFlatTire } from 'react-icons/gi';
import { FaCartPlus, FaTimes } from 'react-icons/fa';
import ZoneModal from '../inventory/ZoneModal';

export default function InventoryTable({ 
  data, 
  loading, 
  onDeniedClick, 
  searchParams, 
  userBranch,
  onAddToQuotation 
}) {
  const [activeFilter, setActiveFilter] = useState(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedAlmacenes, setSelectedAlmacenes] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);

  const items = data?.data ?? [];

  const brands = useMemo(() => {
    const brandSet = new Set();
    items.forEach(item => {
      if (item.marca) {
        brandSet.add(item.marca.toUpperCase());
      }
    });
    return Array.from(brandSet).sort();
  }, [items]);

  const filteredData = useMemo(() => {
    if (!activeFilter) return items;
    return items.filter(item => 
      item.marca && item.marca.toUpperCase() === activeFilter
    );
  }, [items, activeFilter]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingWheel />
      </div>
    );
  }

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.sku);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.sku);
      } else {
        return [...prev, {
          id: item.sku,
          name: item.nombre.replace(/^\[.*?\]\s/, ''),
          list_price: parseFloat(item.precio) || 0
        }];
      }
    });
  };

  const removeSelectedItem = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddToQuotation = () => {
    if (selectedItems.length > 0 && onAddToQuotation) {
      onAddToQuotation(selectedItems);
      setSelectedItems([]);
      setShowSelectedPanel(false);
    }
  };

  const toggleSelectedPanel = () => {
    setShowSelectedPanel(!showSelectedPanel);
  };

  const toggleFilter = (brand) => {
    setActiveFilter(activeFilter === brand ? null : brand);
  };

  const formatPrice = (price) => {
    if (price === 'N/A') return price;
    return `$${parseFloat(price).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const openZoneModal = (zonaKey, data) => {
    setSelectedZone(zonaKey);
    setSelectedAlmacenes(data);
    setShowZoneModal(true);
  };

  return (
    <div className={styles.tableContainer}>
      {brands.length > 0 && (
        <div className={styles.brandFilters}>
          <div className={styles.filterTitle}>Filtrar por marca:</div>
          <div className={styles.filterButtons}>
            <button
              onClick={() => toggleFilter(null)}
              className={`${styles.filterButton} ${!activeFilter ? styles.activeFilter : ''}`}
            >
              Todas las marcas
            </button>
            {brands.map(brand => (
              <button
                key={brand}
                onClick={() => toggleFilter(brand)}
                className={`${styles.filterButton} ${activeFilter === brand ? styles.activeFilter : ''}`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}
      
    <table className={styles.inventoryTable}>
      <thead>
        <tr>
          <th style={{ width: '30px' }}></th> {/* Checkbox */}
          <th style={{ width: '80px' }}>SKU</th>
          <th style={{ minWidth: '200px' }}>Producto</th>
          <th style={{ width: '80px' }}>Precio</th>
          <th style={{ width: '60px' }}>Zona 1 Cedis</th>
          <th style={{ width: '60px' }}>Zona 1 Suc</th>
          <th style={{ width: '60px' }}>Zona 2 Cedis</th>
          <th style={{ width: '60px' }}>Zona 2 Suc</th>
          <th style={{ width: '60px' }}>Zona 3 Cedis</th>
          <th style={{ width: '60px' }}>Zona 3 Suc</th>
          <th style={{ width: '60px' }}>Zona 4 Cedis</th>
          <th style={{ width: '60px' }}>Zona 4 Suc</th>
          <th style={{ width: '50px' }}>Negar</th>
        </tr>
      </thead>

      <tbody>
        {filteredData.length > 0 ? (
          filteredData.map((item) => (
            <tr 
              key={item.sku} 
              className={selectedItems.some(selected => selected.id === item.sku) ? styles.selectedRow : ''}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selectedItems.some(selected => selected.id === item.sku)}
                  onChange={() => toggleItemSelection(item)}
                />
              </td>
              <td>{item.sku}</td>
              <td className={styles.productCell}>{item.nombre.replace(/^\[.*?\]\s/, '')}</td>
              <td className={styles.priceCell}>{formatPrice(item.precio)}</td>

              {['1', '2', '3', '4'].map((zonaNum) => {
                const zona = item.zonas?.[zonaNum];
                const totalCedis = zona?.total_cedis ?? 0;
                const totalSucursales = zona?.total_sucursales ?? 0;

                return (
                  <React.Fragment key={zonaNum}>
                    <td className={styles.centerCell}>{totalCedis}</td>
                    <td 
                      className={styles.clickableCell}
                      onClick={() => {
                        if (zona?.Sucursales?.length > 0) {
                          openZoneModal(zonaNum, zona.Sucursales);
                        }
                      }}
                      title="Ver sucursales"
                    >
                      {totalSucursales}
                    </td>
                  </React.Fragment>
                );
              })}

              <td className={styles.centerCell}>
                <button 
                  onClick={() => onDeniedClick({
                    codigo: item.sku,
                    piso: item.piso,
                    serie: item.serie,
                    rin: item.rin,
                    modelo: item.modelo,
                    medidas: item.medidas,
                    marca: item.marca
                  })}
                  className={styles.denyButton}
                  title="Registrar llanta desde tabla"
                >
                  <GiFlatTire />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={13} className={styles.noResults}>
              No se encontraron resultados para esta marca
            </td>
          </tr>
        )}
      </tbody>
    </table>

      {selectedItems.length > 0 && (
        <div className={styles.floatingButtonContainer}>
          <button 
            onClick={toggleSelectedPanel}
            className={styles.floatingButton}
          >
            <FaCartPlus />
            <span className={styles.itemCount}>{selectedItems.length}</span>
          </button>

          {showSelectedPanel && (
            <div className={`${styles.selectedItemsPanel} ${styles.bottom} ${styles.right}`}>
              <div className={styles.panelHeader}>
                <h4>Productos seleccionados ({selectedItems.length})</h4>
                <button 
                  onClick={() => setShowSelectedPanel(false)}
                  className={styles.closePanelBtn}
                >
                  <FaTimes />
                </button>
              </div>
              <ul className={styles.selectedItemsList}>
                {selectedItems.map(item => (
                  <li key={item.id} className={styles.selectedItem}>
                    <span>{item.name}</span>
                    <span>${item.list_price.toFixed(2)}</span>
                    <button 
                      onClick={() => removeSelectedItem(item.id)}
                      className={styles.removeItemBtn}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.panelFooter}>
                <button 
                  onClick={handleAddToQuotation}
                  className={styles.confirmButton}
                >
                  Agregar a cotización
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showZoneModal && (
        <ZoneModal
          zoneKey={selectedZone}
          data={selectedAlmacenes}
          onClose={() => setShowZoneModal(false)}
        />
      )}
    </div>
  );
}

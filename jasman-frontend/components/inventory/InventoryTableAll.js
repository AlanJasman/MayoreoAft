'use client';
import React, { useState, useMemo } from 'react';
import styles from '../../styles/Inventory/InventoryTableAll.module.css';
import { GiFlatTire } from 'react-icons/gi';
import { FiShoppingCart, FiChevronDown, FiChevronUp, FiPlus, FiMinus } from 'react-icons/fi';
import { FaCartPlus, FaTimes } from 'react-icons/fa';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function InventoryTableAll({
  data = null,
  loading = false,
  onDeniedClick = () => {},
  onAddToQuotation = () => {},
  userRole,
  userName
}) {

  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedZones, setExpandedZones] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);

  const items = data?.data || [];
  const isEmpty = items.length === 0;

  const isClient = userRole === 'cliente';

  const getAvailableZones = (item) => {
    const zones = [];
    const zoneNames = {
      1: 'México',
      2: 'Monterrey',
      3: 'Guadalajara',
      4: 'Guanajuato'
    };

    for (let i = 1; i <= 4; i++) {
      if (item.zonas?.[i] && (item.zonas[i].total_cedis > 0 || item.zonas[i].total_sucursales > 0)) {
        zones.push({ type: 'jasman', zoneNum: i, zoneName: zoneNames[i], data: item.zonas[i] });
      }
    }

    Object.entries(item.zonas || {}).forEach(([key, value]) => {
      if (!['1', '2', '3', '4'].includes(key) && value && (value.total_cedis > 0 || value.total_sucursales > 0)) {
        const newZoneName = `${key} 2`;
        zones.push({ type: 'proveedor', zoneName: newZoneName, data: value });
      }
    });

    return zones;
  };

  // Función para verificar si un producto tiene precio válido
  const hasValidPrice = (item) => {
    return item.precio && item.precio !== 'N/A' && !isNaN(parseFloat(item.precio));
  };

  // Función para verificar si un producto debe mostrarse según las reglas de inventario
  const shouldShowItem = (item) => {
    const availableZones = getAvailableZones(item);
    
    // Si no tiene zonas disponibles, no mostrarlo
    if (availableZones.length === 0) return false;
    
    // Verificar cada zona Jasman
    let hasValidJasmanZone = false;
    
    for (const zone of availableZones) {
      if (zone.type === 'jasman') {
        const totalZona = (zone.data.total_cedis || 0) + (zone.data.total_sucursales || 0);
        // Si es zona Jasman y tiene 4 o más unidades, mostrarlo
        if (totalZona >= 4) {
          hasValidJasmanZone = true;
          break;
        }
      } else if (zone.type === 'proveedor') {
        // Para zonas de proveedor, siempre mostrarlas
        hasValidJasmanZone = true;
        break;
      }
    }
    
    return hasValidJasmanZone;
  };

  // Filtrar items que deben mostrarse
  const visibleItems = useMemo(() => {
    return items.filter(item => shouldShowItem(item));
  }, [items]);

  const brands = useMemo(() => {
    const brandSet = new Set();
    visibleItems.forEach(item => {
      if (item.marca) {
        brandSet.add(item.marca.toUpperCase());
      }
    });
    return Array.from(brandSet).sort();
  }, [visibleItems]);

  const filteredItems = useMemo(() => {
    if (!activeFilter) return visibleItems;
    return visibleItems.filter(item =>
      item.marca && item.marca.toUpperCase() === activeFilter
    );
  }, [visibleItems, activeFilter]);

  const toggleFilter = (brand) => {
    setActiveFilter(activeFilter === brand ? null : brand);
  };

  const formatTotal = (total) => {
    if (total > 100) return '100+';
    if (total >= 10) return Math.floor(total / 10) * 10;
    return total;
  };

  const toggleItemSelection = (item) => {
    // No permitir seleccionar items sin precio válido
    if (!hasValidPrice(item)) return;
    
    setSelectedItems((prev) => {
      const isSelected = prev.some((selected) => selected.id === item.sku);
      if (isSelected) {
        return prev.filter((selected) => selected.id !== item.sku);
      } else {
        return [...prev, {
          id: item.sku,
          sku: item.sku,
          name: item.nombre?.replace(/^\[.*?\]\s*/, '') || 'Producto sin nombre',
          list_price: parseFloat(item.precio) || 0,
          brand: item.marca || 'Sin marca'
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

  const toggleExpandCard = (sku) => {
    setExpandedCard(expandedCard === sku ? null : sku);
  };

  const toggleExpandZone = (zoneKey) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneKey]: !prev[zoneKey]
    }));
  };

  const toggleExpandSection = (sectionKey) => {
    if (isClient) return;
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const formatPrice = (price) => {
    if (price === 'N/A' || !price || isNaN(parseFloat(price))) return '';
    return `$${parseFloat(price).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={styles.emptyState}>
        <p>No se encontraron productos en el inventario</p>
      </div>
    );
  }

  return (
    <div>
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

      <div className={styles.cardGrid}>
        {filteredItems.map((item) => {
          const isSelected = selectedItems.some((i) => i.id === item.sku);
          const isExpanded = expandedCard === item.sku;
          const availableZones = getAvailableZones(item);
          const hasPrice = hasValidPrice(item);

          return (
            <div
              key={item.sku}
              className={`${styles.card} ${isSelected ? styles.selectedCard : ''} ${isExpanded ? styles.expandedCard : ''} ${!hasPrice ? styles.noPriceCard : ''}`}
              onClick={() => toggleExpandCard(item.sku)}
            >
              <div className={styles.watermark}>{userName}</div>

              <div className={styles.cardHeader}>
                {userRole !== 'cliente' &&  userRole !== 'vendedor' && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!hasPrice}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(item);
                    }}
                    className={styles.selectionCheckbox}
                  />
                )}
                <span className={styles.sku}>{item.sku}</span>
                <div className={styles.cardActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeniedClick({
                        codigo: item.sku,
                        piso: item.piso,
                        serie: item.serie,
                        rin: item.rin,
                        marca: item.marca
                      });
                    }}
                    className={styles.denyButton}
                    aria-label="Marcar como no disponible"
                  >
                    <GiFlatTire />
                  </button>
                </div>
              </div>

              <div className={styles.cardImageContainer}>
                <img
                  src="/img/tire.png"
                  alt={item.nombre}
                  className={styles.productImage}
                  loading="lazy"
                />
              </div>

              <div className={styles.cardContent}>
                <div className={styles.brandTag}>{item.marca || 'Sin marca'}</div>
                <h3 className={styles.cardTitle}>{item.nombre.replace(/^\[.*?\]\s*/, '')}</h3>

                <div className={styles.priceContainer}>
                  <span className={styles.cardPrice}>{formatPrice(item.precio)}</span>
                  {!hasPrice && (
                    <span className={styles.noPriceWarning}>Consulta el precio con tu vendedor</span>
                  )}
                </div>

                <div className={styles.inventoryAccordion}>
                  <p className={styles.inventoryTitle}>Inventario</p>
                  <div className={styles.zoneGrid}>
                    {availableZones.map((zone) => {
                      const zoneKey = `${item.sku}-${zone.type}-${zone.zoneNum || zone.zoneName}`;
                      const isZoneExpanded = expandedZones[zoneKey];
                      const totalCedis = zone.data.total_cedis || 0;
                      const totalSucursales = zone.data.total_sucursales || 0;
                      const totalZona = totalCedis + totalSucursales;
                      const zoneTitle = zone.zoneName;

                      // Ocultar zonas Jasman con menos de 4 unidades
                      if (zone.type === 'jasman' && totalZona < 4) {
                        return null;
                      }

                      return (
                        <div key={zoneKey} className={styles.zoneAccordion}>
                          <div className={styles.zoneHeader} onClick={() => toggleExpandZone(zoneKey)}>
                            <span className={styles.zoneTitle}>{zoneTitle}</span>
                            <span className={styles.zoneTotal}>
                              Total:{' '}
                              {zone.type === 'proveedor' && totalZona < 30 ? (
                                <FaExclamationTriangle
                                  title="Revisa la disponibilidad con tu vendedor"
                                  style={{ color: '#eab308', cursor: 'pointer' }}
                                />
                              ) : (
                                formatTotal(totalZona)
                              )}
                            </span>
                            <span className={styles.zoneArrow}>
                              {isZoneExpanded ? <FiMinus /> : <FiPlus />}
                            </span>
                          </div>

                          {isZoneExpanded && (
                            <div className={styles.zoneContent}>
                              <div className={styles.inventorySection}>
                                <div className={styles.sectionHeader}>
                                  <span>
                                    CEDIS:{' '}
                                    {zone.type === 'proveedor' && totalCedis < 30 ? (
                                      <FaExclamationTriangle
                                        title="Revisa la disponibilidad con tu vendedor"
                                        style={{ color: '#eab308', cursor: 'pointer' }}
                                      />
                                    ) : (
                                      formatTotal(totalCedis)
                                    )}
                                  </span>
                                  {!isClient && (
                                    <span
                                      className={styles.sectionToggle}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandSection(`${zoneKey}-cedis`);
                                      }}
                                    >
                                      {expandedSections[`${zoneKey}-cedis`] ? <FiChevronUp /> : <FiChevronDown />}
                                    </span>
                                  )}
                                </div>

                                {!isClient && expandedSections[`${zoneKey}-cedis`] && (
                                  <div className={styles.locationList}>
                                    {zone.data.CEDIS.map((location) => (
                                      <div key={location.almacen_id} className={styles.locationItem}>
                                        <span>{location.nombre.replace(/^\d+\s*-\s*/, '')}</span>
                                        <span className={styles.locationQty}>{location.cantidad}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {zone.type === 'jasman' && (
                                <div className={styles.inventorySection}>
                                  <div className={styles.sectionHeader}>
                                    <span>
                                      Sucursales:{' '}
                                      {zone.type === 'proveedor' && totalSucursales < 30 ? (
                                        <FaExclamationTriangle
                                          title="Revisa la disponibilidad con tu vendedor"
                                          style={{ color: '#eab308', cursor: 'pointer' }}
                                        />
                                      ) : (
                                        formatTotal(totalSucursales)
                                      )}
                                    </span>
                                    {!isClient && (
                                      <span
                                        className={styles.sectionToggle}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpandSection(`${zoneKey}-sucursales`);
                                        }}
                                      >
                                        {expandedSections[`${zoneKey}-sucursales`] ? <FiChevronUp /> : <FiChevronDown />}
                                      </span>
                                    )}
                                  </div>

                                  {!isClient && expandedSections[`${zoneKey}-sucursales`] && (
                                    <div className={styles.locationList}>
                                      {zone.data.Sucursales.map((sucursal) => (
                                        <div key={sucursal.almacen_id} className={styles.locationItem}>
                                          <span>{sucursal.nombre.replace(/^\d+\s*-\s*/, '')}</span>
                                          <span className={styles.locationQty}>{sucursal.cantidad}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedItems.length > 0 && (
        <div className={styles.floatingButtonContainer}>
          <button
            onClick={() => setShowSelectedPanel(!showSelectedPanel)}
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
    </div>
  );
}
'use client';

import { useState, useMemo, useEffect } from 'react';

import styles from '../../styles/Cotizaciones/CotizacionDetail.module.css';
import { FaArrowLeft, FaEdit, FaFilePdf, FaSave, FaTimes } from 'react-icons/fa';
import { FaSearch, FaTrash } from "react-icons/fa";

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

const ESTADOS_OPTIONS = [
  { value: 'nueva', label: 'Nueva' },
  { value: 'vista', label: 'Vista' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'cancelada', label: 'Cancelada' }
];


export default function CotizacionDetail({ cotizacion, onBack, user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [formData, setFormData] = useState({
    estado: cotizacion.estado,
    observaciones: cotizacion.observaciones || '',
    detalle_cotizacion: cotizacion.detalle_cotizacion.map(producto => ({
      ...producto,
      total: producto.total || (producto.precio_unitario * producto.cantidad)
    }))
  });

  // Función para buscar productos
  const searchProducts = async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      const url = new URL(`${BACKEND_URL}/cotizaciones/buscar-productos`);
      url.searchParams.append('search', term);
      url.searchParams.append('page', '1');
      url.searchParams.append('per_page', '10');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const { data } = await response.json();
        setSearchResults(data.map(product => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price || 0,
          piso: product.piso,
          serie: product.serie,
          rin: product.rin,
          marca: product.marca,
          modelo: product.modelo,
          carga_velocidad: product.carga_velocidad
        })));
      }
    } catch (error) {
      console.error('Error buscando productos:', error);
    } finally {
      setSearching(false);
    }
  };

  // Efecto para buscar productos con debounce
  useEffect(() => {
    if (searchProductTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchProducts(searchProductTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchProductTerm]);

  // Validaciones
  const tieneCantidadCero = useMemo(() => 
    formData.detalle_cotizacion.some(producto => producto.cantidad <= 0),
    [formData.detalle_cotizacion]
  );

  const tienePrecioCero = useMemo(() => 
    formData.detalle_cotizacion.some(producto => producto.precio_unitario <= 0),
    [formData.detalle_cotizacion]
  );

  const esFormularioValido = useMemo(() => 
    !tieneCantidadCero && !tienePrecioCero,
    [tieneCantidadCero, tienePrecioCero]
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  // Optimizado con useMemo
  const { subtotal, impuestos, total } = useMemo(() => {
    const subtotal = formData.detalle_cotizacion.reduce(
      (sum, producto) => sum + (producto.precio_unitario * producto.cantidad), 
      0
    );
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;
    
    return { subtotal, impuestos, total };
  }, [formData.detalle_cotizacion]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      estado: cotizacion.estado,
      observaciones: cotizacion.observaciones || '',
      detalle_cotizacion: cotizacion.detalle_cotizacion.map(producto => ({
        ...producto,
        total: producto.total || (producto.precio_unitario * producto.cantidad)
      }))
    });
    setSearchProductTerm('');
    setSearchResults([]);
    setShowProductSearch(false);
  };

  const handleSave = async () => {
    if (!esFormularioValido) {
      alert('Por favor, corrige los errores antes de guardar');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const updateData = {
        estado: formData.estado,
        observaciones: formData.observaciones,
        subtotal: subtotal,
        total: total,
        detalles: formData.detalle_cotizacion.map(producto => ({
          id: producto.id,
          cantidad: producto.cantidad,
          precio_unitario: producto.precio_unitario,
          producto_id: producto.producto_id || producto.id,
          codigo: producto.codigo
        }))
      };

      await onUpdate(cotizacion.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating cotizacion:', error);
      alert('Error al actualizar la cotización');
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar producto
  const addProduct = (product) => {
    setFormData(prev => {
      // Buscamos si el producto ya existe por producto_id
      const existingIndex = prev.detalle_cotizacion.findIndex(
        p => p.producto_id === product.id
      );

      if (existingIndex >= 0) {
        // Si ya existe, aumentamos cantidad en 1 y recalculamos total
        const updatedDetalle = [...prev.detalle_cotizacion];
        const existingProduct = updatedDetalle[existingIndex];
        updatedDetalle[existingIndex] = {
          ...existingProduct,
          cantidad: existingProduct.cantidad + 1,
          total: (existingProduct.cantidad + 1) * existingProduct.precio_unitario
        };
        return { ...prev, detalle_cotizacion: updatedDetalle };
      } else {
        // Producto nuevo, lo agregamos
        const newProduct = {
          id: product.id,                   // ID real del producto
          producto_id: product.id,
          codigo: product.sku || product.id.toString(),
          products: { name: product.name },
          cantidad: 1,
          precio_unitario: product.price || 0,
          total: product.price || 0
        };
        return { ...prev, detalle_cotizacion: [...prev.detalle_cotizacion, newProduct] };
      }
    });

    setSearchProductTerm('');
    setSearchResults([]);
    setShowProductSearch(false);
  };

  // Función para eliminar producto
  const removeProduct = (index) => {
    setFormData(prev => {
      const updatedDetalle = prev.detalle_cotizacion.filter((_, i) => i !== index);
      return { ...prev, detalle_cotizacion: updatedDetalle };
    });
  };

  // Función para reemplazar producto
  const replaceProduct = (index, newProduct) => {
    setFormData(prev => {
      const updatedDetalle = [...prev.detalle_cotizacion];
      const oldProduct = updatedDetalle[index];

      updatedDetalle[index] = {
        ...oldProduct,
        id: newProduct.id,                    // ID real del producto
        producto_id: newProduct.id,
        codigo: newProduct.sku || newProduct.id.toString(),
        products: { name: newProduct.name },
        precio_unitario: newProduct.price || oldProduct.precio_unitario,
        total: oldProduct.cantidad * (newProduct.price || oldProduct.precio_unitario)
      };

      return { ...prev, detalle_cotizacion: updatedDetalle };
    });

    setSearchProductTerm('');
    setSearchResults([]);
  };

  // Optimizado para evitar recreación de funciones
  const updateProducto = (index, field, value) => {
    setFormData(prev => {
      const updatedDetalle = prev.detalle_cotizacion.map((producto, i) => {
        if (i === index) {
          const updated = { 
            ...producto, 
            [field]: field === 'cantidad' || field === 'precio_unitario' 
              ? Number(value) 
              : value
          };
          
          // Recalcular total
          updated.total = updated.cantidad * updated.precio_unitario;
          return updated;
        }
        return producto;
      });
      
      return { ...prev, detalle_cotizacion: updatedDetalle };
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEstadoStyle = (estado) => {
    const estadoObj = ESTADOS[estado] || ESTADOS.nueva;
    return {
      backgroundColor: estadoObj.color,
      color: estadoObj.textColor
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={onBack} className={styles.iconButton} title="Volver">
            <FaArrowLeft />
          </button>
          <h1>#{cotizacion.id_cotizacion}</h1>
        </div>
        
        <div className={styles.headerRight}>
          <span
            className={styles.estado}
            style={getEstadoStyle(formData.estado)}
          >
            {ESTADOS[formData.estado]?.label || formData.estado}
          </span>
          
          <div className={styles.actionIcons}>
            {(user?.role === 'admin' || user?.role === 'sistemas') && (
              <button className={styles.iconButton} title="Descargar PDF">
                <FaFilePdf />
              </button>
            )}
            {(user?.role === 'admin' || user?.role === 'sistemas' || user?.role === 'cliente') && !isEditing && (
              <button onClick={handleEdit} className={styles.iconButton} title="Editar Cotización">
                <FaEdit />
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={handleCancel} className={styles.iconButton} title="Cancelar">
                  <FaTimes />
                </button>
                <button 
                  onClick={handleSave} 
                  className={styles.iconButton}
                  disabled={loading || !esFormularioValido}
                  title="Guardar Cambios"
                >
                  <FaSave />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes de error */}
      {isEditing && (tieneCantidadCero || tienePrecioCero) && (
        <div className={styles.errorBanner}>
          <strong>Errores encontrados:</strong>
          {tieneCantidadCero && <span> • Hay productos con cantidad 0 o menor</span>}
          {tienePrecioCero && <span> • Hay productos con precio 0 o menor</span>}
        </div>
      )}

      <div className={styles.content}>
        {/* Información General */}
        <div className={styles.section}>
          <h2>Información General</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Fecha de Creación:</label>
              <span>{formatDate(cotizacion.fecha_creacion)}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Fecha de Vencimiento:</label>
              <span>{formatDate(cotizacion.fecha_vencimiento) || 'No especificada'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Estado:</label>
              {isEditing ? (
                <select
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className={styles.statusSelect}
                  disabled={user?.role === 'cliente' && !['aceptada', 'rechazada'].includes(formData.estado)}
                >
                  {ESTADOS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{ESTADOS[formData.estado]?.label || formData.estado}</span>
              )}
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className={styles.section}>
          <h2>Información del Cliente</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Nombre:</label>
              <span>{cotizacion.cliente_nombre}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Email:</label>
              <span>{cotizacion.cliente_email}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Teléfono:</label>
              <span>{cotizacion.cliente_telefono}</span>
            </div>
            {cotizacion.cliente_direccion && (
              <div className={styles.infoItem}>
                <label>Dirección:</label>
                <span>{cotizacion.cliente_direccion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Productos */}
        <div className={styles.section}>
          <div className={styles.productosHeader}>
            <h2>Productos ({formData.detalle_cotizacion.length})</h2>
            {isEditing && (
              <button 
                onClick={() => setShowProductSearch(!showProductSearch)}
                className={styles.addProductButton}
              >
                <FaSearch /> Buscar Productos
              </button>
            )}
          </div>

          {/* Buscador de productos (solo en edición) */}
          {isEditing && showProductSearch && (
            <div className={styles.productSearch}>
              <div className={styles.searchInputContainer}>
                <input
                  type="text"
                  placeholder="Buscar productos por nombre o SKU..."
                  value={searchProductTerm}
                  onChange={(e) => setSearchProductTerm(e.target.value)}
                  className={styles.searchInput}
                />
                {searching && <span className={styles.searchingIndicator}>Buscando...</span>}
              </div>
              
              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((product) => (
                    <div key={product.id} className={styles.searchResultItem}>
                      <div className={styles.productInfo}>
                        <div className={styles.productName}>{product.name}</div>
                        <div className={styles.productDetails}>
                          {product.sku && <span>SKU: {product.sku}</span>}
                          {product.marca && <span>Marca: {product.marca}</span>}
                          {product.price && <span>Precio: {formatCurrency(product.price)}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => addProduct(product)}
                        className={styles.addProductBtn}
                      >
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.productosTable}>
            <div className={styles.tableHeader}>
              <span>Código</span>
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Precio Unitario</span>
              <span>Total</span>
              {isEditing && <span>Acciones</span>}
            </div>
            {formData.detalle_cotizacion.map((producto, index) => {
              const tieneError = isEditing && (producto.cantidad <= 0 || producto.precio_unitario <= 0);
              
              return (
                <div 
                  key={index} 
                  className={`${styles.tableRow} ${tieneError ? styles.rowError : ''}`}
                >
                  <span>{producto.codigo}</span>
                  <span>
                    {isEditing ? (
                      <div className={styles.productNameWithAction}>
                        {producto.products?.name || 'Producto'}
                        <button 
                          onClick={() => {
                            setSearchProductTerm(producto.products?.name || '');
                            searchProducts(producto.products?.name || '');
                          }}
                          className={styles.replaceProductBtn}
                          title="Cambiar producto"
                        >
                          <FaSearch />
                        </button>
                      </div>
                    ) : (
                      producto.products?.name || 'Producto'
                    )}
                  </span>
                  <span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={producto.cantidad}
                        onChange={(e) => updateProducto(index, 'cantidad', e.target.value)}
                        className={`${styles.qtyInput} ${producto.cantidad <= 0 ? styles.inputError : ''}`}
                      />
                    ) : (
                      producto.cantidad
                    )}
                  </span>
                  <span>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={producto.precio_unitario}
                        onChange={(e) => updateProducto(index, 'precio_unitario', e.target.value)}
                        className={`${styles.priceInput} ${producto.precio_unitario <= 0 ? styles.inputError : ''}`}
                        disabled={user?.role === 'cliente'}
                      />
                    ) : (
                      formatCurrency(producto.precio_unitario)
                    )}
                  </span>
                  <span>{formatCurrency(producto.total)}</span>
                  {isEditing && (
                    <span>
                      <button 
                        onClick={() => removeProduct(index)}
                        className={styles.deleteProductBtn}
                        title="Eliminar producto"
                      >
                        <FaTrash />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección combinada de Observaciones y Totales */}
        <div className={styles.combinedSection}>
          {/* Observaciones */}
          <div className={styles.observacionesSection}>
            <h2>Observaciones</h2>
            <div className={styles.observaciones}>
              {isEditing ? (
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  rows={4}
                  placeholder="Agregar observaciones..."
                  className={styles.observationsTextarea}
                />
              ) : (
                <p>{formData.observaciones || 'Sin observaciones'}</p>
              )}
            </div>
          </div>

          {/* Totales */}
          <div className={styles.totalesSection}>
            <h2>Totales</h2>
            <div className={styles.totalesGrid}>
              <div className={styles.totalItem}>
                <label>Subtotal:</label>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.totalItem}>
                <label>Impuestos (16%):</label>
                <span>{formatCurrency(impuestos)}</span>
              </div>
              <div className={styles.totalItem}>
                <label className={styles.grandTotal}>Total:</label>
                <span className={styles.grandTotal}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className={styles.section}>
          <h2>Información del Sistema</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Creado por:</label>
              <span>{cotizacion.usuario?.nombre || 'Usuario del sistema'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Email del creador:</label>
              <span>{cotizacion.usuario?.correo || 'N/A'}</span>
            </div>
            {cotizacion.partner && (
              <div className={styles.infoItem}>
                <label>Partner:</label>
                <span>{cotizacion.partner.nombre}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Confirmar Cambios</h3>
            <div className={styles.modalMessage}>
              <p>¿Estás seguro de que deseas actualizar esta cotización?</p>
              <p>Estado: <strong>{ESTADOS[formData.estado]?.label}</strong></p>
              <p>Total: <strong>{formatCurrency(total)}</strong></p>
              {tieneCantidadCero || tienePrecioCero ? (
                <p className={styles.warningText}>
                  ⚠️ Advertencia: Hay productos con valores inválidos
                </p>
              ) : null}
            </div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`${styles.modalButton} ${styles.modalCancel}`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmSave}
                className={`${styles.modalButton} ${styles.modalConfirm}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
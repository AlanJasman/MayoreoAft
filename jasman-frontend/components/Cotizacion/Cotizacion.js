'use client'

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../../styles/Cotizaciones/cotizar.module.css';
import { useAuth } from '../../context/AuthContext'; 


export default function Cotizacion({ 
  onSave, 
  onSearchPartners, 
  onSearchProducts,
  initialPartner = null,
  initialOrderLines = []
}) {
  const { user } = useAuth(); // Obtener el usuario del contexto
  const searchParams = useSearchParams();
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(
    user?.role === 'cliente' 
      ? { 
          id: user.id, 
          name: user.nombre, 
          phone: user.telefono, 
          email: user.correo 
        } 
      : initialPartner
  );
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchingPartners, setSearchingPartners] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [noPartnersFound, setNoPartnersFound] = useState(false);
  const [showQuantityUpdated, setShowQuantityUpdated] = useState(false);
  const [updatedProductName, setUpdatedProductName] = useState('');
  const searchPartnerTimeoutRef = useRef(null);
  const searchProductTimeoutRef = useRef(null);

  const [quotationData, setQuotationData] = useState({
    partner_id: user?.role === 'cliente' 
      ? user.id.toString() 
      : initialPartner?.id?.toString() || '',
    order_lines: initialOrderLines,
  });
  const hasZeroQuantity = quotationData.order_lines.some(line => line.quantity <= 0);

  useEffect(() => {
    if (searchParams) {
      const encodedItems = searchParams.get('items');
      if (encodedItems) {
        try {
          const decoded = decodeURIComponent(encodedItems);
          const items = JSON.parse(decoded);
          const newOrderLines = items.map(item => ({
            product_id: item.id.toString(),
            product_name: item.name,
            quantity: 1,
            unit_price: item.list_price || 0,
            total: item.list_price || 0,
          }));

          setQuotationData(prev => ({
            ...prev,
            order_lines: [...prev.order_lines, ...newOrderLines]
          }));

          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          console.error('Error al decodificar items:', err);
        }
      }
    }
  }, [searchParams]);

  const searchPartners = async (term) => {
    try {
      if (searchPartnerTimeoutRef.current) {
        clearTimeout(searchPartnerTimeoutRef.current);
      }

      if (term.trim().length < 3) {
        setPartners([]);
        setSearchingPartners(false);
        setNoPartnersFound(false);
        return;
      }

      setSearchingPartners(true);
      setNoPartnersFound(false);
      
      searchPartnerTimeoutRef.current = setTimeout(async () => {
        if (onSearchPartners) {
          const result = await onSearchPartners(term);
          setPartners(result);
          setNoPartnersFound(result.length === 0);
        }
        setSearchingPartners(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setSearchingPartners(false);
      setNoPartnersFound(false);
    }
  };

  const searchProducts = async (term) => {
    try {
      if (searchProductTimeoutRef.current) {
        clearTimeout(searchProductTimeoutRef.current);
      }

      if (term.trim().length < 3) {
        setProducts([]);
        setSearchingProducts(false);
        return;
      }

      setSearchingProducts(true);
      
      searchProductTimeoutRef.current = setTimeout(async () => {
        if (onSearchProducts) {
          const products = await onSearchProducts(term);
          setProducts(products);
        }
        setSearchingProducts(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setSearchingProducts(false);
    }
  };

  const addOrderLine = (product) => {
    setQuotationData((prev) => {
      const existingIndex = prev.order_lines.findIndex(
        line => line.sku === product.sku
      );

      if (existingIndex >= 0) {
        const updatedLines = [...prev.order_lines];
        const existingLine = updatedLines[existingIndex];
        
        updatedLines[existingIndex] = {
          ...existingLine,
          quantity: existingLine.quantity + 1,
          total: (existingLine.quantity + 1) * existingLine.unit_price
        };

        setUpdatedProductName(product.name);
        setShowQuantityUpdated(true);
        setTimeout(() => setShowQuantityUpdated(false), 2000);

        return {
          ...prev,
          order_lines: updatedLines
        };
      } else {
        return {
          ...prev,
          order_lines: [
            ...prev.order_lines,
            {
              product_id: product.id.toString(),
              product_name: product.name,
              sku: product.sku || product.id.toString(), 
              quantity: 1,
              unit_price: product.list_price || 0,
              total: product.list_price || 0,
              piso: product.piso,
              serie: product.serie,
              rin: product.rin,
              marca: product.marca,
              modelo: product.modelo
            },
          ],
        };
      }
    });
    
    setProducts([]);
    setSearchProduct('');
  };

  const updateOrderLine = (index, field, value) => {
    const updated = quotationData.order_lines.map((line, i) => {
      if (i === index) {
        const updatedLine = { 
          ...line, 
          [field]: value,
          total: field === 'quantity' 
            ? value * line.unit_price 
            : field === 'unit_price' 
              ? line.quantity * value 
              : line.total
        };
        return updatedLine;
      }
      return line;
    });
    
    setQuotationData((prev) => ({ ...prev, order_lines: updated }));
  };

  const subtotal = quotationData.order_lines.reduce(
    (sum, line) => sum + line.total, 
    0
  );
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const removeOrderLine = (index) => {
    setQuotationData((prev) => ({
      ...prev,
      order_lines: prev.order_lines.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowModal(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setShowModal(false);
    try {
      if (onSave) {
        await onSave({
          ...quotationData,
          subtotal,
          total,   
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (searchPartnerTimeoutRef.current) {
        clearTimeout(searchPartnerTimeoutRef.current);
      }
      if (searchProductTimeoutRef.current) {
        clearTimeout(searchProductTimeoutRef.current);
      }
    };
  }, []);

return (
    <div className={styles.dashboardContainer}>
      <div className={styles.formContainer}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Nueva Cotización</h1>
          
          {user?.role !== 'cliente' && (
            <div className={styles.searchClient}>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  searchPartners(value);
                }}
                className={styles.searchInput}
              />
              {searchingPartners && <div className={styles.searching}>Buscando...</div>}
              {noPartnersFound && <div className={styles.noResults}>No se encontraron clientes</div>}
              {partners.length > 0 && (
                <ul className={styles.dropdown}>
                  {partners.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setSelectedPartner(p);
                        setQuotationData((prev) => ({ ...prev, partner_id: p.id.toString() }));
                        setPartners([]);
                        setSearchTerm('');
                      }}
                    >
                      {p.name} {p.phone ? `| ${p.phone}` : ''} {p.email ? `| ${p.email}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={styles.clientDataSection}>
          <div className={styles.clientInfo}>
            <h2 className={styles.sectionTitle}>Datos del Cliente</h2>
            {selectedPartner ? (
              <div className={styles.partnerDetails}>
                <p><strong>Nombre:</strong> {selectedPartner.name}</p>
                <p><strong>Teléfono:</strong> {selectedPartner.phone || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedPartner.email || 'N/A'}</p>
              </div>
            ) : (
              <p className={styles.noClient}>No se ha seleccionado un cliente</p>
            )}
          </div>

          <div className={styles.productsSection}>
            <h2 className={styles.sectionTitle}>Productos/Servicios</h2>
            <div className={styles.searchProduct}>
              <input
                type="text"
                placeholder="Agregar productos..."
                value={searchProduct}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchProduct(value);
                  searchProducts(value);
                }}
                className={styles.searchInput}
              />
              {searchingProducts && <div className={styles.searching}>Buscando...</div>}
              {products.length > 0 && (
                <ul className={styles.dropdown}>
                  {products.map((prod) => (
                    <li
                      key={prod.id}
                      onClick={() => {
                        addOrderLine(prod);
                        setProducts([]);
                        setSearchProduct('');
                      }}
                    >
                      <span className={styles.productCode}>{prod.sku || 'N/A'}</span>
                      <span>{prod.name}</span>
                      <span className={styles.productPrice}>${prod.list_price?.toFixed(2) || '0.00'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {quotationData.order_lines.length > 0 ? (
          <div className={styles.productsTable}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Detalles</th>
                  <th>Cantidad</th>
                  <th>P. Unitario</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotationData.order_lines.map((line, index) => (
                  <tr key={index}>
                    <td>{line.product_name}</td>
                    <td>
                      {line.marca && <div>Marca: {line.marca}</div>}
                      {line.modelo && <div>Modelo: {line.modelo}</div>}
                      {line.piso && line.serie && line.rin && (
                        <div>Medidas: {line.piso}/{line.serie} R{line.rin}</div>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateOrderLine(index, 'quantity', Number(e.target.value))}
                        className={styles.qtyInput}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateOrderLine(index, 'unit_price', Number(e.target.value))}
                        className={styles.priceInput}
                        disabled={user?.role === 'cliente'}
                      />
                    </td>
                    <td>${line.total.toFixed(2)}</td>
                    <td>
                      <button 
                        onClick={() => removeOrderLine(index)}
                        className={styles.removeBtn}
                      >
                        ✖
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No hay productos agregados a la cotización</p>
          </div>
        )}

        <div className={styles.summarySection}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>IVA (16%):</span>
            <span>${iva.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            className={styles.submitBtn}
            disabled={
              loading || 
              !selectedPartner || 
              quotationData.order_lines.length === 0 ||
              quotationData.order_lines.some(line => line.quantity <= 0)
            }
          >
            {loading ? 'Procesando...' : 'Generar Cotización'}
          </button>
          {quotationData.order_lines.some(line => line.quantity <= 0) && (
            <p className={styles.errorText}>Hay productos con cantidad 0 o menor</p>
          )}
        </div>

        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Confirmar Cotización</h3>
              <div>
                <p>Cliente: <strong>{selectedPartner.name}</strong></p>
                <p>Productos: <strong>{quotationData.order_lines.length}</strong></p>
                <p>Total: <strong>${total.toFixed(2)}</strong></p>
              </div>
              <p>¿Deseas generar esta cotización?</p>
              <div className={styles.modalButtons}>
                <button
                  className={`${styles.modalButton} ${styles.modalCancel}`}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className={`${styles.modalButton} ${styles.modalConfirm}`}
                  onClick={confirmSubmit}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuantityUpdated && (
          <div className={styles.quantityUpdatedNotification}>
            Cantidad actualizada para {updatedProductName}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import styles from '../../styles/Odoo/SaleOrderCard.module.css';
import { PiTire } from 'react-icons/pi';
import { FaTools, FaUserCog, FaPlay, FaPause } from 'react-icons/fa';

const parseVehicle = (vehicleStr) => {
  if (!vehicleStr || vehicleStr.toLowerCase().includes("sin vehículo")) {
    return { marca: 'Sin vehículo', modelo: '', placas: '' };
  }
  const parts = vehicleStr.split('/');
  const placas = parts.pop();
  const modelo = parts.pop();
  const marca = parts.join('/');
  return { marca, modelo, placas };
};

const formatPartnerName = (partnerName) => {
  if (!partnerName) return '';
  return partnerName.replace(/^NOMBRE:\s*/i, '');
};

const calculateTimeElapsed = (dateString) => {
  const now = new Date();
  const orderDate = new Date(dateString);
  const diff = now - orderDate;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // Mejor formato para mostrar tiempo
  let text = '';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    text = `${days}d ${remainingHours}h`;
  } else {
    text = `${hours}h ${minutes}m`;
  }
  
  return { hours, minutes, text };
};

export default function SaleOrderCard({ order, onClick }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [iconStates, setIconStates] = useState({
    tire: false,
    tools: false,
    userCog: false
  });
  const [supplierCount, setSupplierCount] = useState(0);

  useEffect(() => {
    if (order.order_lines) {
      let newIconStates = { tire: false, tools: false, userCog: false };
      const suppliers = new Set();
      order.order_lines.forEach(line => {
        if (line.supplier_id?.[1]) suppliers.add(line.supplier_id[1]);

        if (line.product_type === 'service') {
          newIconStates.userCog = true;
        } else if (line.product_type === 'product') {
          if (line.pricelist_item_id?.[1]?.includes('Llantas')) {
            newIconStates.tire = true;
          } else {
            newIconStates.tools = true;
          }
        }
      });
      setIconStates(newIconStates);
      setSupplierCount(suppliers.size);
    }
  }, [order.order_lines]);

  const { marca, modelo, placas } = parseVehicle(order.vehicle_id?.[1] || 'Sin vehículo');
  const { hours, text } = calculateTimeElapsed(order.date_order);

  const dateObj = new Date(order.date_order);
  const fecha = dateObj.toLocaleDateString();
  const hora = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const odooUrl = `https://grupo-jasman.odoo.com/web#id=${order.id}&model=sale.order&view_type=form`;

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(order);
  };

  // Determinar la prioridad basada en el tiempo
  const priorityClass = hours >= 72 ? styles.highPriority : 
                       hours >= 48 ? styles.mediumPriority : 
                       styles.lowPriority;

  return (
    <div className={`${styles.card} ${priorityClass}`}>
      {/* Fila 1: Header */}
      <div className={styles.header}>
        <a href={odooUrl} target="_blank" rel="noopener noreferrer" className={styles.orderName}>
          {order.name}
        </a>
        <span className={styles.orderDate}>{fecha} - {hora}</span>
      </div>

      {/* Fila 2: Imagen del vehículo */}
      <div className={styles.vehicleImageContainer}>
        {order.vehicle_front ? (
          <img
            src={
              order.vehicle_front.startsWith('data:image')
                ? order.vehicle_front
                : `data:image/jpeg;base64,${order.vehicle_front}`
            }
            className={styles.vehicleImage}
            alt="Vehículo"
          />
        ) : (
          <div className={styles.vehicleImagePlaceholder}>Sin Foto</div>
        )}
      </div>

      {/* Fila 3: Partner */}
      <div className={styles.partnerContainer}>
        <div className={styles.partner}>{formatPartnerName(order.partner_id?.[1])}</div>
      </div>

      {/* Fila 4: Placas + Detalles + Tiempo */}
      <div className={styles.detailsGrid}>
        <div className={styles.plates}>{placas || 'Sin placas'}</div>
        <div className={styles.vehicleDetails}>
          {marca === 'Sin vehículo' ? marca : `${marca}${modelo ? ` / ${modelo}` : ''}`}
        </div>
        <div className={styles.time}>
          <span className={`${styles.timeBadge} ${hours >= 78 ? styles.danger : hours >= 48 ? styles.warning : ''}`}>
            {text}
          </span>
        </div>
      </div>

      {/* Fila 5: Iconos + Montos */}
      <div className={styles.iconsAmountRow}>
        <div className={styles.iconsRow}>
          <PiTire className={styles.icon} style={{ color: iconStates.tire ? '#dc3545' : '#555' }} />
          <FaUserCog className={styles.icon} style={{ color: iconStates.userCog ? '#dc3545' : '#555' }} />
          <FaTools className={styles.icon} style={{ color: iconStates.tools ? '#dc3545' : '#555' }} />
          {supplierCount > 0 && <span className={styles.supplierCount}>({supplierCount})</span>}
        </div>
        <div className={styles.amountSection}>
          <div className={styles.amountLine}>Total: ${order.amount_total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div className={styles.amountLine}>Margen: {(order.margin_percent * 100).toFixed(2)}%</div>
        </div>
      </div>

      {/* Fila 6: Footer */}
      <div className={styles.footer}>
        <button className={styles.playButton} onClick={handleToggle}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button className={styles.detailsButton} onClick={handleClick}>
          Ver detalles
        </button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import styles from '../../../styles/Odoo/ModalOptions.module.css';
import { FaBicycle, FaMotorcycle, FaCar, FaTimes } from 'react-icons/fa';

export default function ModalOptions({ onClose, order }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [notes, setNotes] = useState('');

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    // Aquí puedes manejar el envío de los datos
    console.log({
      option: selectedOption,
      notes,
      orderId: order.id
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes />
        </button>
        
        <h3>Opciones para {order.name}</h3>
        
        <div className={styles.radioOptions}>
          <label className={`${styles.radioTile} ${selectedOption === 'jasman' ? styles.selected : ''}`}>
            <input 
              type="radio" 
              name="serviceOption" 
              className={styles.radioInput}
              onChange={() => handleOptionChange('jasman')}
            />
            <span className={styles.radioIcon}>
              <FaBicycle />
            </span>
            <span className={styles.radioLabel}>Jasman</span>
          </label>
          
          <label className={`${styles.radioTile} ${selectedOption === 'proveedor' ? styles.selected : ''}`}>
            <input 
              type="radio" 
              name="serviceOption" 
              className={styles.radioInput}
              onChange={() => handleOptionChange('proveedor')}
            />
            <span className={styles.radioIcon}>
              <FaMotorcycle />
            </span>
            <span className={styles.radioLabel}>Proveedor</span>
          </label>
          
          <label className={`${styles.radioTile} ${selectedOption === 'cliente' ? styles.selected : ''}`}>
            <input 
              type="radio" 
              name="serviceOption" 
              className={styles.radioInput}
              onChange={() => handleOptionChange('cliente')}
            />
            <span className={styles.radioIcon}>
              <FaCar />
            </span>
            <span className={styles.radioLabel}>Cliente</span>
          </label>
        </div>
        
        <div className={styles.notesSection}>
          <label htmlFor="notes">Anotaciones:</label>
          <textarea
            id="notes"
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe aquí tus anotaciones..."
          />
        </div>
        
        <button 
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!selectedOption}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
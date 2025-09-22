import React from 'react';
import styles from '../styles/Components/SessionExpiredModal.module.css';

const SessionExpiredModal = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Añade un console.log para depuración
    console.log('Botón Aceptar clickeado');
    onConfirm(); // Llama a la función prop
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Sesión Expirada</h2>
        <p>Tu sesión ha caducado. Por favor, inicia sesión nuevamente.</p>
        <button 
          onClick={handleConfirm} 
          className={styles.modalButton}
          aria-label="Cerrar modal y redirigir a login"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
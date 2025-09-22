// components/admin/Modal.js
import React, { useEffect } from 'react'; // Importa React y useEffect
import styles from '../../styles/admin/Modal.module.css';

const Modal = ({ children, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
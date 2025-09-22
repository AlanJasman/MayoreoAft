import { FiX, FiCheckCircle } from 'react-icons/fi';
import Modal from 'react-modal';
import styles from '../../styles/settings_userDashboard.module.css';

Modal.setAppElement('#__next');

export default function SuccessModalApiKey({ isOpen, onClose, onContinue }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="API Key validada"
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>
          <FiCheckCircle 
            style={{ 
              verticalAlign: 'middle', 
              marginRight: '0.5rem',
              color: '#388e3c'
            }} 
          /> 
          API Key validada
        </h2>
        <button 
          onClick={onClose} 
          className={styles.closeModalButton}
          aria-label="Cerrar modal"
        >
          <FiX size={24} />
        </button>
      </div>
      
      <div className={styles.successContent}>
        <p>Tu API Key ha sido validada y guardada correctamente.</p>
        
        <div className={styles.successButtons}>
          <button 
            onClick={onContinue} 
            className={styles.successContinueButton}
          >
            Continuar
          </button>
          <button 
            onClick={onClose} 
            className={styles.successCloseButton}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
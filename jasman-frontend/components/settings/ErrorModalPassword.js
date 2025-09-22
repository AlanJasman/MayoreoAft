import { FiX, FiAlertCircle } from 'react-icons/fi';
import Modal from 'react-modal';
import styles from '../../styles/settings_userDashboard.module.css';

Modal.setAppElement('#__next');

export default function ErrorModalPassword({ isOpen, onClose, errorMessage }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Error en contraseña"
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>
          <FiAlertCircle 
            style={{ 
              verticalAlign: 'middle', 
              marginRight: '0.5rem',
              color: '#d32f2f'
            }} 
          /> 
          Error al cambiar contraseña
        </h2>
        <button 
          onClick={onClose} 
          className={styles.closeModalButton}
          aria-label="Cerrar modal de error"
        >
          <FiX size={24} />
        </button>
      </div>
      
      <div className={styles.errorContent}>
        <p>{errorMessage || 'Ocurrió un error al intentar cambiar la contraseña.'}</p>
        
        <button 
          onClick={onClose} 
          className={styles.errorActionButton}
        >
          Entendido
        </button>
      </div>
    </Modal>
  );
}
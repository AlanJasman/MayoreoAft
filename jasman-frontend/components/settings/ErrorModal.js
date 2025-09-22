import { FiX, FiXCircle } from 'react-icons/fi';
import Modal from 'react-modal';

import styles from '../../styles/settings_userDashboard.module.css';

Modal.setAppElement('#__next');

export default function ErrorModal({ isOpen, onClose, title, detail }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Error"
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>
          <FiXCircle 
            style={{ 
              verticalAlign: 'middle', 
              marginRight: '0.5rem',
              color: '#d32f2f'
            }} 
          /> 
          {title}
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
        <p>{detail}</p>
        
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
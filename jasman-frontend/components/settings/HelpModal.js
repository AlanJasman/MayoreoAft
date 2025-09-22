import { FiX } from 'react-icons/fi';
import Modal from 'react-modal';
import styles from '../../styles/settings_userDashboard.module.css';

Modal.setAppElement('#__next');

export default function HelpModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Ayuda API Key"
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>Cómo obtener tu API Key de Odoo</h2>
        <button 
          onClick={onClose} 
          className={styles.closeModalButton}
          aria-label="Cerrar modal"
        >
          <FiX size={24} />
        </button>
      </div>
      
      <div className={styles.modalContent}>
        <p className={styles.instructionsIntro}>Sigue estos pasos detallados para generar tu API Key en Odoo:</p>
        
        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Iniciar sesión en Odoo</div>
            <div className={styles.stepDescription}>
              Accede a tu instancia de Odoo con credenciales de administrador
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Ir a Configuración de Usuario</div>
            <div className={styles.stepDescription}>
              Haz clic en tu avatar (esquina superior derecha) → Selecciona "Preferencias"
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Navegar a Seguridad</div>
            <div className={styles.stepDescription}>
              En el menú izquierdo, selecciona la pestaña "Seguridad"
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Generar Nueva API Key</div>
            <div className={styles.stepDescription}>
              Busca la sección "Claves API" → Haz clic en "Generar nueva clave"
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>5</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Confirmar Identidad</div>
            <div className={styles.stepDescription}>
              Ingresa tu contraseña actual cuando se solicite
            </div>
          </div>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepNumber}>6</div>
          <div className={styles.stepContent}>
            <div className={styles.stepTitle}>Copiar y Guardar</div>
            <div className={styles.stepDescription}>
              La clave se mostrará solo una vez. Cópiala inmediatamente en la plaforma de JasmanApp.
            </div>
          </div>
        </div>

        <div className={styles.apiKeyNote}>
          <strong>Notas importantes:</strong>
          <ul className={styles.noteList}>
            <li>Si pierdes la clave, deberás generar una nueva</li>

          </ul>
        </div>
      </div>
    </Modal>
  );
}
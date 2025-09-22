import { useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import ApiKeyForm from './ApiKeyForm';
import HelpModal from './HelpModal';
import styles from '../../styles/settings_userDashboard.module.css';

export default function SecuritySettings({
  setSuccessMsg,
  setShowErrorModal,
  setErrorTitle,
  setErrorDetail,
  setShowApiKeySuccess,
  successMsg,
  errorMsg
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={styles.settingsSection}>
      <h3><FiSettings size={24} /> Configuración de Seguridad</h3>

      <ApiKeyForm 
        setSuccessMsg={setSuccessMsg}
        setShowErrorModal={setShowErrorModal}
        setErrorTitle={setErrorTitle}
        setErrorDetail={setErrorDetail}
        setShowApiKeySuccess={setShowApiKeySuccess}
        showHelp={() => setShowHelp(true)}
      />

      {successMsg && <div className={styles.successMessage}>{successMsg}</div>}
      {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
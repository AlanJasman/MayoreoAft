import { FiHelpCircle } from 'react-icons/fi';
import styles from '../../styles/settings_userDashboard.module.css';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ApiKeyForm({
  setSuccessMsg,
  setShowErrorModal,
  setErrorTitle,
  setErrorDetail,
  showHelp,
  setShowApiKeySuccess
}) {
  const [apiKey, setApiKey] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Obtener el token con la clave correcta
    const token = localStorage.getItem('jasman_auth_token');
    console.log('Token que se enviará:', token);
    console.log('URL del backend:', process.env.NEXT_PUBLIC_BACKEND_URL);
    
    setSuccessMsg('');

    // Validar si no hay token
    if (!token) {
      setErrorTitle('Sesión no encontrada');
      setErrorDetail('Por favor inicia sesión nuevamente');
      setShowErrorModal(true);
      router.push('/login');
      return;
    }

    // Validar API Key vacía
    if (!apiKey.trim()) {
      setErrorTitle('API Key vacía');
      setErrorDetail('Debes introducir una API key antes de guardar.');
      setShowErrorModal(true);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/update-apikey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ odoo_api_key: apiKey })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setErrorTitle('Error al validar API Key');
        setErrorDetail(errorData.detail || 'La API Key no es válida.');
        setShowErrorModal(true);
        return;
      }

      // Éxito
      setSuccessMsg('✅ API Key guardada correctamente');
      setShowApiKeySuccess(true);
      setApiKey('');
    } catch (err) {
      setErrorTitle('Error inesperado');
      setErrorDetail(err.message || 'Ocurrió un error al conectar con el servidor');
      setShowErrorModal(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.settingItem}>
      <div className={styles.settingContent}>
        <h4>
          API Key de Odoo
          <button
            type="button"
            onClick={showHelp}
            className={styles.helpIconButton}
            aria-label="Ayuda API Key"
          >
            <FiHelpCircle size={18} />
          </button>
        </h4>
        <p>Introduce tu API Key para conectar con Odoo</p>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="abcd1234odookey..."
          className={styles.inputField}
        />
        <button type="submit" className={styles.actionButton}>Guardar API Key</button>
      </div>
    </form>
  );
}
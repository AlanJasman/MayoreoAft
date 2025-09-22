import { useState } from 'react';
import { FiKey, FiEdit2 } from 'react-icons/fi';
import styles from '../../styles/settings_userDashboard.module.css';

export default function PasswordForm({
  setSuccessMsg,
  setErrorMsg,
  setShowPasswordError,
  setShowPasswordSuccess,
  setPasswordError
}) {
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setPasswordError(errorData.message || 'Error al cambiar la contraseña');
        setShowPasswordError(true);
        return;
      }

      setShowPasswordSuccess(true);
      setNewPassword('');
    } catch (err) {
      setPasswordError('Error de conexión al cambiar la contraseña');
      setShowPasswordError(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.settingItem}>
      <div className={styles.settingContent}>
        <h4><FiKey size={18} /> Cambiar contraseña</h4>
        <p>Actualiza tu contraseña de acceso</p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          className={styles.inputField}
        />
        <button type="submit" className={styles.actionButton}>
          <FiEdit2 size={16} /> Cambiar
        </button>
      </div>
    </form>
  );
}
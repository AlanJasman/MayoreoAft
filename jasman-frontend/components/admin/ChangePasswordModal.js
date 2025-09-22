import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/admin/AdminTable.module.css'; 

const ChangePasswordModal = ({ user, onClose, onComplete, currentUserRole }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validaciones
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const token = currentUser?.token || localStorage.getItem('jasman_auth_token');
      
      const payload = {
        new_password: newPassword
      };

      // Si es admin cambiando contraseña de otro usuario
      if (user.id !== currentUser.id && 
          (currentUserRole === 'admin' || currentUserRole === 'sistemas')) {
        payload.user_id = user.id;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al cambiar contraseña');
      }

      onComplete({
        success: true,
        message: data.message
      });

    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message);
      onComplete({
        success: false,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const isChangingOwnPassword = user.id === currentUser?.id;
  const isAdminChangingOther = !isChangingOwnPassword && 
                              (currentUserRole === 'admin' || currentUserRole === 'sistemas');

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            {isChangingOwnPassword ? 'Cambiar Mi Contraseña' : 
             isAdminChangingOther ? `Cambiar Contraseña de ${user.nombre}` :
             'Cambiar Contraseña'}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
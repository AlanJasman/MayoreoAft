// pages/dashboard.js
import { useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/auth/withAuth';
import { useAuth } from '../context/AuthContext';
import { toggleFaceAuth } from '../lib/auth';
import Navigation from '../components/nav/Navigation';
import {
  FiUser, FiMail, FiKey, FiSettings,
  FiCamera, FiCheckCircle, FiXCircle, FiMapPin,
  FiLock, FiEdit2, FiSave, FiX
} from 'react-icons/fi';
import styles from '../styles/user.module.css';
import DynamicBreadcrumbs from '../components/nav/DynamicBreadcrumbs';

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleFaceAuthToggle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await toggleFaceAuth();
      // Aquí podrías actualizar el estado del usuario si es necesario
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validaciones
    if (passwordData.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_password: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al cambiar contraseña');
      }

      setSuccess('Contraseña cambiada exitosamente');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError(null);
    setSuccess(null);
  };

  return (
    <ProtectedRoute>
      <div className={styles.dashboardContainer}>
        <Head>
          <title>Mi Perfil - Mayoreo Jasman</title>
          <meta name="description" content="Panel de control de usuario" />
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <main className={styles.mainContent}>
          <div className={styles.profileCard}>
            <div className={styles.avatarContainer}>
              {user?.supabase_face_url ? (
                <img
                  src={user.supabase_face_url}
                  alt="Foto de perfil"
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {user?.nombre?.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.profileHeader}>
                <h1 className={styles.userName}>{user?.nombre}</h1>
                <span className={`${styles.roleBadge} ${user?.role === 'admin' ? styles.adminBadge : styles.userBadge}`}>
                  {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <FiUser className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Nombre completo</p>
                    <p className={styles.infoValue}>{user?.nombre}</p>
                  </div>
                </div>
                
                <div className={styles.infoItem}>
                  <FiUser className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Código de usuario</p>
                    <p className={styles.infoValue}>{user?.codigo_usuario}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <FiMail className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Correo electrónico</p>
                    <p className={styles.infoValue}>{user?.correo}</p>
                  </div>
                </div>

                {user?.employee_number && (
                  <div className={styles.infoItem}>
                    <FiKey className={styles.infoIcon} />
                    <div>
                      <p className={styles.infoLabel}>Número de empleado</p>
                      <p className={styles.infoValue}>{user.employee_number}</p>
                    </div>
                  </div>
                )}

                {user?.branch && (
                  <div className={styles.infoItem}>
                    <FiMapPin className={styles.infoIcon} />
                    <div>
                      <p className={styles.infoLabel}>Sucursal</p>
                      <p className={styles.infoValue}>{user.branch}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección de Cambio de Contraseña */}
              <div className={styles.passwordSection}>
                <div className={styles.sectionHeader}>
                  <FiLock className={styles.sectionIcon} />
                  <h3>Seguridad</h3>
                  {!isChangingPassword ? (
                    <button
                      className={styles.editButton}
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <FiEdit2 /> Cambiar Contraseña
                    </button>
                  ) : (
                    <button
                      className={styles.cancelButton}
                      onClick={cancelPasswordChange}
                    >
                      <FiX /> Cancelar
                    </button>
                  )}
                </div>

                {isChangingPassword ? (
                  <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor="newPassword">Nueva Contraseña</label>
                      <input
                        type="password"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })}
                        placeholder="Mínimo 8 caracteres"
                        required
                        minLength={8}
                        className={styles.passwordInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })}
                        placeholder="Repite la contraseña"
                        required
                        className={styles.passwordInput}
                      />
                    </div>

                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {success && <div className={styles.successMessage}>{success}</div>}

                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Cambiando...' : (
                          <>
                            <FiSave /> Guardar Contraseña
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className={styles.passwordHint}>
                    Contraseña segura: Mínimo 8 caracteres, incluyendo letras y números.
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
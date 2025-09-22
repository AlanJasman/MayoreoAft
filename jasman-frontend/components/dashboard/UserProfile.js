import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  FiUser, FiMail, FiKey, FiLogOut, FiSettings, 
  FiCamera, FiCheckCircle, FiXCircle, FiEdit2 
} from 'react-icons/fi';
import styles from '../../styles/settingsuserDashboard.module.css';

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faceAuthEnabled, setFaceAuthEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setFaceAuthEnabled(userData.use_face_auth);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const toggleFaceAuth = async () => {
    try {
      const response = await fetch('/api/auth/toggle-face-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !faceAuthEnabled })
      });

      if (response.ok) {
        setFaceAuthEnabled(!faceAuthEnabled);
      }
    } catch (error) {
      console.error('Error toggling face auth:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando datos del usuario...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.error}>
        <FiXCircle size={48} />
        <p>No se pudo cargar la información del usuario</p>
        <button 
          onClick={() => window.location.reload()}
          className={styles.actionButton}
        >
          <FiRefreshCw size={16} /> Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Mi Perfil</h1>
      </div>

      <div className={styles.profileSection}>
        <div className={styles.profileImageContainer}>
          {user.supabase_face_url ? (
            <img 
              src={user.supabase_face_url} 
              alt="Foto de perfil" 
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.profileInitials}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>

        <div className={styles.userInfo}>
          <h2>
            {user.name}
            <span className={`${styles.roleBadge} ${styles[user.role]}`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </h2>
          
          <p>
            <strong><FiUser size={16} /> Nombre:</strong> {user.name}
          </p>
          
          <p>
            <strong><FiMail size={16} /> Email:</strong> {user.email}
          </p>
          
          {user.employee_number && (
            <p>
              <strong><FiKey size={16} /> N° Empleado:</strong> {user.employee_number}
            </p>
          )}
          
          {user.branch && (
            <p>
              <strong><FiMapPin size={16} /> Sucursal:</strong> {user.branch}
            </p>
          )}
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3><FiSettings size={24} /> Configuración de seguridad</h3>
        
        <div className={styles.settingItem}>
          <div className={styles.settingContent}>
            <h4><FiCamera size={18} /> Autenticación Facial</h4>
            <p>Inicia sesión con reconocimiento facial</p>
          </div>
          <button 
            onClick={toggleFaceAuth}
            className={`${styles.toggleButton} ${faceAuthEnabled ? styles.active : ''}`}
          >
            {faceAuthEnabled ? (
              <>
                <FiCheckCircle size={16} /> Desactivar
              </>
            ) : (
              <>
                <FiXCircle size={16} /> Activar
              </>
            )}
          </button>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingContent}>
            <h4><FiKey size={18} /> Cambiar contraseña</h4>
            <p>Actualiza tu contraseña de acceso</p>
          </div>
          <button 
            onClick={() => router.push('/change-password')}
            className={styles.actionButton}
          >
            <FiEdit2 size={16} /> Cambiar
          </button>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className={styles.logoutButton}
      >
        <FiLogOut size={18} /> Cerrar sesión
      </button>
    </div>
  );
}
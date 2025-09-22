import { FiUser, FiMail, FiKey, FiMapPin } from 'react-icons/fi';
import styles from '../../styles/settings_userDashboard.module.css';

export default function ProfileSection({ user }) {
  return (
    <div className={styles.profileSection}>
      <div className={styles.profileImageContainer}>
        {user?.supabase_face_url ? (
          <img
            src={user.supabase_face_url}
            alt="Foto de perfil"
            className={styles.profileImage}
          />
        ) : (
          <div className={styles.profileInitials}>
            {user?.name?.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>

      <div className={styles.userInfo}>
        <h2>
          {user?.name}
          <span className={`${styles.roleBadge} ${user?.role === 'admin' ? styles.admin : styles.user}`}>
            {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
        </h2>

        <p><strong><FiUser size={16} /> Nombre:</strong> {user?.name}</p>
        <p><strong><FiMail size={16} /> Email:</strong> {user?.email}</p>
        {user?.employee_number && (
          <p><strong><FiKey size={16} /> N° Empleado:</strong> {user.employee_number}</p>
        )}
        {user?.branch && (
          <p><strong><FiMapPin size={16} /> Sucursal:</strong> {user.branch}</p>
        )}
      </div>
    </div>
  );
}
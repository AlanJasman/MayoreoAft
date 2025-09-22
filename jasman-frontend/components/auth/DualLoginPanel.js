import LoginForm from './LoginForm';
import styles from '../../styles/Login/DualLoginPanel.module.css';

export default function DualLoginPanel() {
  return (
    <div className={styles.panelContainer}>

      <div className={styles.panel}>
        <LoginForm />
        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>o</span>
          <span className={styles.dividerLine}></span>
        </div>
        <div className={styles.linksContainer}>
          <a href="/register" className={styles.linkButton}>
            Crear una cuenta
          </a>
          <a href="/forgot-password" className={styles.secondaryLink}>
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}
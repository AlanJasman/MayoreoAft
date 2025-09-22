import Head from 'next/head';
import RegisterForm from '../components/auth/RegisterForm';
import styles from '../styles/Register/RegisterPage.module.css';

export default function RegisterPage() {
  const handleRegistrationSuccess = () => {
    // Redirigir al login después del registro exitoso
    window.location.href = '/login?registered=true';
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Registro - Mayoreo JasmanApp</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.registerLayout}>
          <div className={styles.imageSection}>
            <div className={styles.imageContent}>
              <h2>Únete a Mayoreo JasmanApp</h2>
              <p>Regístrate para acceder a todos nuestros servicios</p>
            </div>
          </div>
          <div className={styles.formSection}>
            <RegisterForm onSuccess={handleRegistrationSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
import Head from 'next/head';
import LoginForm from '../components/auth/LoginForm';
import styles from '../styles/Login/Home.module.css';

export default function Home() {
  return (
    <div className={styles.pageWrapper}>
      <Head>
        <title>Mayoreo AFT</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.loginLayout}>
          <div className={styles.imageSection}>
            <div className={styles.imageContent}>
              <h2>Bienvenido a Mayoreo AFT</h2>
              <p>Equipos para Llantera y Taller.</p>
            </div>
          </div>
          <div className={styles.formSection}>
        <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
import { useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/auth/withAuth';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiClock } from 'react-icons/fi';
import styles from '../styles/SettingsUser.module.css';

export default function SettingsUser() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Validación Pendiente - All for Tires</title>
        </Head>

        <div className={styles.waitingContainer}>
          <div className={styles.waitingIcon}>
            <FiClock size={48} />
          </div>
          
          <h1 className={styles.waitingTitle}>Validación en Progreso</h1>
          
          <div className={styles.waitingMessage}>
            <p>Gracias por registrarte, {user?.nombre || 'usuario'}.</p>
            <p>Actualmente estamos verificando tu información con tu proveedor.</p>
            <p>Recibirás un correo electrónico una vez que tu cuenta haya sido validada.</p>
          </div>

          <div className={styles.userInfo}>
            <h3>Tu información:</h3>
            <p><strong>Nombre:</strong> {user?.nombre || 'No disponible'}</p>
            <p><strong>Correo:</strong> {user?.correo || 'No disponible'}</p>

          </div>

          <button onClick={handleLogout} className={styles.logoutButton}>
            <FiLogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
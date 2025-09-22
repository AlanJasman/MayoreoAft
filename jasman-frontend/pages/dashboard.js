import { useState, useEffect } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../components/auth/withAuth';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/nav/Navigation';
import DynamicBreadcrumbs from '../components/nav/DynamicBreadcrumbs';
import styles from '../styles/Dashboard/Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();



  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Dashboard - JasmanApp</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />


      </div>
    </ProtectedRoute>
  );
}

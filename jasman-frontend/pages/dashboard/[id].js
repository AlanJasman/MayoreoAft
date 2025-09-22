'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Añade useParams
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/withAuth';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import CotizacionDetail from '../../components/Cotizaciones/CotizacionDetail';
import styles from '../../styles/Dashboard/Dashboard.module.css';
import Head from 'next/head';

export default function CotizacionDetailPage() { // Quita { params } de los parámetros
  const router = useRouter();
  const params = useParams(); // Usa el hook useParams
  const { user, logout } = useAuth();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchWithAuth = async (url, options = {}) => {
    const token = user?.token || localStorage.getItem('jasman_auth_token');
    
    if (!token) {
      logout();
      throw new Error('No autenticado');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      logout();
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error en la solicitud');
    }

    return response;
  };

  const mapCotizacionData = (cotizacionData) => {
    return {
      id: cotizacionData.id,
      id_cotizacion: cotizacionData.id_cotizacion,
      cliente_id: cotizacionData.cliente_id,
      cliente_nombre: cotizacionData.cliente?.nombre || 'Cliente',
      cliente_email: cotizacionData.cliente?.correo || '',
      cliente_telefono: cotizacionData.cliente?.telefono || 'No teléfono',
      cliente_direccion: cotizacionData.cliente?.direccion || '',
      estado: cotizacionData.estado,
      observaciones: cotizacionData.observaciones,
      total: cotizacionData.total,
      subtotal: cotizacionData.subtotal,
      impuestos: cotizacionData.impuestos || cotizacionData.total - cotizacionData.subtotal,
      fecha_creacion: cotizacionData.fecha,
      fecha_vencimiento: cotizacionData.fecha_vencimiento,
      detalle_cotizacion: cotizacionData.detalle_cotizacion || [],
      usuario_id: cotizacionData.usuario_id,
      partner_id: cotizacionData.partner_id,
      usuario: cotizacionData.usuario,
      partner: cotizacionData.partner
    };
  };

  const fetchCotizacion = async (id) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${BACKEND_URL}/cotizaciones/${id}`);
      const data = await response.json();
    console.log('Data from backend:', data); 

      const formattedCotizacion = mapCotizacionData(data);
      setCotizacion(formattedCotizacion);
    } catch (error) {
      console.error('Error fetching cotizacion:', error);
      alert('Error al cargar la cotización');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

const handleUpdateCotizacion = async (cotizacionId, updateData) => {
  try {
    const response = await fetchWithAuth(`${BACKEND_URL}/cotizaciones/${cotizacionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    const updatedCotizacion = await response.json();
    const formattedCotizacion = mapCotizacionData(updatedCotizacion);
    
    setCotizacion(formattedCotizacion);
    alert('Cotización actualizada correctamente');
    return formattedCotizacion;
  } catch (error) {
    console.error('Error updating cotizacion:', error);
    throw new Error('Error al actualizar cotización');
  }
};


  useEffect(() => {
    if (params?.id) { 
      fetchCotizacion(params.id);
    }
  }, [params?.id]);

  const handleBack = () => {
    router.push('/dashboard/cotizaciones');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>
          <Head>
            <title>Cargando cotización...</title>
          </Head>
          <Navigation />
          <DynamicBreadcrumbs />
          <div className={styles.mainContent}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              Cargando cotización...
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!cotizacion) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>
          <Head>
            <title>Cotización no encontrada</title>
          </Head>
          <Navigation />
          <DynamicBreadcrumbs />
          <div className={styles.mainContent}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>Cotización no encontrada</h2>
              <button onClick={handleBack} style={{ marginTop: '1rem' }}>
                Volver al dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Cotización #{cotizacion.id_cotizacion}</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.mainContent}>
          <CotizacionDetail
            cotizacion={cotizacion}
            onBack={handleBack}
            user={user}
            onUpdate={handleUpdateCotizacion}

          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
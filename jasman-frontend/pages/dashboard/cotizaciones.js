'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/withAuth';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import CotizacionesList from '../../components/Cotizaciones/CotizacionesList';
import styles from '../../styles/Dashboard/Dashboard.module.css';
import Head from 'next/head';

export default function CotizacionesPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    estado: '',
    page: 1,
    per_page: 12
  });
  const [pagination, setPagination] = useState({});
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

  const mapCotizacionData = (cotizacion) => {
    return {
      id: cotizacion.id,
      id_cotizacion: cotizacion.id_cotizacion,
      cliente_id: cotizacion.cliente_id,
      cliente_nombre: cotizacion.cliente?.nombre || 'Cliente',
      cliente_email: cotizacion.cliente?.correo || '',
      cliente_telefono: cotizacion.cliente?.telefono || 'Sin teléfono',
      estado: cotizacion.estado,
      observaciones: cotizacion.observaciones,
      total: cotizacion.total,
      subtotal: cotizacion.subtotal,
      fecha_creacion: cotizacion.fecha,
      detalle_cotizacion: cotizacion.detalle_cotizacion || [],
      usuario_id: cotizacion.usuario_id,
      partner_id: cotizacion.partner_id
    };
  };

  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      const url = new URL(`${BACKEND_URL}/cotizaciones/`);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });

      const response = await fetchWithAuth(url.toString());
      const data = await response.json();
      
      const formattedCotizaciones = data.data.map(mapCotizacionData);
      
      setCotizaciones(formattedCotizaciones);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Error fetching cotizaciones:', error);
      alert('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCotizacion = (cotizacion) => {
    setSelectedCotizacion(cotizacion);
    setIsModalOpen(true);
  };

  const handleViewCotizacion = (cotizacion) => {
    router.push(`/dashboard/${cotizacion.id}`);
  };

  const handleDeleteCotizacion = async (cotizacionId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cotización?')) return;

    try {
      const response = await fetchWithAuth(`${BACKEND_URL}/cotizaciones/${cotizacionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Cotización eliminada correctamente');
        fetchCotizaciones();
      }
    } catch (error) {
      console.error('Error deleting cotizacion:', error);
      alert('Error al eliminar cotización');
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
      
      setCotizaciones(prev => prev.map(cot => 
        cot.id === cotizacionId ? formattedCotizacion : cot
      ));
      
      setIsModalOpen(false);
      alert('Cotización actualizada correctamente');
    } catch (error) {
      console.error('Error updating cotizacion:', error);
      alert('Error al actualizar cotización');
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  useEffect(() => {
    fetchCotizaciones();
  }, [filters]);

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Gestión de Cotizaciones</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.mainContent}>
          <CotizacionesList
            cotizaciones={cotizaciones}
            loading={loading}
            onEdit={handleEditCotizacion}
            onView={handleViewCotizacion}
            onDelete={handleDeleteCotizacion}
            filters={filters}
            pagination={pagination}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            user={user}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
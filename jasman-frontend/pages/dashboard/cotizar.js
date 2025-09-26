'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/auth/withAuth';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import Cotizacion from '../../components/Cotizacion/Cotizacion';
import styles from '../../styles/Dashboard/Dashboard.module.css';
import Head from 'next/head';

export default function CreateQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Función genérica para fetch con autenticación
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

  // Buscar clientes (usuarios con rol cliente)
  const handleSearchPartners = async (term) => {
    try {
      const url = new URL(`${BACKEND_URL}/cotizaciones/buscar-usuarios`);
      url.searchParams.append('search', term);
      url.searchParams.append('role', 'cliente');
      url.searchParams.append('page', '1');
      url.searchParams.append('per_page', '10');

      const response = await fetchWithAuth(url.toString());
      const { data } = await response.json();

      return data.map(user => ({
        id: user.id,
        name: user.nombre,
        phone: user.telefono || '',
        email: user.correo,
        ruc: user.ruc || '' // Agregar más campos si es necesario
      }));
    } catch (error) {
      console.error('Error buscando clientes:', error.message);
      return [];
    }
  };

  // Buscar productos por SKU o nombre
  const handleSearchProducts = async (term) => {
    try {
      const url = new URL(`${BACKEND_URL}/cotizaciones/buscar-productos`);
      url.searchParams.append('search', term);
      url.searchParams.append('page', '1');
      url.searchParams.append('per_page', '10');

      const response = await fetchWithAuth(url.toString(), {
        headers: {
          'X-App-Version': 'aft'  // ← AÑADE ESTA LÍNEA
        }
      });
      const { data } = await response.json();

      return data.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        list_price: product.price || 0, 
        piso: product.piso,
        serie: product.serie,
        rin: product.rin,
        marca: product.marca,
        modelo: product.modelo,
        carga_velocidad: product.carga_velocidad
      }));
    } catch (error) {
      console.error('Error buscando productos:', error.message);
      return [];
    }
  };

  // Crear nueva cotización
const handleSaveQuotation = async (quotationData) => {
  try {
    // Preparar datos según el modelo del backend
    const payload = {
      cliente_id: quotationData.partner_id,
      observaciones: quotationData.notes || '',
      estado: quotationData.status || 'nueva',
      total: quotationData.total, // Usamos el total calculado
      subtotal: quotationData.subtotal, // Usamos el subtotal calculado
      detalles: quotationData.order_lines.map(item => ({
        codigo: item.sku || item.product_id, // Asegurarnos de incluir el SKU
        cantidad: item.quantity,
        precio_unitario: item.unit_price,
      })),
    };

    const response = await fetchWithAuth(`${BACKEND_URL}/cotizaciones/`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    router.push(`/dashboard/cotizaciones/`);
    return result;
  } catch (error) {
    console.error('Error al guardar cotización:', error.message);
    throw error;
  }
};

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Crear Cotización</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.mainContent}>
          <Cotizacion
            onSave={handleSaveQuotation}
            onSearchPartners={handleSearchPartners}
            onSearchProducts={handleSearchProducts}
            searchParams={searchParams}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
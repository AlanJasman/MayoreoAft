import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '../../components/auth/withAuth';
import Navigation from '../../components/nav/Navigation';
import DynamicBreadcrumbs from '../../components/nav/DynamicBreadcrumbs';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/admin/Admin.module.css';
import UsersTable from '../../components/admin/UsersTable';
import PriceUploadModal from '../../components/admin/PriceUploadModal';

export default function AdminUsuarios() {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  const handleUploadComplete = (result) => {
    setUploadResult(result);
    setTimeout(() => {
      setUploadResult(null);
      setShowPriceModal(false);
    }, 10000);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchUsuarios = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const token = user?.token || localStorage.getItem('jasman_auth_token');
      const url = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/`);
      
      url.searchParams.append('page', page);
      url.searchParams.append('per_page', pagination.per_page);
      if (search) {
        url.searchParams.append('search', search);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error('Error al obtener usuarios');
      }

      const data = await response.json();
      setUsuarios(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      setMessage('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUsuarios(pagination.page, searchTerm);
  }, [user, searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchUsuarios(newPage, searchTerm);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE este usuario? Esta acción no se puede deshacer.')) return;
    
    const token = user?.token || localStorage.getItem('jasman_auth_token');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al eliminar usuario');

      setMessage('Usuario eliminado correctamente');
      fetchUsuarios(pagination.page, searchTerm);
    } catch (err) {
      console.error(err);
      setMessage('Error al eliminar usuario');
    }
  };

const handleUserUpdate = async (updatedUser) => {
  const token = user?.token || localStorage.getItem('jasman_auth_token');
  
  try {
    if (!updatedUser?.id) {
      throw new Error('Usuario no válido para actualización');
    }

    const payload = {
      nombre: updatedUser.nombre || '',
      empresa: updatedUser.empresa || '',
      validated: updatedUser.validado
    };

    if (user?.role === 'admin') {
      payload.role = updatedUser.rol;
      
      if (updatedUser.codigo_partner !== undefined) {
        // Caso 1: Eliminar partner
        if (!updatedUser.codigo_partner) {
          payload.parent_partner_id = null;
        } 
        // Caso 2: Cambiar partner
        else if (updatedUser.codigo_partner !== (user.codigo_partner || '')) {
          if (updatedUser.codigo_partner === updatedUser.codigo_usuario) {
            throw new Error('No puedes asignarte a ti mismo como partner');
          }

          try {
            const partnerResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/user-by-code/${encodeURIComponent(updatedUser.codigo_partner)}`, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (!partnerResponse.ok) {
              const errorData = await partnerResponse.json().catch(() => ({}));
              throw new Error(errorData.detail || 'Partner no encontrado');
            }

            const partnerData = await partnerResponse.json();
            payload.parent_partner_id = partnerData.id;
          } catch (error) {
            console.error('Error buscando partner:', error);
            throw new Error('Error al validar el código partner');
          }
        }
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/${updatedUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error al actualizar usuario');
    }

    const data = await response.json();
    setUsuarios(prev => prev.map(u => u.id === updatedUser.id ? data : u));
    setMessage('Usuario actualizado correctamente');
    return data;
  } catch (err) {
    console.error('Error en actualización:', err);
    setMessage(err.message.includes('fetch') ? 'Error de conexión' : err.message);
    throw err;
  }
};

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Head>
          <title>Usuarios - All For Tires</title>
        </Head>

        <Navigation />
        <DynamicBreadcrumbs />

        <div className={styles.content}>
          {message && (
            <p className={message.includes('Error') ? styles.errorMessage : styles.successMessage}>
              {message}
            </p>
          )}

          {(user?.role === 'admin' || user?.role === 'precios') && (
            <button
              className={styles.uploadButton}
              onClick={() => setShowPriceModal(true)}
            >
              <i className="fas fa-file-upload"></i> Actualizar Precios
            </button>
          )}

          <UsersTable
            users={usuarios}
            pagination={pagination}
            onPageChange={handlePageChange}
            onDelete={handleDelete}
            currentUserRole={user?.role}
            loading={loading}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            totalUsers={pagination.total}
            onCloseEditModal={() => setEditingUser(null)}
            onUserUpdate={handleUserUpdate}
          />

          {uploadResult && (
            <div className={`${styles.alert} ${
              uploadResult.error_count > 0 ? styles.alertWarning : styles.alertSuccess
            }`}>
              <h4>Resultados de la carga:</h4>
              <p><strong>Éxitos:</strong> {uploadResult.success_count}</p>
              <p><strong>Errores:</strong> {uploadResult.error_count}</p>
              
              {uploadResult.invalid_skus && uploadResult.invalid_skus.length > 0 && (
                <div className={styles.skuList}>
                  <p><strong>SKUs no encontrados:</strong></p>
                  <div className={styles.skuContainer}>
                    {uploadResult.invalid_skus.map((sku, index) => (
                      <span key={index} className={styles.skuItem}>{sku}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                className={styles.closeAlert}
                onClick={() => setUploadResult(null)}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {showPriceModal && (
          <PriceUploadModal 
            onClose={() => setShowPriceModal(false)}
            onUpload={handleUploadComplete}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
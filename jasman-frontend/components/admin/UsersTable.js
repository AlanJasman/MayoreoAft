import { useState, useEffect } from 'react';
import Image from 'next/image';
import LoadingWheel from '../nav/LoadingWheel';
import EditUserModal from './EditUserModal';
import ChangePasswordModal from './ChangePasswordModal.js'; // Nuevo componente
import styles from '../../styles/admin/AdminTable.module.css';

const UsersTable = ({ 
  users, 
  pagination, 
  onPageChange, 
  onDelete, 
  currentUserRole,
  loading,
  searchTerm,
  onSearch,
  totalUsers,
  onUserUpdate
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const [editingUser, setEditingUser] = useState(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null); // Nuevo estado

  // Sincronizar localSearchTerm cuando searchTerm cambie desde el padre
  useEffect(() => {
    setLocalSearchTerm(searchTerm || '');
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearchTerm.trim());
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    onSearch('');
  };

  const handleEdit = (user) => {
    if (currentUserRole === 'vendedor' && user.rol === 'admin') {
      alert('No tienes permisos para editar administradores');
      return;
    }
    setEditingUser(user);
  };

  const handleChangePassword = (user) => {
    setChangingPasswordUser(user);
  };

  const handlePasswordChangeComplete = (result) => {
    if (result.success) {
      alert(result.message || 'Contraseña cambiada exitosamente');
    } else {
      alert(result.message || 'Error al cambiar contraseña');
    }
    setChangingPasswordUser(null);
  };

  const handleSave = async (updatedUser) => {
    try {
      await onUserUpdate(updatedUser);
      setEditingUser(null);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Administración de Usuarios ({totalUsers})</h2>
        
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          
          {localSearchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.clearSearchButton}
              disabled={loading}
              aria-label="Limpiar búsqueda"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
          
          <button 
            type="submit" 
            className={styles.searchButton}
            disabled={loading}
            aria-label="Buscar"
          >
            <i className="fas fa-search"></i>
          </button>
        </form>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <LoadingWheel />
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Código</th>
                  <th className={styles.th}>Nombre</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Empresa</th>
                  <th className={styles.th}>Rol</th>
                  <th className={styles.th}>Validado</th>
                  <th className={styles.th}>Fecha Creación</th>
                  <th className={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map(usuario => (
                    <tr 
                      key={usuario.id} 
                      className={`${styles.tr} ${!usuario.validado ? styles.trNotValidated : ''}`}
                    >
                      <td className={styles.td}>
                        {usuario.codigo_usuario || '-'}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <span>{usuario.nombre}</span>
                        </div>
                      </td>
                      <td className={styles.td}>{usuario.correo}</td>
                      <td className={styles.td}>{usuario.empresa || '-'}</td>
                      <td className={styles.td}>
                        <span className={`${styles.roleBadge} ${styles[usuario.rol]}`}>
                          {usuario.rol}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {usuario.validado ? (
                          <span className={styles.validated}>Sí</span>
                        ) : (
                          <span className={styles.notValidated}>No</span>
                        )}
                      </td>
                      <td className={styles.td}>{formatDate(usuario.creado_en)}</td>
                      <td className={styles.td}>
                        <div className={styles.buttonGroup}>
                          <button 
                            className={styles.editButton}
                            onClick={() => handleEdit(usuario)}
                          >
                            Editar
                          </button>
                          
                          {/* Botón para cambiar contraseña */}
                          <button 
                            className={styles.passwordButton}
                            onClick={() => handleChangePassword(usuario)}
                          >
                            Cambiar Pass
                          </button>
                          
                          {currentUserRole === 'admin' && (
                            <button
                              className={styles.deleteButton}
                              onClick={() => onDelete(usuario.id)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className={styles.noResults}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.has_prev || loading}
              className={styles.pageButton}
            >
              Anterior
            </button>
            
            <span className={styles.pageInfo}>
              Página {pagination.page} de {pagination.total_pages}
            </span>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_next || loading}
              className={styles.pageButton}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
          currentUserRole={currentUserRole}
        />
      )}

      {changingPasswordUser && (
        <ChangePasswordModal
          user={changingPasswordUser}
          onClose={() => setChangingPasswordUser(null)}
          onComplete={handlePasswordChangeComplete}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
};

export default UsersTable;
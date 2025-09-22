import { useState, useEffect } from 'react';
import Modal from './Modal';
import styles from '../../styles/admin/Modal.module.css';

const EditUserModal = ({ 
  user = {},
  onClose, 
  onSave, 
  currentUserRole 
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    validado: false,
    rol: 'cliente',
    codigo_partner: ''
  });

  const [previousValidado, setPreviousValidado] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setFormData({
        nombre: user.nombre || '',
        empresa: user.empresa || '',
        validado: user.validado || false,
        rol: user.rol || 'cliente',
        codigo_partner: user.codigo_partner || ''
      });
      setPreviousValidado(user.validado || false);
    }
  }, [user]);

  const sendActivationEmail = async (userData) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.correo,
          subject: '¡Tu cuenta ha sido activada!',
          text: `Hola ${userData.nombre},\n\nTu cuenta ha sido activada exitosamente. Ahora puedes acceder a todos los servicios.\n\nSaludos,\nEl equipo de soporte`
        }),
      });
    } catch (error) {
      console.error('Error enviando correo:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave({
        ...user,
        ...formData
      });

      if (!previousValidado && formData.validado) {
        await sendActivationEmail(formData);
      }

      onClose();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  };

  const availableRoles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'partner', label: 'Partner' },
    { value: 'cliente', label: 'Cliente' },
    { value: 'sistemas', label: 'Sistemas' },
    { value: 'precios', label: 'Precios' },
    { value: 'vendedor', label: 'Vendedor' }
  ];

  if (!user?.id) {
    return null;
  }

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Editar Usuario</h2>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.userForm}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nombre" className={styles.formLabel}>Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                className={styles.formInput}
                required
                placeholder="Ingrese el nombre"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <div className={styles.formValue}>{user.correo || '-'}</div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="empresa" className={styles.formLabel}>Empresa</label>
              <input
                id="empresa"
                name="empresa"
                type="text"
                value={formData.empresa}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Nombre de la empresa"
              />
            </div>
            
            {currentUserRole === 'admin' && (
              <div className={styles.formGroup}>
                <label htmlFor="codigo_partner" className={styles.formLabel}>Código Partner</label>
                <input
                  id="codigo_partner"
                  name="codigo_partner"
                  type="text"
                  value={formData.codigo_partner}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Código opcional"
                />
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label htmlFor="rol" className={styles.formLabel}>Rol</label>
              <div className={styles.selectWrapper}>
                <select
                  id="rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className={styles.formSelect}
                  disabled={currentUserRole !== 'admin'}
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}></span>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Estado</label>
              <div className={styles.toggleContainer}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    id="validado"
                    name="validado"
                    checked={formData.validado}
                    onChange={handleChange}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span className={styles.toggleLabel}>
                  {formData.validado ? 'Validado' : 'No validado'}
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.modalFooter}>
            <button 
              type="button" 
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={styles.saveButton}
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditUserModal;
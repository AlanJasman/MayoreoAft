import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Inventory/DeniedTireModal.module.css';

export default function DeniedTireModal({ 
  show, 
  onClose,
  mode, // 'busqueda', 'tabla' o 'manual'
  searchParams, 
  product
}) {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({
    codigo: '',
    piso: '',
    serie: '',
    rin: '',
    modelo: '',
    medidas: '',
    marca: '',
    cantidad: 1,
    tipo: mode
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!show) return;

    const initialData = {
      codigo: '',
      piso: '',
      serie: '',
      rin: '',
      modelo: '',
      medidas: '',
      marca: '',
      cantidad: 1,
      tipo: mode
    };

    if (mode === 'busqueda') {
      initialData.piso = searchParams?.piso || '';
      initialData.serie = searchParams?.serie || '';
      initialData.rin = searchParams?.rin || '';
      initialData.medidas = searchParams?.piso && searchParams?.serie && searchParams?.rin 
        ? `${searchParams.piso}/${searchParams.serie}R${searchParams.rin.replace('R', '')}`
        : '';
    } 
    else if (mode === 'tabla' && product) {
      initialData.codigo = product?.codigo || '';
      initialData.piso = product?.piso || '';
      initialData.serie = product?.serie || '';
      initialData.rin = product?.rin || '';
      initialData.modelo = product?.modelo || '';
      initialData.medidas = product?.medidas || '';
      initialData.marca = product?.marca || '';
    }

    setFormData(initialData);
    setErrors([]);
  }, [show, mode, product, searchParams]);

  const handleChange = (field, value) => {
    const newFormData = {
      ...formData,
      [field]: value
    };

    if (['piso', 'serie', 'rin'].includes(field)) {
      if (newFormData.piso && newFormData.serie && newFormData.rin) {
        newFormData.medidas = `${newFormData.piso}/${newFormData.serie}R${newFormData.rin.replace('R', '')}`;
      } else {
        newFormData.medidas = '';
      }
    }

    setFormData(newFormData);
    
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];
    
    if (formData.cantidad < 1) {
      newErrors.push('La cantidad debe ser al menos 1');
    }

    if (mode === 'manual') {
      if (!formData.piso) newErrors.push('El piso es requerido');
      if (!formData.serie) newErrors.push('La serie es requerida');
      if (!formData.rin) newErrors.push('El rin es requerido');
      if (!formData.marca) newErrors.push('La marca es requerida');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const FASTAPI_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
    const response = await fetch(`${FASTAPI_URL}/deniedtires/`, {  // Nota la barra al final
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        ...formData,
        tipo: mode
      })
    });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || 'Error al registrar la llanta negada');
      }

      onClose(true);
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {mode === 'busqueda' && 'Registrar Llanta No Encontrada'}
          {mode === 'tabla' && 'Registrar Llanta desde Tabla'}
          {mode === 'manual' && 'Registrar Llanta Manualmente'}
        </h2>
        
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.modalLabel}>Código</label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => handleChange('codigo', e.target.value)}
              className={styles.modalInput}
              placeholder="Código del producto"
              readOnly={mode !== 'manual'}
            />
          </div>
          
          {['piso', 'serie', 'rin'].map(field => (
            <div key={field} className={styles.formField}>
              <label className={styles.modalLabel}>
                {field === 'piso' ? 'Piso (Ancho)' : 
                 field === 'serie' ? 'Serie (Perfil)' : 'Rin (Diámetro)'}
              </label>
              <input
                type="text"
                value={formData[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                className={styles.modalInput}
                readOnly={mode !== 'manual'}
                placeholder={
                  field === 'piso' ? 'Ej. 195' : 
                  field === 'serie' ? 'Ej. 65' : 'Ej. 15'
                }
              />
            </div>
          ))}

          <div className={styles.formField}>
            <label className={styles.modalLabel}>Marca</label>
            <input
              type="text"
              value={formData.marca}
              onChange={(e) => handleChange('marca', e.target.value)}
              className={styles.modalInput}
              placeholder="Ej. Michelin, Goodyear, etc."
              readOnly={mode === 'tabla'}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.modalLabel}>Medidas</label>
            <input
              type="text"
              value={formData.medidas}
              className={styles.modalInput}
              readOnly
              placeholder="Se calculará automáticamente"
            />
          </div>
          
          <div className={styles.formField}>
            <label className={styles.modalLabel}>Cantidad*</label>
            <input
              type="number"
              min="1"
              value={formData.cantidad}
              onChange={(e) => handleChange('cantidad', Math.max(1, parseInt(e.target.value) || 1))}
              className={styles.modalInput}
              required
            />
          </div>
        </div>
        
        {errors.length > 0 && (
          <div className={styles.errorMessage}>
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        )}
        
        <div className={styles.modalActions}>
          <button 
            onClick={() => onClose(false)} 
            className={styles.secondaryButton}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
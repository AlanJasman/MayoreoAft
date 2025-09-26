// components/admin/PriceUploadModal.js
import { useState } from 'react';
import styles from '../../styles/admin/PriceUploadModal.module.css';

export default function PriceUploadModal({ onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage(null);
    
    // Mostrar vista previa del archivo
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({
          name: selectedFile.name,
          size: (selectedFile.size / 1024).toFixed(2) + ' KB',
          type: selectedFile.type
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const validateFileStructure = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target.result;
        
        // Simple validación - podrías implementar una más robusta
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const hasSku = headers.includes('sku');
        const hasPrice = headers.includes('price');
        
        resolve(hasSku && hasPrice);
      };
      
      reader.readAsText(file);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setMessage('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);
    try {
      // Validar estructura del archivo
      const isValid = await validateFileStructure(file);
      if (!isValid) {
        throw new Error('El archivo debe contener al menos las columnas "sku" y "price"');
      }

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('jasman_auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/prices/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-App-Version': 'aft'
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al subir archivo');

      onUpload(data);
      setMessage('Archivo procesado correctamente');
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Actualizar Precios</h3>
        
        <div className={styles.instructions}>
          <h4>Instrucciones para el archivo:</h4>
          <ul>
            <li>El archivo debe ser CSV o Excel</li>
            <li>Debe contener al menos las columnas: <strong>sku</strong> y <strong>price</strong></li>
            <li>Ejemplo de estructura:</li>
          </ul>
          
          <div className={styles.exampleTable}>
            <table>
              <thead>
                <tr>
                  <th>sku</th>
                  <th>price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>03589240000</td>
                  <td>1000.99</td>
                </tr>
                <tr>
                  <td>1015812</td>
                  <td>2000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {message && (
          <p className={message.includes('Error') ? styles.errorMessage : styles.successMessage}>
            {message}
          </p>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Seleccionar archivo:</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          
          {filePreview && (
            <div className={styles.filePreview}>
              <p><strong>Archivo seleccionado:</strong> {filePreview.name}</p>
              <p><strong>Tamaño:</strong> {filePreview.size}</p>
              <p><strong>Tipo:</strong> {filePreview.type}</p>
            </div>
          )}
        </div>

        <div className={styles.modalButtons}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className={styles.saveButton}
            onClick={handleSubmit}
            disabled={loading || !file}
          >
            {loading ? 'Procesando...' : 'Subir Archivo'}
          </button>
        </div>
      </div>
    </div>
  );
}
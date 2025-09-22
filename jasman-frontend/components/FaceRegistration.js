import { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FaArrowRight, FaArrowAltCircleRight } from 'react-icons/fa';
import styles from '../styles/Register/FaceRegistration.module.css';

export default function FaceRegistration({ userId, onComplete }) {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
    setIsCaptured(true);
  };

  const retake = () => {
    setImgSrc(null);
    setIsCaptured(false);
    setError('');
  };

  const submitFace = async () => {
    if (!imgSrc) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const base64Data = imgSrc.split(',')[1];
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          image_data: base64Data
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 409) {
          setError(errorData.detail); 
        } else {
          setError(errorData.detail || 'Error al registrar el rostro');
        }
        
        retake();
        return;
      }
      
      onComplete();
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor');
      retake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipFacialRegistration = () => {
    onComplete(); // Llama a la misma función de finalización que submitFace
  };
  
  const videoConstraints = {
    width: 640,
    height: 640,
    facingMode: "user"
  };

  return (
    <div className={styles.faceRegistration}>
      <p className={styles.instructions}>
        Por favor, mire directamente a la cámara y asegúrese de que su rostro esté bien iluminado.
        <br />
        <strong>Opcional:</strong> Puede omitir este paso y completarlo más tarde.
      </p>
      
      <div className={styles.cameraContainer}>
        {!isCaptured ? (
          <div className={styles.cameraWrapper}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className={styles.camera}
            />
            <button 
              onClick={capture}
              className={styles.captureButton}
            >
              Capturar Rostro
            </button>
          </div>
        ) : (
          <div className={styles.previewWrapper}>
            <img 
              src={imgSrc} 
              alt="Captura de rostro" 
              className={styles.previewImage}
            />
            <div className={styles.previewButtons}>
              <button 
                onClick={retake}
                className={styles.retakeButton}
              >
                Volver a Tomar
              </button>
              <button 
                onClick={submitFace}
                disabled={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botón para saltar el registro facial */}
      <div className={styles.skipContainer}>
        <button
          onClick={skipFacialRegistration}
          className={styles.skipButton}
          style={{ '--clr': '#e74c3c' }}
        >
          <span className={styles.buttonIconWrapper}>
            <FaArrowRight className={styles.buttonIconSvg} />
            <FaArrowRight className={`${styles.buttonIconSvg} ${styles.buttonIconSvgCopy}`} />
          </span>
          Omitir y Continuar
        </button>
      </div>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
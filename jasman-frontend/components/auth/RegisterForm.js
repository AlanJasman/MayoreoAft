import { useState } from 'react';
import { register } from '../../lib/auth';
import styles from '../../styles/Register/RegisterForm.module.css';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function RegisterForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    codigo_usuario: '',  // Nuevo campo agregado
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const checkPasswordStrength = (password) => {
    if (!password) return '';
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;

    if (length < 6) return 'weak';
    if (length >= 8 && hasLetters && hasNumbers && hasSpecialChars) return 'strong';
    if ((hasLetters && hasNumbers) || (hasLetters && hasSpecialChars) || (hasNumbers && hasSpecialChars)) return 'medium';
    
    return 'weak';
  };

  const validateForm = () => {
    const newErrors = {};
    const strength = checkPasswordStrength(formData.password);
    
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }
    
    if (!formData.name) {
      newErrors.name = 'El nombre completo es requerido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (strength === 'weak') {
      newErrors.password = 'La contraseña es muy débil';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, password: value }));
    setPasswordStrength(checkPasswordStrength(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // Construimos el payload, solo mandamos codigo_usuario si tiene valor
      const payload = {
        correo: formData.email,
        nombre: formData.name,
        contraseña: formData.password,
        rol: 'cliente', // O ajusta según tu lógica
      };

      if (formData.codigo_usuario.trim() !== '') {
        payload.codigo_usuario = formData.codigo_usuario.trim();
      }

      const result = await register(payload);
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ form: result.message || "Error durante el registro" });
      }
    } catch (error) {
      console.error("Error en handleSubmit:", error);
      setErrors({ form: "Error de conexión con el servidor" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <form onSubmit={handleSubmit} className={styles.registerForm}>
      <h2 className={styles.title}>Crear cuenta</h2>
      {errors.form && <div className={styles.errorMessage}>{errors.form}</div>}

      {/* Correo */}
      <div className={styles.inputGroup}>
        <label htmlFor="email" className={styles.inputLabel}>Correo electrónico</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="tucorreo@ejemplo.com"
          value={formData.email}
          onChange={handleChange}
          className={`${styles.inputField} ${errors.email ? styles.error : ''}`}
          disabled={isSubmitting}
          required
        />
        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
      </div>

      {/* Nombre */}
      <div className={styles.inputGroup}>
        <label htmlFor="name" className={styles.inputLabel}>Nombre completo</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Tu nombre completo"
          value={formData.name}
          onChange={handleChange}
          className={`${styles.inputField} ${errors.name ? styles.error : ''}`}
          disabled={isSubmitting}
          required
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      {/* Contraseña */}
      <div className={styles.inputGroup}>
        <label htmlFor="password" className={styles.inputLabel}>Contraseña</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handlePasswordChange}
            className={`${styles.inputField} ${errors.password ? styles.error : ''}`}
            disabled={isSubmitting}
            required
          />
        </div>
        {formData.password && (
          <div className={`${styles.passwordStrength} ${styles[passwordStrength]}`}>
            Seguridad: {passwordStrength === 'weak' ? 'Débil' : passwordStrength === 'medium' ? 'Media' : 'Fuerte'}
          </div>
        )}
        {errors.password && <span className={styles.errorText}>{errors.password}</span>}
      </div>

      {/* Confirmar contraseña */}
      <div className={styles.inputGroup}>
        <label htmlFor="confirmPassword" className={styles.inputLabel}>Confirmar contraseña</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`${styles.inputField} ${errors.confirmPassword ? styles.error : ''}`}
            disabled={isSubmitting}
            required
          />
        </div>
        {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
      </div>

      {/* NUEVO: Código Usuario */}
      <div className={styles.inputGroup}>
      <label htmlFor="codigo_usuario" className={`${styles.inputLabel} ${styles.optionalLabel}`}>
        Código Usuario
      </label>
        <input
          type="text"
          id="codigo_usuario"
          name="codigo_usuario"
          placeholder="Ejemplo: R-450000"
          value={formData.codigo_usuario}
          onChange={handleChange}
          className={styles.inputField}
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? (
          <span className={styles.spinner}></span>
        ) : 'Registrarse'}
      </button>

      <Link href="/login" className={styles.backLink}>
        ¿Ya tienes una cuenta? Inicia sesión
      </Link>
    </form>
  );
}

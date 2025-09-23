import { useState } from 'react';
import { useRouter } from 'next/router';
import { login as apiLogin } from '../../lib/auth';
import styles from '../../styles/Login/LoginForm.module.css';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'email' && value && !validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Correo electrónico inválido' }));
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'El correo electrónico es requerido';
    else if (!validateEmail(formData.email)) newErrors.email = 'Correo electrónico inválido';
    
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      const result = await apiLogin(formData.email, formData.password);

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Credenciales inválidas');
      }

      const token = result.data.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('No se pudo obtener la información del usuario');

      const userData = await res.json();
      login(token, userData);

      // Redirección basada en el estado de validación
      if (userData.validado) {
        router.replace('dashboard/existencias');
      } else {
        router.replace('/settings_user');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrors({ general: err.message || 'Error al iniciar sesión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.panelContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
        <h2 className={styles.formTitle}>Inicia sesión</h2>
        <p className={styles.formSubtitle}>Ingresa tus credenciales para acceder a tu cuenta</p>
        
        {errors.general && <div className={styles.errorMessage}>{errors.general}</div>}

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
            required
          />
          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.inputLabel}>Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            className={`${styles.inputField} ${errors.password ? styles.error : ''}`}
            required
          />
          {errors.password && <span className={styles.errorText}>{errors.password}</span>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={styles.loginButton}
        >
          {isLoading ? (
            <span className={styles.spinner}></span>
          ) : 'Iniciar sesión'}
        </button>

        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>o</span>
          <span className={styles.dividerLine}></span>
        </div>

        <div className={styles.linksContainer}>
          <Link href="/register" className={styles.linkButton}>
            Crear una cuenta
          </Link>
          
        </div>
      </form>
    </div>
  );
}